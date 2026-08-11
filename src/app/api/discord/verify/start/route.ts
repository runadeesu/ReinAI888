import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";

const CODE_TTL_MS = 15 * 60 * 1000;

function checkSecret(request: Request): boolean {
  const secret = request.headers.get("X-Bot-Secret");
  return Boolean(secret) && secret === process.env.DISCORD_BOT_SECRET;
}

// Called by the Discord bot's /verify command. Issues a short-lived code
// the member opens in a browser (while logged into ReinAI) to confirm the
// link — the bot never sees or handles ReinAI credentials itself.
export async function POST(request: Request) {
  if (!checkSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const discordId = typeof body.discordId === "string" ? body.discordId : "";
  const discordUsername = typeof body.discordUsername === "string" ? body.discordUsername : "";
  if (!discordId || !discordUsername) {
    return NextResponse.json({ error: "discordId and discordUsername are required" }, { status: 400 });
  }

  await prisma.discordVerificationCode.deleteMany({ where: { discordId } });

  const code = randomBytes(16).toString("hex");
  await prisma.discordVerificationCode.create({
    data: {
      code,
      discordId,
      discordUsername,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://reinai-app.vercel.app";
  return NextResponse.json({ code, url: `${baseUrl}/discord-verify/${code}`, expiresInMinutes: 15 });
}
