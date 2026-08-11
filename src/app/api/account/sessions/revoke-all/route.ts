import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  const currentSid = token?.sid as string | undefined;

  await prisma.session.deleteMany({
    where: { userId, ...(currentSid ? { id: { not: currentSid } } : {}) },
  });

  return NextResponse.json({ ok: true });
}
