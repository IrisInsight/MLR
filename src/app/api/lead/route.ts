import { z } from "zod";
import { saveLead, storageMode } from "@/lib/leads";
import { checkRateLimit, clientIp } from "@/lib/ai/ratelimit";

const LeadSchema = z.object({
  source: z.enum(["chat", "quote", "contact", "callback"]).default("contact"),
  name: z.string().trim().min(1).max(120),
  company: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().max(120).optional(),
  preferredTime: z.string().trim().max(120).optional(),
  timeline: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
  page: z.string().max(300).optional(),
  items: z.array(z.object({ sku: z.string().max(60), name: z.string().max(200), qty: z.number().int().min(1).max(100000), note: z.string().max(200).optional() })).max(200).optional(),
  transcript: z.array(z.object({ role: z.string().max(20), text: z.string().max(4000) })).max(80).optional(),
  // honeypot: bots fill it, humans never see it
  website: z.string().max(0).optional(),
});

export async function POST(req: Request) {
  const rl = checkRateLimit(`lead:${clientIp(req)}`);
  if (!rl.ok) return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return Response.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  const parsed = LeadSchema.safeParse(data);
  if (!parsed.success) return Response.json({ ok: false, error: "invalid", issues: parsed.error.issues.map((i) => i.message) }, { status: 400 });
  const { website, ...lead } = parsed.data;
  void website;
  if (!lead.phone && !lead.email) return Response.json({ ok: false, error: "contact_required", message: "Please include a phone number or email so we can reach you." }, { status: 400 });
  const saved = await saveLead(lead);
  return Response.json({ ok: true, id: saved.id, mode: storageMode() });
}
