const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const VIDEO_MODEL = "veo-3.1-generate-preview";

// Raw REST calls against Google's Veo API (not the AI SDK's generateVideo
// wrapper) because that wrapper blocks synchronously until the video is
// ready — Veo generation regularly takes minutes, longer than a serverless
// function should hold a single request open. Splitting start/check lets the
// client poll a cheap status endpoint instead. Request/response shapes here
// are copied from @ai-sdk/google's own GoogleVideoModel implementation.
export async function startVideoGeneration(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/models/${VIDEO_MODEL}:predictLongRunning`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: "16:9" },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`動画生成の開始に失敗しました (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  if (!data.name) {
    throw new Error("動画生成のオペレーションIDを取得できませんでした");
  }
  return data.name as string;
}

export interface VideoStatus {
  done: boolean;
  error?: string;
  videoBuffer?: Buffer;
  mimeType?: string;
}

export async function checkVideoGeneration(operationName: string, apiKey: string): Promise<VideoStatus> {
  const res = await fetch(`${BASE_URL}/${operationName}`, {
    headers: { "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`動画生成の状態確認に失敗しました (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  if (!data.done) return { done: false };

  if (data.error) {
    return { done: true, error: data.error.message ?? "動画生成に失敗しました" };
  }

  const uri: string | undefined = data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
  if (!uri) {
    return { done: true, error: "生成された動画が見つかりませんでした" };
  }

  const videoRes = await fetch(`${uri}${uri.includes("?") ? "&" : "?"}key=${apiKey}`, {
    signal: AbortSignal.timeout(60000),
  });
  if (!videoRes.ok) {
    return { done: true, error: `動画ファイルの取得に失敗しました (${videoRes.status})` };
  }

  const buffer = Buffer.from(await videoRes.arrayBuffer());
  return { done: true, videoBuffer: buffer, mimeType: "video/mp4" };
}
