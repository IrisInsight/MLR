import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Only the SHA-256 hash of the admin password is committed. Override with the
 * ADMIN_PASSWORD_SHA256 environment variable. The password itself was generated
 * once and handed to the site owner out of band.
 */
export const ADMIN_PASSWORD_SHA256 = process.env.ADMIN_PASSWORD_SHA256 ?? "9ed62e69fffc28b2407580c1a6fc0bcbdfa0cf4bcbadd10843dcf27b160509e5";
export const ADMIN_COOKIE = "mlr_admin";

export function sha256(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

export function verifyAdminPassword(password: string): boolean {
  const a = Buffer.from(sha256(password), "hex");
  const b = Buffer.from(ADMIN_PASSWORD_SHA256, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Session token derived from the password hash; rotating the password invalidates sessions. */
export function adminSessionToken(): string {
  return createHmac("sha256", ADMIN_PASSWORD_SHA256).update("mlr-admin-session-v1").digest("hex");
}

export function isValidAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(adminSessionToken(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
