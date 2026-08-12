import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { checkReinChatSecret } from "@/lib/reinchat/shared-secret";

const TOKEN_TTL_MS = 60 * 1000;

// Called by REINChat's server (shared-secret authenticated) when a linked
// user clicks "ReinAIを開く". Mints a single-use, 60s token redeemable via
// the "reinchat-token" Credentials provider (see src/auth.ts) — reuses the
// VerificationToken table Auth.js already ships with.
export async function POST(request: Request) {
  if (!checkReinChatSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const reinchatUserId = typeof body.reinchatUserId === "string" ? body.reinchatUserId : "";
  if (!reinchatUserId) {
    return NextResponse.json({ error: "reinchatUserId is required" }, { status: 400 });
  }

  const link = await prisma.reinChatLink.findUnique({ where: { reinchatUserId } });
  if (!link) {
    return NextResponse.json({ error: "not_linked" }, { status: 404 });
  }

  const token = randomBytes(24).toString("hex");
  await prisma.verificationToken.create({
    data: {
      identifier: `reinchat-sso:${link.userId}`,
      token,
      expires: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://reinai-app.vercel.app";
  return NextResponse.json({ url: `${baseUrl}/reinchat-sso?token=${token}` });
}
