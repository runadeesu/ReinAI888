import type { AgentEvent, AiProviderId, ChatMessage, FileEntry, Settings } from "../../shared/types";

declare global {
  interface Window {
    reinai: {
      openProjectFolder: () => Promise<string | null>;
      listDirectory: (root: string, relPath: string) => Promise<FileEntry[]>;
      readFile: (root: string, relPath: string) => Promise<string>;
      getSettings: () => Promise<Settings>;
      setProviderAndModel: (provider: AiProviderId, model: string) => Promise<void>;
      setApiKey: (provider: AiProviderId, apiKey: string) => Promise<void>;
      sendMessage: (payload: {
        projectRoot: string;
        provider: AiProviderId;
        model: string;
        conversation: ChatMessage[];
      }) => void;
      stopAgent: () => void;
      onAgentEvent: (callback: (event: AgentEvent) => void) => () => void;
    };
  }
}

export {};
