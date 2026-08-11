import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

function checkSecret(request: Request): boolean {
  const secret = request.headers.get("X-Bot-Secret");
  return Boolean(secret) && secret === process.env.DISCORD_BOT_SECRET;
}

// The bot polls this to find newly-confirmed links it hasn't assigned the
// verified role for yet, then calls /ack once it has.
export async function GET(request: Request) {
  if (!checkSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const links = await prisma.discordLink.findMany({
    where: { notifiedAt: null },
    select: { discordId: true, discordUsername: true, linkedAt: true },
    orderBy: { linkedAt: "asc" },
  });

  return NextResponse.json({ links });
}
