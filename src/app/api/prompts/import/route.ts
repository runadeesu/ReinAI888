import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { z } from "zod";

const importSchema = z.object({
  prompts: z.array(
    z.object({
      title: z.string().min(1).max(120),
      content: z.string().min(1),
      category: z.string().max(64).optional().nullable(),
    })
  ),
});

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "ファイル形式が正しくありません" }, { status: 400 });

  const categoryCache = new Map<string, string>();
  let imported = 0;

  for (const p of parsed.data.prompts) {
    let categoryId: string | null = null;
    if (p.category) {
      if (categoryCache.has(p.category)) {
        categoryId = categoryCache.get(p.category)!;
      } else {
        const existing = await prisma.promptCategory.findFirst({ where: { userId, name: p.category } });
        const category = existing ?? (await prisma.promptCategory.create({ data: { userId, name: p.category } }));
        categoryId = category.id;
        categoryCache.set(p.category, category.id);
      }
    }

    await prisma.prompt.create({
      data: { userId, title: p.title, content: p.content, categoryId },
    });
    imported += 1;
  }

  return NextResponse.json({ ok: true, imported });
}
