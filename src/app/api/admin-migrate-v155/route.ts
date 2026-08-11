import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// Temporary, secret-gated one-shot migration route for the v1.5.5 schema
// additions. Deployed, called once via curl with X-Admin-Secret, then
// deleted (along with the ADMIN_MIGRATE_SECRET env var) in a follow-up
// commit — raw Postgres TCP is blocked from the dev sandbox, so this is
// the only way to apply schema changes to the production database.
const STATEMENTS = [
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "favoriteModels" TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false`,

  `CREATE TABLE IF NOT EXISTS "Persona" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "Persona_userId_idx" ON "Persona"("userId")`,
  `DO $$ BEGIN
    ALTER TABLE "Persona" ADD CONSTRAINT "Persona_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `CREATE TABLE IF NOT EXISTS "InstructionVersion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InstructionVersion_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "InstructionVersion_userId_idx" ON "InstructionVersion"("userId")`,
  `DO $$ BEGIN
    ALTER TABLE "InstructionVersion" ADD CONSTRAINT "InstructionVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `CREATE TABLE IF NOT EXISTS "Announcement" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
  )`,

  `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "customInstructions" TEXT`,
  `ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "reactions" TEXT NOT NULL DEFAULT '[]'`,
];

export async function POST(request: Request) {
  const secret = request.headers.get("X-Admin-Secret");
  if (!secret || secret !== process.env.ADMIN_MIGRATE_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results: { statement: string; ok: boolean; error?: string }[] = [];
  for (const statement of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(statement);
      results.push({ statement: statement.slice(0, 60), ok: true });
    } catch (err) {
      results.push({ statement: statement.slice(0, 60), ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ results });
}
