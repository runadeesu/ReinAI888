import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const version = await prisma.instructionVersion.findUnique({ where: { id } });
  if (!version || version.userId !== userId) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { customInstructions: true } });
  if (user?.customInstructions) {
    await prisma.instructionVersion.create({ data: { userId, content: user.customInstructions } });
  }

  await prisma.user.update({ where: { id: userId }, data: { customInstructions: version.content } });
  return NextResponse.json({ ok: true, customInstructions: version.content });
}
