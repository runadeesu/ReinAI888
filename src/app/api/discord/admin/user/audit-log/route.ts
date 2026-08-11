import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveUserByQuery, checkSecret } from "@/lib/discord-admin/resolve-user";

export async function GET(request: Request) {
  if (!checkSecret(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const query = new URL(request.url).searchParams.get("query") ?? "";
  const user = await resolveUserByQuery(query);
  if (!user) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });

  const history = await prisma.loginHistory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { method: true, success: true, ipAddress: true, userAgent: true, createdAt: true },
  });

  return NextResponse.json({ email: user.email, history });
}
