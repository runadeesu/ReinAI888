import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import type { AiProviderId } from "../shared/types.js";

export function getLanguageModel(provider: AiProviderId, modelId: string, apiKey: string): LanguageModel {
  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey })(modelId);
    case "openai":
      return createOpenAI({ apiKey })(modelId);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(modelId);
    case "nvidia":
      return createOpenAI({ apiKey, baseURL: "https://integrate.api.nvidia.com/v1" }).chat(modelId);
    case "openrouter":
      return createOpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1" }).chat(modelId);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}
