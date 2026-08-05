import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { updateProfileSchema } from "@/lib/validation/schemas";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      bio: true,
      image: true,
      email: true,
      displayId: true,
      twoFactorEnabled: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力が正しくありません" }, { status: 400 });
  }

  const data: Record<string, string> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.bio !== undefined) data.bio = parsed.data.bio;
  if (parsed.data.image) data.image = parsed.data.image;

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, bio: true, image: true, email: true, displayId: true },
  });

  return NextResponse.json({ user });
}
