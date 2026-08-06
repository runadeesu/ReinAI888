export type AiProviderId = "anthropic" | "openai" | "google" | "nvidia" | "openrouter";

export interface ProviderInfo {
  id: AiProviderId;
  label: string;
  models: { id: string; label: string }[];
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "anthropic",
    label: "Anthropic Claude",
    models: [
      { id: "claude-opus-5", label: "Claude Opus 5" },
      { id: "claude-sonnet-5", label: "Claude Sonnet 5" },
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    models: [
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
      { id: "o3-mini", label: "o3-mini" },
    ],
  },
  {
    id: "google",
    label: "Google Gemini",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    ],
  },
  {
    id: "nvidia",
    label: "NVIDIA NIM",
    models: [
      { id: "meta/llama-3.3-70b-instruct", label: "Llama 3.3 70B Instruct" },
      { id: "meta/llama-3.1-70b-instruct", label: "Llama 3.1 70B Instruct" },
      { id: "deepseek-ai/deepseek-v4-flash", label: "DeepSeek V4 Flash" },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter (無料)",
    models: [
      { id: "openai/gpt-oss-20b:free", label: "GPT-OSS 20B (無料)" },
      { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super 120B (無料)" },
    ],
  },
];

export interface Settings {
  provider: AiProviderId;
  model: string;
  hasApiKey: boolean;
}

export interface FileEntry {
  name: string;
  relPath: string;
  isDirectory: boolean;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

export type AgentEvent =
  | { type: "text-delta"; text: string }
  | { type: "tool-call"; toolName: string; args: Record<string, unknown> }
  | { type: "tool-result"; toolName: string; result: string }
  | { type: "file-diff"; path: string; before: string; after: string }
  | { type: "done" }
  | { type: "error"; message: string };
