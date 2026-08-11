import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { checkSecret } from "@/lib/discord-admin/resolve-user";

export async function GET(request: Request) {
  if (!checkSecret(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const status = await prisma.systemStatus.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({
    maintenanceMode: status?.maintenanceMode ?? false,
    maintenanceMessage: status?.maintenanceMessage ?? null,
  });
}

export async function POST(request: Request) {
  if (!checkSecret(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const enabled = Boolean(body.enabled);
  const message = typeof body.message === "string" ? body.message.slice(0, 500) : null;

  const status = await prisma.systemStatus.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", maintenanceMode: enabled, maintenanceMessage: message },
    update: { maintenanceMode: enabled, maintenanceMessage: enabled ? message : null },
  });

  return NextResponse.json({ maintenanceMode: status.maintenanceMode, maintenanceMessage: status.maintenanceMessage });
}
