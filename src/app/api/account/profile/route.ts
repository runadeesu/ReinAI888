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
      customInstructions: true,
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

  const data: Record<string, string | null> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.bio !== undefined) data.bio = parsed.data.bio;
  if (parsed.data.image) data.image = parsed.data.image;

  if (parsed.data.customInstructions !== undefined) {
    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { customInstructions: true } });
    if (existing?.customInstructions && existing.customInstructions !== parsed.data.customInstructions) {
      await prisma.instructionVersion.create({ data: { userId, content: existing.customInstructions } });
    }
    data.customInstructions = parsed.data.customInstructions;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, bio: true, image: true, email: true, displayId: true, customInstructions: true },
  });

  return NextResponse.json({ user });
}
