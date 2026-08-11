import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { favoriteModels: true } });
  return NextResponse.json({ favoriteModels: JSON.parse(user?.favoriteModels ?? "[]") });
}

const toggleSchema = z.object({ modelKey: z.string().min(1) });

export async function PATCH(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "入力が正しくありません" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { favoriteModels: true } });
  const current: string[] = JSON.parse(user?.favoriteModels ?? "[]");
  const next = current.includes(parsed.data.modelKey)
    ? current.filter((k) => k !== parsed.data.modelKey)
    : [...current, parsed.data.modelKey];

  await prisma.user.update({ where: { id: userId }, data: { favoriteModels: JSON.stringify(next) } });
  return NextResponse.json({ favoriteModels: next });
}
