export interface ImageGenResult {
  base64: string;
  mimeType: string;
  providerLabel: string;
}

async function tryOpenAI(prompt: string, apiKey: string): Promise<ImageGenResult> {
  const { generateImage } = await import("ai");
  const { createOpenAI } = await import("@ai-sdk/openai");
  const openai = createOpenAI({ apiKey });
  const result = await generateImage({ model: openai.image("gpt-image-1"), prompt });
  return { base64: result.image.base64, mimeType: result.image.mediaType, providerLabel: "OpenAI (gpt-image-1)" };
}

// Google's older Imagen `predict` models (what the AI SDK's `.image()`
// wrapper targets) are deprecated for new accounts as of this writing, so
// this goes through the same generateContent-based "Nano Banana" path as
// OpenRouter instead — read directly via fetch since the AI SDK's image
// wrapper doesn't support this response shape.
async function tryGoogle(prompt: string, apiKey: string): Promise<ImageGenResult> {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
    {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: AbortSignal.timeout(90000),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Googleでの画像生成に失敗しました (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const imagePart = data?.candidates?.[0]?.content?.parts?.find((p: { inlineData?: unknown }) => p.inlineData);
  const inlineData = imagePart?.inlineData as { mimeType?: string; data?: string } | undefined;
  if (!inlineData?.data) {
    throw new Error("画像が生成されませんでした。プロンプトを変えて再度お試しください。");
  }

  return { base64: inlineData.data, mimeType: inlineData.mimeType ?? "image/png", providerLabel: "Google (Nano Banana)" };
}

// OpenRouter has no dedicated images endpoint at all, so it always goes
// through its chat-completions API with an image-output-capable model.
async function tryOpenRouter(prompt: string, apiKey: string): Promise<ImageGenResult> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
    signal: AbortSignal.timeout(90000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouterでの画像生成に失敗しました (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const imageUrl: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imageUrl) {
    throw new Error("画像が生成されませんでした。プロンプトを変えて再度お試しください。");
  }

  const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("生成された画像データの形式が不正でした。");
  }

  return { base64: match[2], mimeType: match[1], providerLabel: "OpenRouter (Gemini 2.5 Flash Image)" };
}

// Tries every configured provider in priority order and falls through to
// the next on failure — a provider being unavailable (deprecated model,
// billing not enabled, quota exhausted) shouldn't block a different
// provider that's actually working. Only throws once every option has been
// exhausted, combining what each one reported.
export async function generateChatImage(opts: {
  prompt: string;
  openaiKey?: string | null;
  googleKey?: string | null;
  openrouterKey?: string | null;
}): Promise<ImageGenResult> {
  const attempts: { label: string; key: string | null | undefined; run: (prompt: string, key: string) => Promise<ImageGenResult> }[] = [
    { label: "OpenAI", key: opts.openaiKey, run: tryOpenAI },
    { label: "Google", key: opts.googleKey, run: tryGoogle },
    { label: "OpenRouter", key: opts.openrouterKey, run: tryOpenRouter },
  ];

  const errors: string[] = [];
  let attempted = false;

  for (const attempt of attempts) {
    if (!attempt.key) continue;
    attempted = true;
    try {
      return await attempt.run(opts.prompt, attempt.key);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ReinAI image generation] ${attempt.label} failed`, err);
      errors.push(`${attempt.label}: ${message}`);
    }
  }

  if (!attempted) {
    throw new Error("画像生成にはOpenAI・Google・OpenRouterのいずれかのAPIキーが必要です。設定 > APIキー から登録してください。");
  }

  throw new Error(`画像生成に失敗しました。\n${errors.join("\n")}`);
}
