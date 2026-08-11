import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveUserByQuery, checkSecret } from "@/lib/discord-admin/resolve-user";

export async function POST(request: Request) {
  if (!checkSecret(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const query = typeof body.query === "string" ? body.query : "";
  const user = await resolveUserByQuery(query);
  if (!user) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { isSuspended: true } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({ email: user.email });
}
