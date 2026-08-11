import crypto from "crypto";

// Only ever imported from Route Handlers (Node.js runtime) — never from
// middleware, which may run on the Edge runtime where Node's crypto module
// isn't available.
export function verifyPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_DASHBOARD_PASSWORD;
  if (!expected) throw new Error("ADMIN_DASHBOARD_PASSWORD is not configured");
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
