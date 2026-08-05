import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

export function generateTotpSecret(): string {
  return generateSecret();
}

export function verifyTotpToken(token: string, secret: string): boolean {
  try {
    return verifySync({ secret, token, epochTolerance: 30 }).valid;
  } catch {
    return false;
  }
}

export async function generateTotpQrCode(email: string, secret: string): Promise<string> {
  const otpauth = generateURI({ issuer: "ReinAI", label: email, secret });
  return QRCode.toDataURL(otpauth);
}
