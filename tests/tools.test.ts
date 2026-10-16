import { describe, expect, it } from "vitest";
import { anonymize, topQuestions } from "../src/lib/leads";
import { checkRateLimit, LIMITS } from "../src/lib/ai/ratelimit";
import { looksConversational } from "../src/lib/site";

describe("abuse protection", () => {
  it("rate limits per ip", () => {
    const ip = "203.0.113.9";
    for (let i = 0; i < LIMITS.perIp.max; i++) expect(checkRateLimit(ip, 1_000_000 + i).ok).toBe(true);
    const blocked = checkRateLimit(ip, 1_000_000 + LIMITS.perIp.max);
    expect(blocked.ok).toBe(false);
    // window slides
    expect(checkRateLimit(ip, 1_000_000 + LIMITS.perIp.windowMs + 1000).ok).toBe(true);
  });
});

describe("question anonymization", () => {
  it("strips contact details", () => {
    expect(anonymize("call me at (714) 555-0199 or bob@example.com, account 1234567")).toBe("call me at [phone] or [email], account [number]");
  });
  it("groups repeated questions", () => {
    const top = topQuestions([
      { id: "1", createdAt: "2026-01-01T00:00:00Z", question: "Do you have white gloves?" },
      { id: "2", createdAt: "2026-01-02T00:00:00Z", question: "do you have white gloves" },
      { id: "3", createdAt: "2026-01-03T00:00:00Z", question: "Tape for boxes" },
    ]);
    expect(top[0].count).toBe(2);
    expect(top[0].question).toMatch(/white gloves/i);
  });
});

describe("search bar routing", () => {
  it("routes plain-language requests to the assistant and keywords to search", () => {
    expect(looksConversational("I need to wrap 20 pallets a day")).toBe(true);
    expect(looksConversational("do you have white gloves?")).toBe(true);
    expect(looksConversational("nitrile gloves")).toBe(false);
    expect(looksConversational("35HC220")).toBe(false);
  });
});
