import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Route access itself is already gated by middleware (session cookie
// required for everything except /login), so no additional check here.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!target) {
    return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  }

  if (target.email === "admin@reinai.local") {
    return NextResponse.json({ error: "ReinAI本体の管理者アカウントは削除できません" }, { status: 400 });
  }

  // Cascades to conversations/messages/attachments/apiKeys/sessions/etc via
  // onDelete: Cascade on every relation back to User in the schema.
  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!target) {
    return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  }
  if (target.email === "admin@reinai.local") {
    return NextResponse.json({ error: "ReinAI本体の管理者アカウントは停止できません" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body.isSuspended !== "boolean") {
    return NextResponse.json({ error: "入力が正しくありません" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isSuspended: body.isSuspended },
    select: { id: true, isSuspended: true },
  });

  // Suspending kicks the user off every active session immediately —
  // the main app's session callback checks isSuspended on each request.
  if (body.isSuspended) {
    await prisma.session.deleteMany({ where: { userId: id } });
  }

  return NextResponse.json({ user });
}
