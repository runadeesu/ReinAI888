import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  const currentSid = token?.sid as string | undefined;

  const sessions = await prisma.session.findMany({
    where: { userId, expires: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
  });

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      isCurrent: s.id === currentSid,
    })),
  });
}
