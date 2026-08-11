import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveUserByQuery, checkSecret } from "@/lib/discord-admin/resolve-user";

// Heuristic only: flags other accounts that have logged in or held a
// session from the same IP address as the target. Shared IPs happen
// legitimately too (same household, mobile carrier NAT, VPN), so this is
// a lead for a human to review, not proof of an alt account.
export async function GET(request: Request) {
  if (!checkSecret(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const query = new URL(request.url).searchParams.get("query") ?? "";
  const user = await resolveUserByQuery(query);
  if (!user) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });

  const [logins, sessions] = await Promise.all([
    prisma.loginHistory.findMany({ where: { userId: user.id }, select: { ipAddress: true } }),
    prisma.session.findMany({ where: { userId: user.id }, select: { ipAddress: true } }),
  ]);
  const ips = [...new Set([...logins, ...sessions].map((r) => r.ipAddress).filter((ip): ip is string => Boolean(ip)))];

  if (ips.length === 0) return NextResponse.json({ email: user.email, ips: [], matches: [] });

  const [loginHits, sessionHits] = await Promise.all([
    prisma.loginHistory.findMany({
      where: { ipAddress: { in: ips }, userId: { not: user.id } },
      distinct: ["userId"],
      select: { userId: true, ipAddress: true },
    }),
    prisma.session.findMany({
      where: { ipAddress: { in: ips }, userId: { not: user.id } },
      distinct: ["userId"],
      select: { userId: true, ipAddress: true },
    }),
  ]);

  const matchedUserIds = [...new Set([...loginHits, ...sessionHits].map((h) => h.userId))];
  const matches = matchedUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: matchedUserIds } },
        select: { email: true, displayId: true, createdAt: true, isSuspended: true },
      })
    : [];

  return NextResponse.json({ email: user.email, ips, matches });
}
