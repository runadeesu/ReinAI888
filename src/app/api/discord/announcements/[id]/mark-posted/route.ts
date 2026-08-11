import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

function checkSecret(request: Request): boolean {
  const secret = request.headers.get("X-Bot-Secret");
  return Boolean(secret) && secret === process.env.DISCORD_BOT_SECRET;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.announcement.update({ where: { id }, data: { discordPostedAt: new Date() } }).catch(() => null);

  return NextResponse.json({ ok: true });
}
