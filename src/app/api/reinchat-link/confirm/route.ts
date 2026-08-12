import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { checkReinChatSecret } from "@/lib/reinchat/shared-secret";

// Called by REINChat's own server (shared-secret authenticated, since the
// REINChat user's identity is only verified on REINChat's side) once the
// logged-in REINChat user has confirmed the code shown by
// /api/reinchat-link/start.
export async function POST(request: Request) {
  if (!checkReinChatSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code : "";
  const reinchatUserId = typeof body.reinchatUserId === "string" ? body.reinchatUserId : "";
  const reinchatEmail = typeof body.reinchatEmail === "string" ? body.reinchatEmail : "";
  const reinchatDisplayId = typeof body.reinchatDisplayId === "string" ? body.reinchatDisplayId : "";

  if (!code || !reinchatUserId || !reinchatEmail || !reinchatDisplayId) {
    return NextResponse.json({ error: "code, reinchatUserId, reinchatEmail, reinchatDisplayId are required" }, { status: 400 });
  }

  const record = await prisma.reinChatVerificationCode.findUnique({ where: { code } });
  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "リンクの有効期限が切れています" }, { status: 404 });
  }

  // A ReinAI account and a REINChat account are both 1:1 — replace whatever
  // either side was previously linked to, since the user intentionally
  // re-ran the linking flow.
  await prisma.$transaction([
    prisma.reinChatLink.deleteMany({ where: { OR: [{ userId: record.userId }, { reinchatUserId }] } }),
    prisma.reinChatLink.create({
      data: { userId: record.userId, reinchatUserId, reinchatEmail, reinchatDisplayId },
    }),
    prisma.reinChatVerificationCode.delete({ where: { code } }),
  ]);

  return NextResponse.json({ ok: true });
}
