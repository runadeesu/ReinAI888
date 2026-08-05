import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const prompts = await prisma.prompt.findMany({
    where: { userId },
    select: { title: true, content: true, category: { select: { name: true } } },
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    prompts: prompts.map((p) => ({ title: p.title, content: p.content, category: p.category?.name ?? null })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="reinai-prompts.json"',
    },
  });
}
