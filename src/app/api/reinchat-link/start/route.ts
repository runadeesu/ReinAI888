import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { reinChatUrl } from "@/lib/reinchat/shared-secret";

const CODE_TTL_MS = 15 * 60 * 1000;

// Session-authenticated: the logged-in ReinAI user starts linking a REINChat
// account. Mints a short-lived code and sends the browser to REINChat,
// which confirms it back to us server-to-server once the user is logged
// into REINChat too (see /api/reinchat-link/confirm).
export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL ?? "https://reinai-app.vercel.app"));
  }

  await prisma.reinChatVerificationCode.deleteMany({ where: { userId } });

  const code = randomBytes(16).toString("hex");
  await prisma.reinChatVerificationCode.create({
    data: { code, userId, expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });

  return NextResponse.redirect(`${reinChatUrl()}/link-reinai/${code}`);
}
