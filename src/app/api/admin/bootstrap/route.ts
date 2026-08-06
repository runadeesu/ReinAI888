import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateDisplayId } from "@/lib/utils/ids";

// Temporary, secret-gated one-time setup endpoint — applies the
// plan/role/quota/Stripe columns to production (this deploy's build
// intentionally skips `prisma migrate deploy`, see netlify.toml) and lets an
// operator bootstrap the first admin account. Deleted from the codebase
// again once used; not part of the app's permanent surface.
export async function POST(request: Request) {
  const secret = request.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_BOOTSTRAP_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));

  if (body.action === "migrate") {
    const statements = [
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'user'`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'FREE'`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dailyTokensUsed" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dailyTokensResetAt" TIMESTAMP(3) NOT NULL DEFAULT now()`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId")`,
    ];
    for (const sql of statements) {
      await prisma.$executeRawUnsafe(sql);
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "create-admin") {
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name : "Admin";

    if (!email || !password || password.length < 8) {
      return NextResponse.json({ error: "email/password required (password >= 8 chars)" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    let displayId = generateDisplayId();
    while (await prisma.user.findUnique({ where: { displayId } })) {
      displayId = generateDisplayId();
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: { role: "admin", plan: "MASTER", passwordHash, emailVerified: new Date() },
      create: {
        email,
        name,
        displayId,
        passwordHash,
        emailVerified: new Date(),
        role: "admin",
        plan: "MASTER",
      },
      select: { id: true, email: true, displayId: true, role: true, plan: true },
    });

    return NextResponse.json({ ok: true, user });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
