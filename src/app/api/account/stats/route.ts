import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";

const WEEKS = 8;

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const since = new Date();
  since.setDate(since.getDate() - WEEKS * 7);

  const [conversationCount, messages] = await Promise.all([
    prisma.conversation.count({ where: { userId } }),
    prisma.message.findMany({
      where: { conversation: { userId }, createdAt: { gte: since } },
      select: { role: true, provider: true, model: true, promptTokens: true, completionTokens: true, createdAt: true },
    }),
  ]);

  const totalMessages = await prisma.message.count({ where: { conversation: { userId } } });

  const modelCounts = new Map<string, number>();
  let totalTokens = 0;
  for (const m of messages) {
    if (m.role === "assistant" && m.model) {
      const key = m.provider ? `${m.provider}:${m.model}` : m.model;
      modelCounts.set(key, (modelCounts.get(key) ?? 0) + 1);
    }
    totalTokens += (m.promptTokens ?? 0) + (m.completionTokens ?? 0);
  }

  const weekBuckets: { weekStart: string; count: number }[] = [];
  for (let i = WEEKS - 1; i >= 0; i--) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - i * 7 - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const count = messages.filter((m) => m.createdAt >= start && m.createdAt < end).length;
    weekBuckets.push({ weekStart: start.toISOString(), count });
  }

  return NextResponse.json({
    conversationCount,
    totalMessages,
    totalTokens,
    modelBreakdown: [...modelCounts.entries()].map(([model, count]) => ({ model, count })).sort((a, b) => b.count - a.count),
    weeklyActivity: weekBuckets,
  });
}
