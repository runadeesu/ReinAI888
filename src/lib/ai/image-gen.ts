export interface ImageGenResult {
  base64: string;
  mimeType: string;
  providerLabel: string;
}

// Real image generation, in priority order: OpenAI and Google both expose a
// dedicated Images API the AI SDK wraps directly; OpenRouter has no such
// endpoint of its own, so we go through its normal chat-completions API with
// an image-output-capable model (Gemini "Nano Banana") and read the base64
// image back out of the response instead.
export async function generateChatImage(opts: {
  prompt: string;
  openaiKey?: string | null;
  googleKey?: string | null;
  openrouterKey?: string | null;
}): Promise<ImageGenResult> {
  if (opts.openaiKey) {
    const { generateImage } = await import("ai");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const openai = createOpenAI({ apiKey: opts.openaiKey });
    const result = await generateImage({ model: openai.image("gpt-image-1"), prompt: opts.prompt });
    return { base64: result.image.base64, mimeType: result.image.mediaType, providerLabel: "OpenAI (gpt-image-1)" };
  }

  if (opts.googleKey) {
    const { generateImage } = await import("ai");
    const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
    const google = createGoogleGenerativeAI({ apiKey: opts.googleKey });
    const result = await generateImage({ model: google.image("imagen-4.0-generate-001"), prompt: opts.prompt });
    return { base64: result.image.base64, mimeType: result.image.mediaType, providerLabel: "Google (Imagen 4)" };
  }

  if (opts.openrouterKey) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.openrouterKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: opts.prompt }],
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

  throw new Error("画像生成にはOpenAI・Google・OpenRouterのいずれかのAPIキーが必要です。設定 > APIキー から登録してください。");
}
