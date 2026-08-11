import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { checkSecret } from "@/lib/discord-admin/resolve-user";

export async function GET(request: Request) {
  if (!checkSecret(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    return NextResponse.json({ ok: true, latencyMs });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 200 });
  }
}
