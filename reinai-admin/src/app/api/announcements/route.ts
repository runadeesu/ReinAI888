import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ announcements });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 500) {
    return NextResponse.json({ error: "メッセージは1〜500文字で入力してください" }, { status: 400 });
  }

  const announcement = await prisma.announcement.create({ data: { message } });
  relayToReinChat(message);

  return NextResponse.json({ announcement });
}

// Fire-and-forget: also posts to REINChat so its users see the same
// announcement. Best-effort — a relay failure doesn't block creation here.
function relayToReinChat(message: string) {
  const reinchatUrl = process.env.REINCHAT_URL;
  const secret = process.env.REINCHAT_SHARED_SECRET;
  if (!reinchatUrl || !secret) return;

  fetch(`${reinchatUrl.replace(/\/$/, "")}/api/announcements/relay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-ReinChat-Secret": secret },
    body: JSON.stringify({ message }),
  }).catch(() => {});
}
