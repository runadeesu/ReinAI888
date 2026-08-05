import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const appUrl = process.env.NEXTAUTH_URL ?? url.origin;

  if (!token) {
    return NextResponse.redirect(`${appUrl}/settings/account?emailChange=invalid`);
  }

  const record = await prisma.emailChangeToken.findUnique({ where: { token } });
  if (!record || record.usedAt || record.expires < new Date()) {
    return NextResponse.redirect(`${appUrl}/settings/account?emailChange=expired`);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { email: record.newEmail, emailVerified: new Date() },
    }),
    prisma.emailChangeToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return NextResponse.redirect(`${appUrl}/settings/account?emailChange=success`);
}
