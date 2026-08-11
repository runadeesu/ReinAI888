import { prisma } from "@/lib/db/prisma";

// The Discord admin bot lets operators target a user by whatever they have
// on hand — email, the user-facing displayId, or a linked Discord ID — so
// every admin route resolves through this one lookup instead of assuming
// which identifier was passed.
export async function resolveUserByQuery(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const byDiscord = await prisma.discordLink.findUnique({
    where: { discordId: trimmed },
    select: { userId: true },
  });
  if (byDiscord) {
    return prisma.user.findUnique({ where: { id: byDiscord.userId } });
  }

  const byEmail = await prisma.user.findUnique({ where: { email: trimmed.toLowerCase() } });
  if (byEmail) return byEmail;

  const byDisplayId = await prisma.user.findUnique({ where: { displayId: trimmed } });
  if (byDisplayId) return byDisplayId;

  return null;
}

export function checkSecret(request: Request): boolean {
  const secret = request.headers.get("X-Bot-Secret");
  return Boolean(secret) && secret === process.env.DISCORD_BOT_SECRET;
}
