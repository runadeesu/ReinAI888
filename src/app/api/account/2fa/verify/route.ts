import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { verifyTotpToken } from "@/lib/auth/totp";
import { decrypt } from "@/lib/crypto/encryption";

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const code = body?.code as string | undefined;
  if (!code) return NextResponse.json({ error: "コードを入力してください" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorSecret) {
    return NextResponse.json({ error: "先に2段階認証を設定してください" }, { status: 400 });
  }

  const secret = decrypt(JSON.parse(user.twoFactorSecret));
  if (!verifyTotpToken(code, secret)) {
    return NextResponse.json({ error: "コードが正しくありません" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });

  return NextResponse.json({ ok: true });
}
