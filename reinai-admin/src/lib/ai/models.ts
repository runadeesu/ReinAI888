// Copied from the main ReinAI app's src/lib/ai/models.ts (static registry,
// no runtime coupling) — used here only to show provider/model counts and
// env var names on the providers status page.
export type AiProviderId = "anthropic" | "openai" | "google" | "nvidia" | "openrouter";

export interface AiModel {
  id: string;
  label: string;
  description: string;
  contextWindow: number;
  vision: boolean;
  goodFor: string[];
}

export interface AiProviderInfo {
  id: AiProviderId;
  label: string;
  envVar: string;
  models: AiModel[];
}

// Central model registry. Add/remove providers or models here — everything
// downstream (chat UI selector, streaming route, cost/usage) reads from it.
export const AI_PROVIDERS: Record<AiProviderId, AiProviderInfo> = {
  openrouter: {
    id: "openrouter",
    label: "OpenRouter (無料)",
    envVar: "OPENROUTER_API_KEY",
    models: [
      {
        id: "openai/gpt-oss-20b:free",
        label: "GPT-OSS 20B (無料)",
        description: "OpenAI製オープンウェイトモデル。無料枠で汎用チャット・コード生成に。",
        contextWindow: 131072,
        vision: false,
        goodFor: ["coding", "chat", "general"],
      },
      {
        id: "google/gemma-4-31b-it:free",
        label: "Gemma 4 31B (無料)",
        description: "Google製マルチモーダルモデル。無料枠で画像入力にも対応。",
        contextWindow: 262144,
        vision: true,
        goodFor: ["multimodal", "chat", "general"],
      },
      {
        id: "nvidia/nemotron-3-super-120b-a12b:free",
        label: "Nemotron 3 Super 120B (無料)",
        description: "NVIDIA製の大規模MoEモデル。無料枠で複雑な推論タスクに。",
        contextWindow: 262144,
        vision: false,
        goodFor: ["reasoning", "complex-reasoning"],
      },
      {
        id: "inclusionai/ling-3.0-flash:free",
        label: "Ling 3.0 Flash (無料)",
        description: "軽量・高速なMoEモデル。無料枠で低レイテンシな応答に。",
        contextWindow: 262144,
        vision: false,
        goodFor: ["speed", "chat", "simple-tasks"],
      },
    ],
  },
  nvidia: {
    id: "nvidia",
    label: "NVIDIA NIM",
    envVar: "NVIDIA_API_KEY",
    models: [
      {
        id: "meta/llama-3.1-8b-instruct",
        label: "Llama 3.1 8B Instruct",
        description: "軽量・高速。低レイテンシで応答するモデル。簡単な質問やチャットに。",
        contextWindow: 128000,
        vision: false,
        goodFor: ["speed", "chat", "simple-tasks"],
      },
      {
        id: "meta/llama-3.1-70b-instruct",
        label: "Llama 3.1 70B Instruct",
        description: "バランス型モデル。汎用チャット・コード生成に。",
        contextWindow: 128000,
        vision: false,
        goodFor: ["coding", "chat", "general"],
      },
      {
        id: "mistralai/mistral-nemotron",
        label: "Mistral Nemotron",
        description: "NVIDIAチューニング版Mistral。高速・低コストな応答。",
        contextWindow: 128000,
        vision: false,
        goodFor: ["speed", "simple-tasks"],
      },
      {
        id: "deepseek-ai/deepseek-v4-flash",
        label: "DeepSeek V4 Flash",
        description: "推論特化モデル。アルゴリズム設計やデバッグ、段階的思考が必要なタスクに強い。",
        contextWindow: 128000,
        vision: false,
        goodFor: ["reasoning", "debugging"],
      },
      {
        id: "meta/llama-3.3-70b-instruct",
        label: "Llama 3.3 70B Instruct",
        description: "Llama 3.1 70Bの改良版。汎用チャット・コード生成に。",
        contextWindow: 128000,
        vision: false,
        goodFor: ["coding", "chat", "general"],
      },
      {
        id: "meta/llama-3.2-11b-vision-instruct",
        label: "Llama 3.2 11B Vision",
        description: "画像入力に対応した軽量モデル。画像の説明・読み取りに。",
        contextWindow: 128000,
        vision: true,
        goodFor: ["multimodal", "chat"],
      },
      {
        id: "meta/llama-3.2-90b-vision-instruct",
        label: "Llama 3.2 90B Vision",
        description: "画像入力に対応した大規模モデル。高精度な画像理解タスクに。",
        contextWindow: 128000,
        vision: true,
        goodFor: ["multimodal", "complex-reasoning"],
      },
      {
        id: "nvidia/llama-3.3-nemotron-super-49b-v1",
        label: "Nemotron Super 49B v1",
        description: "NVIDIAチューニング版Llama。バランス型で複雑な指示にも対応。",
        contextWindow: 128000,
        vision: false,
        goodFor: ["reasoning", "coding", "general"],
      },
      {
        id: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
        label: "Nemotron Super 49B v1.5",
        description: "Nemotron Super 49Bの改良版。より高精度な推論に。",
        contextWindow: 128000,
        vision: false,
        goodFor: ["reasoning", "coding", "general"],
      },
      {
        id: "nvidia/llama-3.1-nemotron-nano-vl-8b-v1",
        label: "Nemotron Nano VL 8B",
        description: "軽量な画像対応モデル。高速な画像読み取りタスクに。",
        contextWindow: 128000,
        vision: true,
        goodFor: ["multimodal", "speed"],
      },
      {
        id: "nvidia/nemotron-nano-12b-v2-vl",
        label: "Nemotron Nano 12B v2 VL",
        description: "画像対応の中規模モデル。図表やスクリーンショットの解析に。",
        contextWindow: 128000,
        vision: true,
        goodFor: ["multimodal", "chat"],
      },
      {
        id: "nvidia/nemotron-3-nano-30b-a3b",
        label: "Nemotron 3 Nano 30B",
        description: "NVIDIA製の軽量MoEモデル。低レイテンシな応答に。",
        contextWindow: 256000,
        vision: false,
        goodFor: ["speed", "chat"],
      },
      {
        id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
        label: "Nemotron 3 Nano Omni Reasoning",
        description: "推論特化のNVIDIA製モデル。段階的思考が必要なタスクに。",
        contextWindow: 256000,
        vision: false,
        goodFor: ["reasoning", "debugging"],
      },
      {
        id: "nvidia/nemotron-3-super-120b-a12b",
        label: "Nemotron 3 Super 120B",
        description: "NVIDIA製の大規模MoEモデル。複雑な設計・分析タスクに。",
        contextWindow: 262144,
        vision: false,
        goodFor: ["complex-reasoning", "architecture"],
      },
      {
        id: "nvidia/nemotron-3-ultra-550b-a55b",
        label: "Nemotron 3 Ultra 550B",
        description: "NVIDIA最大級のMoEモデル。最高精度が必要な複雑タスクに。",
        contextWindow: 1000000,
        vision: false,
        goodFor: ["complex-reasoning", "architecture", "long-context"],
      },
      {
        id: "nvidia/nemotron-mini-4b-instruct",
        label: "Nemotron Mini 4B",
        description: "超軽量モデル。簡単な質問への即応向け。",
        contextWindow: 4096,
        vision: false,
        goodFor: ["speed", "simple-tasks"],
      },
      {
        id: "nvidia/nvidia-nemotron-nano-9b-v2",
        label: "Nemotron Nano 9B v2",
        description: "軽量・高速なチャットモデル。日常会話やコード補完に。",
        contextWindow: 128000,
        vision: false,
        goodFor: ["speed", "chat", "autocomplete"],
      },
      {
        id: "minimaxai/minimax-m3",
        label: "MiniMax M3",
        description: "汎用チャット・長文コンテキストに強いモデル。",
        contextWindow: 128000,
        vision: false,
        goodFor: ["chat", "general", "long-context"],
      },
      {
        id: "openai/gpt-oss-20b",
        label: "GPT-OSS 20B",
        description: "OpenAI製オープンウェイトモデル。汎用チャット・コード生成に。",
        contextWindow: 131072,
        vision: false,
        goodFor: ["coding", "chat", "general"],
      },
      {
        id: "z-ai/glm-5.2",
        label: "GLM 5.2",
        description: "Zhipu AI製の汎用モデル。多言語チャット・コード生成に。",
        contextWindow: 128000,
        vision: false,
        goodFor: ["coding", "chat", "general"],
      },
      {
        id: "stepfun-ai/step-3.7-flash",
        label: "Step 3.7 Flash",
        description: "StepFun製の高速モデル。低レイテンシな応答に。",
        contextWindow: 128000,
        vision: false,
        goodFor: ["speed", "chat"],
      },
      {
        id: "poolside/laguna-xs-2.1",
        label: "Laguna XS 2.1",
        description: "Poolside製のコーディング特化モデル。",
        contextWindow: 262144,
        vision: false,
        goodFor: ["coding", "debugging"],
      },
      {
        id: "thinkingmachines/inkling",
        label: "Inkling",
        description: "Thinking Machines製の実験的モデル。汎用チャットに。",
        contextWindow: 128000,
        vision: false,
        goodFor: ["chat", "general"],
      },
    ],
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic Claude",
    envVar: "ANTHROPIC_API_KEY",
    models: [
      {
        id: "claude-opus-5",
        label: "Claude Opus 5",
        description: "最高性能。複雑な設計・アーキテクチャ提案・大規模リファクタリングに最適。",
        contextWindow: 200000,
        vision: true,
        goodFor: ["architecture", "refactoring", "complex-reasoning"],
      },
      {
        id: "claude-sonnet-5",
        label: "Claude Sonnet 5",
        description: "バランス型。日常のコード生成・レビュー・チャットに最適。",
        contextWindow: 200000,
        vision: true,
        goodFor: ["coding", "chat", "general"],
      },
      {
        id: "claude-haiku-4-5-20251001",
        label: "Claude Haiku 4.5",
        description: "高速・低コスト。簡単な質問やコード補完向け。",
        contextWindow: 200000,
        vision: true,
        goodFor: ["speed", "autocomplete", "simple-tasks"],
      },
    ],
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    envVar: "OPENAI_API_KEY",
    models: [
      {
        id: "gpt-4.1",
        label: "GPT-4.1",
        description: "高精度な汎用モデル。コード生成・ドキュメント作成に強い。",
        contextWindow: 128000,
        vision: true,
        goodFor: ["coding", "docs", "general"],
      },
      {
        id: "gpt-4o-mini",
        label: "GPT-4o mini",
        description: "軽量・高速。低コストで使えるモデル。",
        contextWindow: 128000,
        vision: true,
        goodFor: ["speed", "simple-tasks"],
      },
      {
        id: "o3-mini",
        label: "o3-mini",
        description: "推論特化モデル。アルゴリズム設計やデバッグに強い。",
        contextWindow: 128000,
        vision: false,
        goodFor: ["reasoning", "debugging"],
      },
    ],
  },
  google: {
    id: "google",
    label: "Google Gemini",
    envVar: "GOOGLE_GENERATIVE_AI_API_KEY",
    models: [
      {
        id: "gemini-2.0-flash",
        label: "Gemini 2.0 Flash",
        description: "高速マルチモーダルモデル。画像・動画の理解に強い。",
        contextWindow: 1000000,
        vision: true,
        goodFor: ["speed", "multimodal"],
      },
      {
        id: "gemini-1.5-pro",
        label: "Gemini 1.5 Pro",
        description: "超長文コンテキストが必要なプロジェクト全体解析向け。",
        contextWindow: 2000000,
        vision: true,
        goodFor: ["long-context", "project-analysis"],
      },
    ],
  },
};

export function getModel(provider: string, modelId: string): AiModel | undefined {
  const p = AI_PROVIDERS[provider as AiProviderId];
  return p?.models.find((m) => m.id === modelId);
}

export function listAllProviders(): AiProviderInfo[] {
  return Object.values(AI_PROVIDERS);
}
