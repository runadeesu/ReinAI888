import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const link = await prisma.reinChatLink.findUnique({
    where: { userId },
    select: { reinchatDisplayId: true, linkedAt: true },
  });

  return NextResponse.json({ linked: Boolean(link), reinchatDisplayId: link?.reinchatDisplayId ?? null, linkedAt: link?.linkedAt ?? null });
}
