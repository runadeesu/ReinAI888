import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const password = body?.password as string | undefined;
  if (!password) return NextResponse.json({ error: "パスワードを入力してください" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "パスワードが正しくありません" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });

  return NextResponse.json({ ok: true });
}
