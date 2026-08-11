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
