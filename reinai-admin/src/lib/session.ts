// Web Crypto API only (globalThis.crypto.subtle) — this file is imported
// from middleware, which Next.js can run on the Edge runtime where Node's
// `crypto` module isn't available. Password verification lives in a
// separate file (./password.ts) that middleware never imports, since that
// one does need Node's crypto and only ever runs inside a Route Handler.

const COOKIE_NAME = "reinai_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function getSecret(): string {
  const secret = process.env.ADMIN_DASHBOARD_SECRET;
  if (!secret) throw new Error("ADMIN_DASHBOARD_SECRET is not configured");
  return secret;
}

async function importKey(): Promise<CryptoKey> {
  const keyData = new TextEncoder().encode(getSecret());
  return crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(value: string): Promise<string> {
  const key = await importKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toHex(signature);
}

export async function createSessionCookieValue(): Promise<string> {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS })).toString("base64url");
  return `${payload}.${await sign(payload)}`;
}

export async function verifySessionCookieValue(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) return false;

  const expected = await sign(payload);
  if (signature.length !== expected.length || signature !== expected) return false;

  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof exp === "number" && Date.now() < exp;
  } catch {
    return false;
  }
}

export { COOKIE_NAME };
