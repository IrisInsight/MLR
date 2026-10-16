import { ADMIN_COOKIE, adminSessionToken, verifyAdminPassword } from "@/lib/admin-auth";
import { checkRateLimit, clientIp } from "@/lib/ai/ratelimit";

export async function POST(req: Request) {
  const rl = checkRateLimit(`admin:${clientIp(req)}`);
  if (!rl.ok) return Response.json({ ok: false }, { status: 429 });
  let password = "";
  try {
    password = String((await req.json()).password ?? "");
  } catch {
    /* fallthrough */
  }
  if (!password || !verifyAdminPassword(password)) {
    await new Promise((r) => setTimeout(r, 400));
    return Response.json({ ok: false }, { status: 401 });
  }
  const secure = process.env.NODE_ENV === "production";
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": `${ADMIN_COOKIE}=${adminSessionToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 12}${secure ? "; Secure" : ""}`,
    },
  });
}
