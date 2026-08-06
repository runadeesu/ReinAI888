import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/session";
import { getAvailableProviders } from "@/lib/ai/resolve-key";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const providers = await getAvailableProviders(userId);
  return NextResponse.json({ providers });
}
