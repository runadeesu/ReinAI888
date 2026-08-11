import { Events } from "discord.js";

// Regexes for the secret formats that most commonly get accidentally
// pasted into a support/dev channel. Not exhaustive — a real secret
// scanner service would catch more — but these cover the common,
// high-confidence cases without flooding false positives on ordinary text.
const PATTERNS = [
  { name: "OpenAI APIキー", re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { name: "Anthropic APIキー", re: /\bsk-ant-[A-Za-z0-9-]{20,}\b/ },
  { name: "Google APIキー", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: "AWSアクセスキー", re: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: "Discord Botトークン", re: /\b[MN][A-Za-z0-9_-]{23}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}\b/ },
  { name: "GitHubトークン", re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
];

export function registerSecretCheck(client) {
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const hit = PATTERNS.find((p) => p.re.test(message.content));
    if (!hit) return;

    try {
      await message.delete();
      await message.channel.send(
        `⚠️ ${message.author} さんの投稿に${hit.name}らしき文字列が含まれていたため、自動的に削除しました。誤って公開してしまった場合は、そのキーを速やかに無効化・再発行してください。`
      );
      console.log(`[secret-check] removed a message from ${message.author.username} matching ${hit.name}`);
    } catch (err) {
      console.error("[secret-check] failed to remove message:", err.message);
    }
  });
}
