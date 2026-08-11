import { NextResponse } from "next/server";
import { resolveUserByQuery, checkSecret } from "@/lib/discord-admin/resolve-user";
import { resetRateLimit } from "@/lib/rate-limit/limiter";

export async function POST(request: Request) {
  if (!checkSecret(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const query = typeof body.query === "string" ? body.query : "";
  const user = await resolveUserByQuery(query);
  if (!user) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });

  resetRateLimit(`chat:${user.id}`);
  resetRateLimit(`image-gen:${user.id}`);
  resetRateLimit(`video-gen:${user.id}`);

  return NextResponse.json({
    email: user.email,
    note: "サーバーレス環境の特性上、この操作は現在リクエストを処理しているインスタンスにのみ即時反映されます。他インスタンスの制限は各ウィンドウの自然経過(最大1時間)で解除されます。",
  });
}
