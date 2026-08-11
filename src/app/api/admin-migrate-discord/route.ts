import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// Temporary, secret-gated one-shot migration route for the Discord bot's
// schema additions. Deployed, called once via curl with X-Admin-Secret,
// then deleted (along with the ADMIN_MIGRATE_SECRET env var) in a
// follow-up commit — same pattern used for the v1.5.5 migration.
const STATEMENTS = [
  `ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "discordPostedAt" TIMESTAMP(3)`,

  `CREATE TABLE IF NOT EXISTS "DiscordVerificationCode" (
    "code" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "discordUsername" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DiscordVerificationCode_pkey" PRIMARY KEY ("code")
  )`,
  `CREATE INDEX IF NOT EXISTS "DiscordVerificationCode_discordId_idx" ON "DiscordVerificationCode"("discordId")`,

  `CREATE TABLE IF NOT EXISTS "DiscordLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "discordUsername" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    CONSTRAINT "DiscordLink_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN
    CREATE UNIQUE INDEX "DiscordLink_userId_key" ON "DiscordLink"("userId");
  EXCEPTION WHEN duplicate_table THEN NULL; END $$`,
  `DO $$ BEGIN
    CREATE UNIQUE INDEX "DiscordLink_discordId_key" ON "DiscordLink"("discordId");
  EXCEPTION WHEN duplicate_table THEN NULL; END $$`,
  `DO $$ BEGIN
    ALTER TABLE "DiscordLink" ADD CONSTRAINT "DiscordLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
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
