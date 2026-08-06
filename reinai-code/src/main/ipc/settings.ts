import path from "node:path";
import fs from "node:fs";
import { app, safeStorage } from "electron";
import type { AiProviderId, Settings } from "../../shared/types.js";

interface StoredConfig {
  provider: AiProviderId;
  model: string;
  // API keys are encrypted with the OS keychain (Windows DPAPI / macOS
  // Keychain / libsecret) via Electron's safeStorage, then base64-encoded
  // for JSON storage — never written to disk in plaintext.
  encryptedKeys: Partial<Record<AiProviderId, string>>;
}

function configPath(): string {
  return path.join(app.getPath("userData"), "reinai-code-config.json");
}

function loadConfig(): StoredConfig {
  try {
    const raw = fs.readFileSync(configPath(), "utf-8");
    return JSON.parse(raw);
  } catch {
    return { provider: "anthropic", model: "claude-sonnet-5", encryptedKeys: {} };
  }
}

function saveConfig(config: StoredConfig): void {
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2), "utf-8");
}

export function getSettings(): Settings {
  const config = loadConfig();
  return {
    provider: config.provider,
    model: config.model,
    hasApiKey: Boolean(config.encryptedKeys[config.provider]),
  };
}

export function setProviderAndModel(provider: AiProviderId, model: string): void {
  const config = loadConfig();
  config.provider = provider;
  config.model = model;
  saveConfig(config);
}

export function setApiKey(provider: AiProviderId, apiKey: string): void {
  const config = loadConfig();
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("この環境ではOSレベルの暗号化(safeStorage)が利用できません。");
  }
  config.encryptedKeys[provider] = safeStorage.encryptString(apiKey).toString("base64");
  saveConfig(config);
}

export function getApiKey(provider: AiProviderId): string | null {
  const config = loadConfig();
  const encrypted = config.encryptedKeys[provider];
  if (!encrypted) return null;
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, "base64"));
  } catch {
    return null;
  }
}
