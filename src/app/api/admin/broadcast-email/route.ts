import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/mailer";

// Called only by the standalone reinai-admin dashboard, authenticated with
// a shared secret (never exposed to any browser) rather than a user
// session — this route has no session/cookie auth of its own.
const CONCURRENCY = 5;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function broadcastEmailHtml(message: string): string {
  const body = escapeHtml(message).replace(/\n/g, "<br>");
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <p>${body}</p>
      <p style="margin-top:24px;font-size:12px;color:#888">このメールはReinAIの管理者から送信されました。</p>
    </div>`;
}

async function runWithConcurrency<T>(items: T[], limit: number, run: (item: T) => Promise<boolean>): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const item = items[index++];
      const success = await run(item);
      if (success) ok += 1;
      else failed += 1;
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return { ok, failed };
}

export async function POST(request: Request) {
  const secret = request.headers.get("X-Admin-Secret");
  if (!secret || secret !== process.env.ADMIN_BROADCAST_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const userIds: string[] | undefined = Array.isArray(body.userIds) ? body.userIds.filter((id: unknown) => typeof id === "string") : undefined;

  if (!subject || subject.length > 200) {
    return NextResponse.json({ error: "件名は1〜200文字で入力してください" }, { status: 400 });
  }
  if (!message || message.length > 5000) {
    return NextResponse.json({ error: "本文は1〜5000文字で入力してください" }, { status: 400 });
  }

  const users = await prisma.user.findMany({
    where: userIds && userIds.length > 0 ? { id: { in: userIds } } : undefined,
    select: { id: true, email: true },
  });

  if (users.length === 0) {
    return NextResponse.json({ error: "送信先ユーザーが見つかりません" }, { status: 400 });
  }

  const html = broadcastEmailHtml(message);
  const { ok, failed } = await runWithConcurrency(users, CONCURRENCY, async (user) => {
    try {
      await sendEmail({ to: user.email, subject, html });
      return true;
    } catch {
      return false;
    }
  });

  return NextResponse.json({ total: users.length, sent: ok, failed });
}
