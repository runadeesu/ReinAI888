import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/validation/schemas";
import { generateDisplayId, generateToken } from "@/lib/utils/ids";
import { sendEmail, verificationEmailHtml } from "@/lib/email/mailer";
import { rateLimit, getClientIp } from "@/lib/rate-limit/limiter";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limited = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
  if (!limited.success) {
    return NextResponse.json({ error: "登録試行が多すぎます。しばらくしてから再試行してください。" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力が正しくありません" }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "このメールアドレスは既に登録されています" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  let displayId = generateDisplayId();
  while (await prisma.user.findUnique({ where: { displayId } })) {
    displayId = generateDisplayId();
  }

  const user = await prisma.user.create({
    data: { name, email: normalizedEmail, passwordHash, displayId },
  });

  const token = generateToken();
  await prisma.verificationToken.create({
    data: {
      identifier: user.email,
      token,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const verifyUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`;
  await sendEmail({
    to: user.email,
    subject: "ReinAI - メールアドレスの確認",
    html: verificationEmailHtml(verifyUrl),
  });

  return NextResponse.json({ ok: true });
}
