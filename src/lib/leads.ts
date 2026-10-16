import "server-only";
import { randomUUID } from "node:crypto";

export interface LeadItem {
  sku: string;
  name: string;
  qty: number;
  note?: string;
}

export interface Lead {
  id: string;
  createdAt: string;
  source: "chat" | "quote" | "contact" | "callback";
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  items?: LeadItem[];
  timeline?: string;
  notes?: string;
  preferredTime?: string;
  transcript?: { role: string; text: string }[];
  page?: string;
}

export interface QuestionLog {
  id: string;
  createdAt: string;
  question: string;
  page?: string;
}

export type StorageMode = "blob" | "demo";

export function storageMode(): StorageMode {
  return process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "demo";
}

// Demo-mode stores (per server instance; lost on cold start — by design).
const demoLeads: Lead[] = [];
const demoQuestions: QuestionLog[] = [];

/** Strip emails, phone numbers and long digit runs before storing a question. */
export function anonymize(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, "[phone]")
    .replace(/\b\d{6,}\b/g, "[number]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

export async function saveLead(input: Omit<Lead, "id" | "createdAt">): Promise<Lead> {
  const lead: Lead = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  if (storageMode() === "blob") {
    const { put } = await import("@vercel/blob");
    await put(`leads/${lead.createdAt.replace(/[:.]/g, "-")}-${lead.id}.json`, JSON.stringify(lead, null, 2), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
    });
  } else {
    demoLeads.unshift(lead);
    console.log("[lead:demo-mode] not persisted —", JSON.stringify({ id: lead.id, source: lead.source, name: lead.name, phone: lead.phone ? "[set]" : undefined, items: lead.items?.length ?? 0 }));
  }
  return lead;
}

export async function listLeads(limit = 200): Promise<Lead[]> {
  if (storageMode() !== "blob") return demoLeads.slice(0, limit);
  const { list, get } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: "leads/", limit });
  const out: Lead[] = [];
  for (const b of blobs.sort((a, c) => c.pathname.localeCompare(a.pathname))) {
    try {
      const res = await get(b.pathname, { access: "private" });
      if (!res) continue;
      const text = await new Response(res.stream).text();
      out.push(JSON.parse(text));
    } catch (err) {
      console.error("lead read failed", b.pathname, err);
    }
  }
  return out;
}

export async function logQuestion(question: string, page?: string): Promise<void> {
  const q: QuestionLog = { id: randomUUID(), createdAt: new Date().toISOString(), question: anonymize(question), page };
  if (!q.question) return;
  if (storageMode() === "blob") {
    const { put } = await import("@vercel/blob");
    await put(`questions/${q.createdAt.replace(/[:.]/g, "-")}-${q.id}.json`, JSON.stringify(q), { access: "private", contentType: "application/json", addRandomSuffix: false }).catch((err) => console.error("question log failed", err));
  } else {
    demoQuestions.unshift(q);
    if (demoQuestions.length > 500) demoQuestions.length = 500;
  }
}

export async function listQuestions(limit = 500): Promise<QuestionLog[]> {
  if (storageMode() !== "blob") return demoQuestions.slice(0, limit);
  const { list, get } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: "questions/", limit });
  const out: QuestionLog[] = [];
  for (const b of blobs) {
    try {
      const res = await get(b.pathname, { access: "private" });
      if (!res) continue;
      out.push(JSON.parse(await new Response(res.stream).text()));
    } catch {
      /* skip */
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Group similar questions (lowercased, punctuation stripped) and count them. */
export function topQuestions(questions: QuestionLog[], limit = 25): { question: string; count: number; last: string }[] {
  const groups = new Map<string, { question: string; count: number; last: string }>();
  for (const q of questions) {
    const key = q.question.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
    if (!key) continue;
    const g = groups.get(key);
    if (g) {
      g.count += 1;
      if (q.createdAt > g.last) g.last = q.createdAt;
    } else groups.set(key, { question: q.question, count: 1, last: q.createdAt });
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last)).slice(0, limit);
}
