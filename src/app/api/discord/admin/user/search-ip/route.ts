import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { checkSecret } from "@/lib/discord-admin/resolve-user";

export async function GET(request: Request) {
  if (!checkSecret(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = new URL(request.url).searchParams.get("ip")?.trim() ?? "";
  if (!ip) return NextResponse.json({ error: "ip is required" }, { status: 400 });

  const [loginHits, sessionHits] = await Promise.all([
    prisma.loginHistory.findMany({
      where: { ipAddress: ip },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.session.findMany({
      where: { ipAddress: ip },
      distinct: ["userId"],
      select: { userId: true },
    }),
  ]);

  const userIds = [...new Set([...loginHits.map((h) => h.userId), ...sessionHits.map((s) => s.userId)])];
  if (userIds.length === 0) return NextResponse.json({ users: [] });

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, displayId: true, isSuspended: true, createdAt: true },
  });

  return NextResponse.json({ users });
}
