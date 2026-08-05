export type AiProviderId = "anthropic" | "openai" | "google";

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
