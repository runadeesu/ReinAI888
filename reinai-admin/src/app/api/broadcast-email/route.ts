import { NextResponse } from "next/server";

// Forwards to reinai-app's admin-only broadcast endpoint using a shared
// secret kept server-side here — the browser never sees it.
export async function POST(request: Request) {
  const secret = process.env.ADMIN_BROADCAST_SECRET;
  const targetUrl = process.env.REINAI_APP_URL;
  if (!secret || !targetUrl) {
    return NextResponse.json({ error: "メール送信が設定されていません(ADMIN_BROADCAST_SECRET / REINAI_APP_URL)" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));

  const res = await fetch(`${targetUrl}/api/admin/broadcast-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Secret": secret },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
