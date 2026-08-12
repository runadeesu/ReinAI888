import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { checkReinChatSecret } from "@/lib/reinchat/shared-secret";

// Called by REINChat when an admin posts an announcement there, so it also
// reaches ReinAI's users via the existing announcement banner. One-way
// relay on create only — toggling active/deleting doesn't propagate, same
// as the Discord relay only ever posting, never retracting.
export async function POST(request: Request) {
  if (!checkReinChatSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 500) {
    return NextResponse.json({ error: "message must be 1-500 characters" }, { status: 400 });
  }

  const announcement = await prisma.announcement.create({ data: { message } });
  return NextResponse.json({ announcement });
}
