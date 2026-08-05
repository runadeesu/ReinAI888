import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = body?.token as string | undefined;
  const email = body?.email as string | undefined;

  if (!token || !email) {
    return NextResponse.json({ error: "無効なリンクです" }, { status: 400 });
  }

  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: email.toLowerCase(), token } },
  });

  if (!record || record.expires < new Date()) {
    return NextResponse.json({ error: "リンクの有効期限が切れています" }, { status: 400 });
  }

  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { emailVerified: new Date() },
  });

  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: email.toLowerCase(), token } },
  });

  return NextResponse.json({ ok: true });
}
