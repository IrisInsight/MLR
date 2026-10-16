import "server-only";
import type { LanguageModel } from "ai";

/**
 * Model selection:
 *  - ANTHROPIC_API_KEY set  → call Anthropic directly with Claude Sonnet 5.5.
 *  - otherwise              → Vercel AI Gateway (OIDC on Vercel, or AI_GATEWAY_API_KEY),
 *                             model id confirmed from https://ai-gateway.vercel.sh/v1/models
 *  - AI_MODEL overrides the gateway model id (e.g. to a model the team's gateway tier allows).
 *
 * Note: the AI Gateway free tier does not serve Claude Sonnet 5.5 ("Free tier users do not have
 * access to this model") — add gateway credits or set ANTHROPIC_API_KEY. Until then the chat
 * shows its tap-to-call / call-back fallback and the reason is logged server-side.
 */
export const ANTHROPIC_MODEL_ID = process.env.AI_MODEL?.replace(/^anthropic\//, "").replace(/(\d)\.(\d)/, "$1-$2") ?? "claude-sonnet-5-5";
export const GATEWAY_MODEL_ID = process.env.AI_MODEL ?? "anthropic/claude-sonnet-5.5";

export async function getModel(): Promise<{ model: LanguageModel; provider: "anthropic" | "gateway"; id: string }> {
  if (process.env.ANTHROPIC_API_KEY) {
    const { anthropic } = await import("@ai-sdk/anthropic");
    return { model: anthropic(ANTHROPIC_MODEL_ID), provider: "anthropic", id: ANTHROPIC_MODEL_ID };
  }
  const { gateway } = await import("@ai-sdk/gateway");
  return { model: gateway(GATEWAY_MODEL_ID), provider: "gateway", id: GATEWAY_MODEL_ID };
}
