import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveUserByQuery, checkSecret } from "@/lib/discord-admin/resolve-user";

// Structured JSON export of a user's account for support/GDPR requests.
// Message *content* is intentionally left out to keep the payload
// bounded and because conversation content isn't what these requests are
// usually about — only metadata plus the lists a user would recognize
// (conversations, prompts, personas, sessions, login history).
export async function GET(request: Request) {
  if (!checkSecret(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const query = new URL(request.url).searchParams.get("query") ?? "";
  const user = await resolveUserByQuery(query);
  if (!user) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });

  const [conversations, prompts, personas, sessions, loginHistory, discordLink] = await Promise.all([
    prisma.conversation.findMany({
      where: { userId: user.id },
      select: { id: true, title: true, provider: true, model: true, createdAt: true, updatedAt: true, _count: { select: { messages: true } } },
    }),
    prisma.prompt.findMany({ where: { userId: user.id }, select: { title: true, content: true, createdAt: true } }),
    prisma.persona.findMany({ where: { userId: user.id }, select: { name: true, instructions: true, createdAt: true } }),
    prisma.session.findMany({ where: { userId: user.id }, select: { ipAddress: true, userAgent: true, createdAt: true, lastSeenAt: true } }),
    prisma.loginHistory.findMany({ where: { userId: user.id }, select: { method: true, success: true, ipAddress: true, createdAt: true } }),
    prisma.discordLink.findUnique({ where: { userId: user.id }, select: { discordId: true, discordUsername: true, linkedAt: true } }),
  ]);

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    profile: {
      id: user.id,
      email: user.email,
      displayId: user.displayId,
      name: user.name,
      bio: user.bio,
      createdAt: user.createdAt,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      isSuspended: user.isSuspended,
      customInstructions: user.customInstructions,
    },
    discordLink,
    conversations,
    prompts,
    personas,
    sessions,
    loginHistory,
  });
}
