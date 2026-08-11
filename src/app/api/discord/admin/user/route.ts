import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveUserByQuery, checkSecret } from "@/lib/discord-admin/resolve-user";

// GET /api/discord/admin/user?query=<email|displayId|discordId> — profile
// + usage summary for /user-info.
export async function GET(request: Request) {
  if (!checkSecret(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const query = new URL(request.url).searchParams.get("query") ?? "";
  const user = await resolveUserByQuery(query);
  if (!user) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });

  const [conversationCount, messageStats, discordLink] = await Promise.all([
    prisma.conversation.count({ where: { userId: user.id } }),
    prisma.message.aggregate({
      where: { conversation: { userId: user.id } },
      _sum: { promptTokens: true, completionTokens: true },
      _count: { _all: true },
    }),
    prisma.discordLink.findUnique({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({
    id: user.id,
    email: user.email,
    displayId: user.displayId,
    name: user.name,
    createdAt: user.createdAt,
    emailVerified: Boolean(user.emailVerified),
    twoFactorEnabled: user.twoFactorEnabled,
    isSuspended: user.isSuspended,
    conversationCount,
    messageCount: messageStats._count._all,
    totalTokens: (messageStats._sum.promptTokens ?? 0) + (messageStats._sum.completionTokens ?? 0),
    discordUsername: discordLink?.discordUsername ?? null,
  });
}
