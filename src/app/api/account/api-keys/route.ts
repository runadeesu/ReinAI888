import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { encrypt } from "@/lib/crypto/encryption";
import { apiKeySchema } from "@/lib/validation/schemas";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const keys = await prisma.apiKey.findMany({
    where: { userId },
    select: { id: true, provider: true, label: true, lastFour: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = apiKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力が正しくありません" }, { status: 400 });
  }

  const { provider, key, label } = parsed.data;
  const { encryptedData, iv, authTag } = encrypt(key);

  const saved = await prisma.apiKey.upsert({
    where: { userId_provider: { userId, provider } },
    update: { encryptedKey: encryptedData, iv, authTag, lastFour: key.slice(-4), label },
    create: {
      userId,
      provider,
      encryptedKey: encryptedData,
      iv,
      authTag,
      lastFour: key.slice(-4),
      label,
    },
    select: { id: true, provider: true, label: true, lastFour: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ key: saved });
}
