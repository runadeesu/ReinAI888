import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveUserByQuery, checkSecret } from "@/lib/discord-admin/resolve-user";

export async function GET(request: Request) {
  if (!checkSecret(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const query = new URL(request.url).searchParams.get("query") ?? "";
  const user = await resolveUserByQuery(query);
  if (!user) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });

  const sessions = await prisma.session.findMany({
    where: { userId: user.id },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, userAgent: true, ipAddress: true, createdAt: true, lastSeenAt: true, expires: true },
  });

  return NextResponse.json({ email: user.email, sessions });
}
