import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";

// Applying a persona copies its instructions into User.customInstructions —
// there's no live "active persona" pointer, so the hot chat-send path stays
// a single flat read. Also logs the prior value to InstructionVersion so it
// can be restored from Settings.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const persona = await prisma.persona.findUnique({ where: { id } });
  if (!persona || persona.userId !== userId) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { customInstructions: true } });
  if (user?.customInstructions) {
    await prisma.instructionVersion.create({ data: { userId, content: user.customInstructions } });
  }

  await prisma.user.update({ where: { id: userId }, data: { customInstructions: persona.instructions } });
  return NextResponse.json({ ok: true, customInstructions: persona.instructions });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const persona = await prisma.persona.findUnique({ where: { id } });
  if (!persona || persona.userId !== userId) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }

  await prisma.persona.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
