import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { generateTotpSecret, generateTotpQrCode } from "@/lib/auth/totp";
import { encrypt } from "@/lib/crypto/encryption";

// Generates a new TOTP secret, stores it encrypted (but not yet enabled)
// and returns a QR code for the user to scan. 2FA is only flipped on once
// the user proves possession via /2fa/verify.
export async function POST() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });

  const secret = generateTotpSecret();
  const encrypted = encrypt(secret);

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: JSON.stringify(encrypted), twoFactorEnabled: false },
  });

  const qrCode = await generateTotpQrCode(user.email, secret);

  return NextResponse.json({ qrCode, secret });
}
