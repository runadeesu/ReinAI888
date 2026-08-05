import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  color: z.string().max(20).optional(),
});

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const projects = await prisma.project.findMany({ where: { userId }, orderBy: { lastUsedAt: "desc" } });
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "入力が正しくありません" }, { status: 400 });

  const project = await prisma.project.create({ data: { userId, ...parsed.data } });
  return NextResponse.json({ project });
}
