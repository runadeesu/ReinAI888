import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/password";
import { createSessionCookieValue, COOKIE_NAME } from "@/lib/session";
import { rateLimit, getClientIp } from "@/lib/rate-limit/limiter";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limited = rateLimit(`admin-login:${ip}`, 10, 15 * 60 * 1000);
  if (!limited.success) {
    return NextResponse.json({ error: "試行回数が多すぎます。しばらく待ってから再試行してください。" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!password || !verifyPassword(password)) {
    return NextResponse.json({ error: "パスワードが正しくありません" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, await createSessionCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  return response;
}
