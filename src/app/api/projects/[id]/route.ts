import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  color: z.string().max(20).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "入力が正しくありません" }, { status: 400 });

  const project = await prisma.project.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ project });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
