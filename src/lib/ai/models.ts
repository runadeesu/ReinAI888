export type AiProviderId = "anthropic" | "openai" | "google" | "nvidia";

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
  nvidia: {
    id: "nvidia",
    label: "NVIDIA NIM",
    envVar: "NVIDIA_API_KEY",
    models: [
      {
        id: "meta/llama-3.3-70b-instruct",
        label: "Llama 3.3 70B Instruct",
        description: "NVIDIA NIM上で高速推論されるバランス型モデル。汎用チャット・コード生成に。",
        contextWindow: 128000,
        vision: false,
        goodFor: ["coding", "chat", "general"],
      },
      {
        id: "meta/llama-3.1-405b-instruct",
        label: "Llama 3.1 405B Instruct",
        description: "大規模パラメータの高精度モデル。複雑な設計・アーキテクチャ提案に。",
        contextWindow: 128000,
        vision: false,
        goodFor: ["architecture", "complex-reasoning"],
      },
      {
        id: "nvidia/llama-3.1-nemotron-70b-instruct",
        label: "Nemotron 70B Instruct",
        description: "NVIDIAが対話・指示追従性能をチューニングしたモデル。",
        contextWindow: 128000,
        vision: false,
        goodFor: ["chat", "instruction-following"],
      },
      {
        id: "deepseek-ai/deepseek-r1",
        label: "DeepSeek R1",
        description: "推論特化モデル。アルゴリズム設計やデバッグ、段階的思考が必要なタスクに強い。",
        contextWindow: 128000,
        vision: false,
        goodFor: ["reasoning", "debugging"],
      },
      {
        id: "mistralai/mixtral-8x22b-instruct-v0.1",
        label: "Mixtral 8x22B Instruct",
        description: "MoEアーキテクチャの高速・低コストモデル。",
        contextWindow: 64000,
        vision: false,
        goodFor: ["speed", "simple-tasks"],
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
