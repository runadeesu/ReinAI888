import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/session";
import { peekRateLimit } from "@/lib/rate-limit/limiter";

const BUCKETS = [
  { key: "chat", label: "チャットメッセージ", limit: 30, windowLabel: "1分間" },
  { key: "image-gen", label: "画像生成", limit: 10, windowLabel: "1分間" },
  { key: "video-gen", label: "動画生成", limit: 5, windowLabel: "1時間" },
] as const;

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const status = BUCKETS.map((b) => {
    const result = peekRateLimit(`${b.key}:${userId}`, b.limit);
    return {
      label: b.label,
      windowLabel: b.windowLabel,
      limit: b.limit,
      remaining: result.remaining,
      resetAt: result.resetAt,
    };
  });

  return NextResponse.json({ status });
}
