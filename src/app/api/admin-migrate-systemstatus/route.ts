import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// Temporary, secret-gated one-shot migration route for the SystemStatus
// table backing /maintenance-on and /maintenance-off. Same pattern as the
// earlier migrations — deleted after it's run once.
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "SystemStatus" (
    "id" TEXT NOT NULL,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SystemStatus_pkey" PRIMARY KEY ("id")
  )`,
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
