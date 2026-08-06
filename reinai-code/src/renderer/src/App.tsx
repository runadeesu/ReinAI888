import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { ChatPanel } from "./components/ChatPanel";
import { SettingsModal } from "./components/SettingsModal";
import type { Settings } from "../../shared/types";

export function App() {
  const [projectRoot, setProjectRoot] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    window.reinai.getSettings().then(setSettings);
  }, []);

  async function handleOpenFolder() {
    const folder = await window.reinai.openProjectFolder();
    if (folder) setProjectRoot(folder);
  }

  if (!settings) return null;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <strong>ReinAI Code</strong>
          <button
            onClick={handleOpenFolder}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "4px 10px",
              color: "var(--foreground)",
              fontSize: 12,
            }}
          >
            {projectRoot ? "フォルダを変更" : "プロジェクトフォルダを開く"}
          </button>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "4px 10px",
            color: "var(--foreground)",
            fontSize: 12,
          }}
        >
          設定 ({settings.provider}{settings.hasApiKey ? "" : " ・ APIキー未設定"})
        </button>
      </div>

      {projectRoot ? (
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <Sidebar projectRoot={projectRoot} />
          <ChatPanel projectRoot={projectRoot} provider={settings.provider} model={settings.model} />
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
          プロジェクトフォルダを開いて開始してください
        </div>
      )}

      {showSettings && (
        <SettingsModal settings={settings} onClose={() => setShowSettings(false)} onSaved={setSettings} />
      )}
    </div>
  );
}
