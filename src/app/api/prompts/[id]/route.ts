import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { promptSchema } from "@/lib/validation/schemas";
import { z } from "zod";

const patchSchema = promptSchema.partial().extend({ isFavorite: z.boolean().optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.prompt.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "入力が正しくありません" }, { status: 400 });

  const prompt = await prisma.prompt.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ prompt });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.prompt.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

  await prisma.prompt.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
