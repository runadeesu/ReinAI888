import crypto from "crypto";

/** Generates a stable, user-facing account id like "reinai-8f3ka2c1". */
export function generateDisplayId(): string {
  return `reinai-${crypto.randomBytes(6).toString("hex")}`;
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
