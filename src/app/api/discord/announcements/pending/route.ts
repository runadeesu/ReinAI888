import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

function checkSecret(request: Request): boolean {
  const secret = request.headers.get("X-Bot-Secret");
  return Boolean(secret) && secret === process.env.DISCORD_BOT_SECRET;
}

// The bot polls this to find active announcements it hasn't relayed to the
// community server yet, then calls mark-posted once it has.
export async function GET(request: Request) {
  if (!checkSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const announcements = await prisma.announcement.findMany({
    where: { active: true, discordPostedAt: null },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ announcements });
}
