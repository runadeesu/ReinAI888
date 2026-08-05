import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { forgotPasswordSchema } from "@/lib/validation/schemas";
import { generateToken } from "@/lib/utils/ids";
import { sendEmail, passwordResetEmailHtml } from "@/lib/email/mailer";
import { rateLimit, getClientIp } from "@/lib/rate-limit/limiter";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limited = rateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000);
  if (!limited.success) {
    return NextResponse.json({ error: "試行が多すぎます。しばらくしてから再試行してください。" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "有効なメールアドレスを入力してください" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });

  // Always return ok to avoid leaking which emails are registered.
  if (!user || !user.passwordHash) {
    return NextResponse.json({ ok: true });
  }

  const token = generateToken();
  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expires: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "ReinAI - パスワードの再設定",
    html: passwordResetEmailHtml(resetUrl),
  });

  return NextResponse.json({ ok: true });
}
