import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/crypto/encryption";
import { AI_PROVIDERS, type AiProviderId } from "@/lib/ai/models";

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
