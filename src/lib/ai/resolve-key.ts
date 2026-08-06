import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/crypto/encryption";
import { AI_PROVIDERS, type AiProviderId } from "@/lib/ai/models";

/**
 * Providers actually usable right now for this user: either they've
 * registered their own key, or a server-wide default key is configured via
 * env vars. Drives which providers/models the UI offers, so users never see
 * (and can't select) a provider that would immediately fail with "no API
 * key configured".
 */
export async function getAvailableProviders(userId: string): Promise<AiProviderId[]> {
  const userKeys = await prisma.apiKey.findMany({ where: { userId }, select: { provider: true } });
  const userProviderSet = new Set(userKeys.map((k) => k.provider));

  return Object.values(AI_PROVIDERS)
    .filter((p) => userProviderSet.has(p.id) || Boolean(process.env[p.envVar] && process.env[p.envVar]!.length > 0))
    .map((p) => p.id);
}

/** Whether the given user's resolved key for this provider is their own (vs. the server default). */
export async function hasOwnKey(userId: string, provider: AiProviderId): Promise<boolean> {
  const stored = await prisma.apiKey.findUnique({ where: { userId_provider: { userId, provider } } });
  return Boolean(stored);
}

/**
 * Resolves the API key to use for a given user + provider.
 * A user's own encrypted key (Settings -> API Keys) always takes
 * precedence over the server-wide default configured via env vars.
 */
export async function resolveApiKey(userId: string, provider: AiProviderId): Promise<string | null> {
  const stored = await prisma.apiKey.findUnique({ where: { userId_provider: { userId, provider } } });

  if (stored) {
    return decrypt({
      encryptedData: stored.encryptedKey,
      iv: stored.iv,
      authTag: stored.authTag,
    });
  }

  const envKey = process.env[AI_PROVIDERS[provider].envVar];
  return envKey && envKey.length > 0 ? envKey : null;
}
