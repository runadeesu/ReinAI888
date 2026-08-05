import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { z } from "zod";

const createSchema = z.object({ name: z.string().min(1).max(64), color: z.string().max(20).optional() });

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const categories = await prisma.promptCategory.findMany({ where: { userId }, orderBy: { name: "asc" } });
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "入力が正しくありません" }, { status: 400 });

  const category = await prisma.promptCategory.create({ data: { userId, ...parsed.data } });
  return NextResponse.json({ category });
}
