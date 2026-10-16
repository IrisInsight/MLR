import "server-only";
import type { LanguageModel } from "ai";

/**
 * Model selection:
 *  - ANTHROPIC_API_KEY set  → call Anthropic directly with Claude Sonnet 5.5.
 *  - otherwise              → Vercel AI Gateway (OIDC on Vercel, or AI_GATEWAY_API_KEY),
 *                             model id confirmed from https://ai-gateway.vercel.sh/v1/models
 */
export const ANTHROPIC_MODEL_ID = "claude-sonnet-5-5";
export const GATEWAY_MODEL_ID = "anthropic/claude-sonnet-5.5";

export async function getModel(): Promise<{ model: LanguageModel; provider: "anthropic" | "gateway"; id: string }> {
  if (process.env.ANTHROPIC_API_KEY) {
    const { anthropic } = await import("@ai-sdk/anthropic");
    return { model: anthropic(ANTHROPIC_MODEL_ID), provider: "anthropic", id: ANTHROPIC_MODEL_ID };
  }
  const { gateway } = await import("@ai-sdk/gateway");
  return { model: gateway(GATEWAY_MODEL_ID), provider: "gateway", id: GATEWAY_MODEL_ID };
}
