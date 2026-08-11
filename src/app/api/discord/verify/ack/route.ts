import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

function checkSecret(request: Request): boolean {
  const secret = request.headers.get("X-Bot-Secret");
  return Boolean(secret) && secret === process.env.DISCORD_BOT_SECRET;
}

export async function POST(request: Request) {
  if (!checkSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const discordIds: string[] = Array.isArray(body.discordIds) ? body.discordIds.filter((id: unknown) => typeof id === "string") : [];
  if (discordIds.length === 0) {
    return NextResponse.json({ error: "discordIds is required" }, { status: 400 });
  }

  await prisma.discordLink.updateMany({
    where: { discordId: { in: discordIds } },
    data: { notifiedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
