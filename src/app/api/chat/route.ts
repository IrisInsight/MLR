import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { getModel } from "@/lib/ai/model";
import { dynamicSystemPrompt, staticSystemPrompt, type ChatContext } from "@/lib/ai/prompt";
import { makeTools } from "@/lib/ai/tools";
import { checkRateLimit, clientIp, LIMITS } from "@/lib/ai/ratelimit";
import { logQuestion } from "@/lib/leads";

export const maxDuration = 60;

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

function textOf(m: UIMessage): string {
  return m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.ok) return json(429, { error: "rate_limited", message: "Too many requests. Please wait a bit or call (714) 738-0031." }, { "retry-after": String(rl.retryAfterSec) });

  let body: { messages?: UIMessage[]; context?: ChatContext };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "bad_json" });
  }
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) return json(400, { error: "no_messages" });

  // --- abuse limits: turns, input length, transcript size ---
  const userTurns = messages.filter((m) => m.role === "user");
  if (userTurns.length > LIMITS.maxUserTurns) return json(413, { error: "too_many_turns", message: "This conversation is getting long — start a new chat or give us a call." });
  const last = messages[messages.length - 1];
  if (last.role !== "user") return json(400, { error: "last_message_not_user" });
  const lastText = textOf(last);
  if (lastText.length > LIMITS.maxInputChars) return json(413, { error: "input_too_long", message: `Please keep messages under ${LIMITS.maxInputChars} characters.` });
  const transcriptChars = messages.reduce((n, m) => n + textOf(m).length, 0);
  if (transcriptChars > LIMITS.maxTranscriptChars) return json(413, { error: "transcript_too_long", message: "This conversation is too long — please start a new chat." });

  const context: ChatContext = body.context ?? {};
  if (userTurns.length === 1) void logQuestion(lastText, context.page);

  let model: Awaited<ReturnType<typeof getModel>>;
  try {
    model = await getModel();
  } catch (err) {
    console.error("[ask-mlr] model unavailable:", err);
    return json(503, { error: "model_unavailable" });
  }

  const tools = makeTools({
    page: context.page,
    transcript: () => messages.map((m) => ({ role: m.role, text: textOf(m) })).filter((m) => m.text),
  });

  const modelMessages = await convertToModelMessages(messages, { tools, ignoreIncompleteToolCalls: true });

  const result = streamText({
    model: model.model,
    instructions: [
      {
        role: "system",
        content: staticSystemPrompt(),
        // Anthropic prompt caching: the static block is byte-identical on every request,
        // so it is served from cache; the small dynamic block below changes per request.
        providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
      },
      { role: "system", content: dynamicSystemPrompt(context) },
    ],
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(8),
    maxOutputTokens: 1400,
    temperature: 0.3,
    onError: ({ error }) => {
      console.error(`[ask-mlr] ${model.provider}/${model.id} error:`, error instanceof Error ? `${error.name}: ${error.message}` : error);
    },
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      // Surfaced to the client as a stream error part; the UI shows the call/callback fallback.
      const msg = error instanceof Error ? error.message : String(error);
      return `model_error: ${msg.slice(0, 200)}`;
    },
    headers: { "cache-control": "no-store" },
  });
}
