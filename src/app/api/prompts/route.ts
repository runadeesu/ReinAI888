import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { promptSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const url = new URL(request.url);
  const categoryId = url.searchParams.get("categoryId");
  const favorite = url.searchParams.get("favorite");
  const projectId = url.searchParams.get("projectId");

  const prompts = await prisma.prompt.findMany({
    where: {
      userId,
      ...(categoryId ? { categoryId } : {}),
      ...(favorite === "true" ? { isFavorite: true } : {}),
      ...(projectId ? { projectId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { category: true },
  });

  return NextResponse.json({ prompts });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = promptSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "入力が正しくありません" }, { status: 400 });

  const prompt = await prisma.prompt.create({
    data: {
      userId,
      title: parsed.data.title,
      content: parsed.data.content,
      categoryId: parsed.data.categoryId ?? null,
      projectId: parsed.data.projectId ?? null,
    },
  });

  return NextResponse.json({ prompt });
}
