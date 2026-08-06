import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listDirectory, readFile } from "./ipc/fs.js";
import { getSettings, setProviderAndModel, setApiKey } from "./ipc/settings.js";
import { runAgent } from "./ipc/agent.js";
import { loadConversation, saveConversation } from "./ipc/persistence.js";
import type { AiProviderId, ChatMessage } from "../shared/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let currentAgentController: AbortController | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "ReinAI Code",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("project:openFolder", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle("fs:listDirectory", async (_event, root: string, relPath: string) => {
  return listDirectory(root, relPath);
});

ipcMain.handle("fs:readFile", async (_event, root: string, relPath: string) => {
  return readFile(root, relPath);
});

ipcMain.handle("settings:get", async () => {
  return getSettings();
});

ipcMain.handle("settings:setProviderModel", async (_event, provider: AiProviderId, model: string) => {
  setProviderAndModel(provider, model);
});

ipcMain.handle("settings:setApiKey", async (_event, provider: AiProviderId, apiKey: string) => {
  setApiKey(provider, apiKey);
});

ipcMain.on(
  "agent:send",
  async (event, payload: { projectRoot: string; provider: AiProviderId; model: string; conversation: ChatMessage[] }) => {
    currentAgentController?.abort();
    currentAgentController = new AbortController();

    const signal = currentAgentController.signal;
    for await (const agentEvent of runAgent(payload.projectRoot, payload.provider, payload.model, payload.conversation, signal)) {
      if (signal.aborted) break;
      event.sender.send("agent:event", agentEvent);
    }
  }
);

ipcMain.on("agent:stop", () => {
  currentAgentController?.abort();
});

ipcMain.handle("conversation:load", async (_event, projectRoot: string) => {
  return loadConversation(projectRoot);
});

ipcMain.handle("conversation:save", async (_event, projectRoot: string, conversation: ChatMessage[]) => {
  saveConversation(projectRoot, conversation);
});
