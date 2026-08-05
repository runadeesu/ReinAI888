import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  const token = request.headers.get("x-admin-token");
  if (!token || token !== process.env.ADMIN_MIGRATE_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const info = await prisma.$queryRawUnsafe(`
    SELECT current_user, current_database(),
      (SELECT array_agg(nspname) FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname != 'information_schema') AS schemas,
      (SELECT array_agg(rolname) FROM pg_roles WHERE pg_has_role(current_user, oid, 'member')) AS roles,
      has_schema_privilege(current_user, 'public', 'CREATE') AS can_create_in_public,
      has_schema_privilege(current_user, 'public', 'USAGE') AS can_use_public
  `);
  return NextResponse.json({ info });
}

// One-time bootstrap endpoint: applies prisma/migrations/*/migration.sql
// directly over the existing Prisma connection. Exists only because this
// deploy's build runs without direct Postgres TCP access to run
// `prisma migrate deploy` itself; remove this route once the database has
// been migrated for the first time.
export async function POST(request: Request) {
  const token = request.headers.get("x-admin-token");
  if (!token || token !== process.env.ADMIN_MIGRATE_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();

  const results: { migration: string; statements: number; error?: string }[] = [];

  for (const dir of dirs) {
    const sqlPath = path.join(migrationsDir, dir, "migration.sql");
    const sql = await fs.readFile(sqlPath, "utf8");
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    let applied = 0;
    try {
      for (const statement of statements) {
        await prisma.$executeRawUnsafe(statement);
        applied += 1;
      }
      results.push({ migration: dir, statements: applied });
    } catch (error) {
      results.push({
        migration: dir,
        statements: applied,
        error: error instanceof Error ? error.message : String(error),
      });
      break;
    }
  }

  return NextResponse.json({ results });
}
