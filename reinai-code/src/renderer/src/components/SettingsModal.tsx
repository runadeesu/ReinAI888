import { useState } from "react";
import { PROVIDERS } from "../../../shared/types";
import type { AiProviderId, Settings } from "../../../shared/types";

interface SettingsModalProps {
  settings: Settings;
  onClose: () => void;
  onSaved: (settings: Settings) => void;
}

export function SettingsModal({ settings, onClose, onSaved }: SettingsModalProps) {
  const [provider, setProvider] = useState<AiProviderId>(settings.provider);
  const [model, setModel] = useState(settings.model);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  const providerInfo = PROVIDERS.find((p) => p.id === provider)!;

  async function handleSave() {
    setSaving(true);
    await window.reinai.setProviderAndModel(provider, model);
    if (apiKey.trim()) {
      await window.reinai.setApiKey(provider, apiKey.trim());
    }
    const updated = await window.reinai.getSettings();
    setSaving(false);
    onSaved(updated);
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 20,
        }}
      >
        <h2 style={{ margin: "0 0 16px", fontSize: 16 }}>設定</h2>

        <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>プロバイダー</label>
        <select
          value={provider}
          onChange={(e) => {
            const next = e.target.value as AiProviderId;
            setProvider(next);
            setModel(PROVIDERS.find((p) => p.id === next)!.models[0].id);
          }}
          style={{
            width: "100%",
            padding: 8,
            marginBottom: 12,
            background: "var(--background)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--foreground)",
          }}
        >
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>モデル</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          style={{
            width: "100%",
            padding: 8,
            marginBottom: 12,
            background: "var(--background)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--foreground)",
          }}
        >
          {providerInfo.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>

        <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
          APIキー {settings.provider === provider && settings.hasApiKey && "(登録済み・変更する場合のみ入力)"}
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="APIキーを入力"
          style={{
            width: "100%",
            padding: 8,
            marginBottom: 16,
            background: "var(--background)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--foreground)",
          }}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 14px", color: "var(--foreground)" }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ background: "var(--primary)", border: "none", borderRadius: 8, padding: "6px 14px", color: "#fff" }}
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
