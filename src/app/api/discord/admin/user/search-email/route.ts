import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { checkSecret } from "@/lib/discord-admin/resolve-user";

export async function GET(request: Request) {
  if (!checkSecret(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const email = new URL(request.url).searchParams.get("email")?.trim() ?? "";
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });

  const users = await prisma.user.findMany({
    where: { email: { contains: email, mode: "insensitive" } },
    take: 10,
    select: {
      id: true,
      email: true,
      displayId: true,
      createdAt: true,
      isSuspended: true,
      discordLink: { select: { discordId: true, discordUsername: true } },
    },
  });

  return NextResponse.json({ users });
}
