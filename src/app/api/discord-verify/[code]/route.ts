import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const record = await prisma.discordVerificationCode.findUnique({ where: { code } });
  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "リンクの有効期限が切れています" }, { status: 404 });
  }
  return NextResponse.json({ discordUsername: record.discordUsername });
}

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { code } = await params;
  const record = await prisma.discordVerificationCode.findUnique({ where: { code } });
  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "リンクの有効期限が切れています" }, { status: 404 });
  }

  // A ReinAI account and a Discord account are both 1:1 — replace whatever
  // either side was previously linked to rather than erroring, since the
  // member intentionally re-ran /verify.
  await prisma.$transaction([
    prisma.discordLink.deleteMany({ where: { OR: [{ userId }, { discordId: record.discordId }] } }),
    prisma.discordLink.create({
      data: { userId, discordId: record.discordId, discordUsername: record.discordUsername },
    }),
    prisma.discordVerificationCode.delete({ where: { code } }),
  ]);

  return NextResponse.json({ ok: true, discordUsername: record.discordUsername });
}
