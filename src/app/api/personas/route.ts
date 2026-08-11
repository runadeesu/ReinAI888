import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const personas = await prisma.persona.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ personas });
}

const createSchema = z.object({
  name: z.string().min(1).max(60),
  instructions: z.string().min(1).max(4000),
});

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "入力が正しくありません" }, { status: 400 });

  const persona = await prisma.persona.create({ data: { userId, ...parsed.data } });
  return NextResponse.json({ persona });
}
