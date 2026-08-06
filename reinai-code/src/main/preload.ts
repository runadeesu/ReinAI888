import { contextBridge, ipcRenderer } from "electron";

// Preload scripts are loaded by Electron's own sandboxed loader (not
// Node's normal module resolution), so this is compiled as a fully
// self-contained CommonJS file via tsconfig.preload.json — it deliberately
// does not import from ../shared/types.ts to avoid pulling that file (and
// its ESM-targeted compile) into this separate CJS build.
type AiProviderId = "anthropic" | "openai" | "google" | "nvidia" | "openrouter";
interface FileEntry {
  name: string;
  relPath: string;
  isDirectory: boolean;
}
interface Settings {
  provider: AiProviderId;
  model: string;
  hasApiKey: boolean;
}
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}
type AgentEvent =
  | { type: "text-delta"; text: string }
  | { type: "tool-call"; toolName: string; args: Record<string, unknown> }
  | { type: "tool-result"; toolName: string; result: string }
  | { type: "file-diff"; path: string; before: string; after: string }
  | { type: "done" }
  | { type: "error"; message: string };

const api = {
  openProjectFolder: (): Promise<string | null> => ipcRenderer.invoke("project:openFolder"),
  listDirectory: (root: string, relPath: string): Promise<FileEntry[]> =>
    ipcRenderer.invoke("fs:listDirectory", root, relPath),
  readFile: (root: string, relPath: string): Promise<string> => ipcRenderer.invoke("fs:readFile", root, relPath),
  getSettings: (): Promise<Settings> => ipcRenderer.invoke("settings:get"),
  setProviderAndModel: (provider: AiProviderId, model: string): Promise<void> =>
    ipcRenderer.invoke("settings:setProviderModel", provider, model),
  setApiKey: (provider: AiProviderId, apiKey: string): Promise<void> =>
    ipcRenderer.invoke("settings:setApiKey", provider, apiKey),
  sendMessage: (payload: {
    projectRoot: string;
    provider: AiProviderId;
    model: string;
    conversation: ChatMessage[];
  }): void => {
    ipcRenderer.send("agent:send", payload);
  },
  stopAgent: (): void => {
    ipcRenderer.send("agent:stop");
  },
  onAgentEvent: (callback: (event: AgentEvent) => void): (() => void) => {
    const listener = (_electronEvent: unknown, agentEvent: AgentEvent) => callback(agentEvent);
    ipcRenderer.on("agent:event", listener);
    return () => ipcRenderer.removeListener("agent:event", listener);
  },
  loadConversation: (projectRoot: string): Promise<ChatMessage[]> =>
    ipcRenderer.invoke("conversation:load", projectRoot),
  saveConversation: (projectRoot: string, conversation: ChatMessage[]): Promise<void> =>
    ipcRenderer.invoke("conversation:save", projectRoot, conversation),
};

contextBridge.exposeInMainWorld("reinai", api);

export type ReinaiApi = typeof api;
