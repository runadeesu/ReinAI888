import { prisma } from "@/lib/db/prisma";

// Daily token budget for server-provided free-tier models (NVIDIA /
// OpenRouter) only. A user's own registered API key is never subject to
// this, for any provider. Admins bypass the quota entirely.
const DAILY_FREE_PROVIDER_TOKEN_LIMIT = 20_000;

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function checkQuota(userId: string): Promise<{ ok: boolean; remaining: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, dailyTokensUsed: true, dailyTokensResetAt: true },
  });
  if (!user) return { ok: false, remaining: 0 };
  if (user.role === "admin") return { ok: true, remaining: Infinity };

  const today = startOfTodayUtc();
  const used = user.dailyTokensResetAt < today ? 0 : user.dailyTokensUsed;
  return { ok: used < DAILY_FREE_PROVIDER_TOKEN_LIMIT, remaining: Math.max(0, DAILY_FREE_PROVIDER_TOKEN_LIMIT - used) };
}

export async function consumeQuota(userId: string, tokens: number): Promise<void> {
  if (tokens <= 0) return;
  const today = startOfTodayUtc();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dailyTokensUsed: true, dailyTokensResetAt: true },
  });
  if (!user) return;

  const stillToday = user.dailyTokensResetAt >= today;
  await prisma.user.update({
    where: { id: userId },
    data: {
      dailyTokensUsed: stillToday ? user.dailyTokensUsed + tokens : tokens,
      dailyTokensResetAt: stillToday ? user.dailyTokensResetAt : new Date(),
    },
  });
}
