import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit/limiter";

// Auth checks happen in the (app) route group's layout (Node runtime, needs
// Prisma). Middleware stays edge-safe and only attaches security headers
// plus a coarse global rate limit; sensitive routes add their own tighter
// limits (see /api/register, /api/chat, etc).
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const ip = getClientIp(request);
    const limited = rateLimit(`global:${ip}`, 120, 60 * 1000);
    if (!limited.success) {
      return NextResponse.json({ error: "リクエストが多すぎます" }, { status: 429 });
    }
  }

  const response = NextResponse.next();

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  // 'unsafe-inline' is required for the no-flash theme-init script in the
  // root layout <head> (no nonce plumbing yet); everything else is locked
  // to same-origin, which still blocks injected <script src> / <object>
  // exfiltration — the main payload classes XSS relies on.
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join("; ")
  );

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
