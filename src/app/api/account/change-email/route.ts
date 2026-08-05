import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { changeEmailSchema } from "@/lib/validation/schemas";
import { generateToken } from "@/lib/utils/ids";
import { sendEmail, emailChangeEmailHtml } from "@/lib/email/mailer";

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = changeEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力が正しくありません" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "この操作を実行できません" }, { status: 400 });
  }

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "パスワードが正しくありません" }, { status: 400 });
  }

  const newEmail = parsed.data.newEmail.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing) {
    return NextResponse.json({ error: "このメールアドレスは既に使用されています" }, { status: 409 });
  }

  const token = generateToken();
  await prisma.emailChangeToken.create({
    data: { token, userId, newEmail, expires: new Date(Date.now() + 60 * 60 * 1000) },
  });

  const confirmUrl = `${process.env.NEXTAUTH_URL}/api/account/change-email/confirm?token=${token}`;
  await sendEmail({
    to: newEmail,
    subject: "ReinAI - メールアドレス変更の確認",
    html: emailChangeEmailHtml(confirmUrl, newEmail),
  });

  return NextResponse.json({ ok: true });
}
