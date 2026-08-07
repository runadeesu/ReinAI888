import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// Temporary, secret-gated migration endpoint. Raw Postgres TCP isn't
// reachable from the dev sandbox, so schema changes for this feature batch
// (Conversation.shareId, User.customInstructions) are applied by calling
// this route once from outside, then deleting it. See git history for the
// same pattern used for earlier schema changes.
export async function POST(request: Request) {
  const secret = request.headers.get("X-Admin-Secret");
  if (!secret || secret !== process.env.ADMIN_MIGRATE_V2_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.$executeRawUnsafe(`ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "shareId" TEXT;`);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_shareId_key" ON "Conversation"("shareId");`
  );
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "customInstructions" TEXT;`);

  return NextResponse.json({ ok: true });
}
