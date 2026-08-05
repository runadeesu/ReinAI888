"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AI_PROVIDERS, type AiProviderId } from "@/lib/ai/models";

interface ApiKeyRow {
  id: string;
  provider: string;
  label: string | null;
  lastFour: string;
  updatedAt: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [provider, setProvider] = useState<AiProviderId>("anthropic");
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/account/api-keys");
    const data = await res.json();
    setKeys(data.keys ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    if (!key.trim()) return;
    const res = await fetch("/api/account/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, key, label: label || undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      setKey("");
      setLabel("");
      setMessage("保存しました");
      load();
    } else {
      setMessage(data.error);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/account/api-keys/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">APIキー</h2>
      <p className="text-sm text-[var(--muted)]">
        各プロバイダーのAPIキーを登録すると、そのキーがチャットで優先的に使用されます。未登録の場合はサーバー既定のキー（設定されている場合）が使用されます。キーはAES-256-GCMで暗号化して保存されます。
      </p>

      <div className="space-y-3 rounded-xl border border-[var(--border)] p-4">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as AiProviderId)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        >
          {Object.values(AI_PROVIDERS).map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <Input placeholder="APIキー" type="password" value={key} onChange={(e) => setKey(e.target.value)} />
        <Input placeholder="ラベル（任意）" value={label} onChange={(e) => setLabel(e.target.value)} />
        {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
        <Button size="sm" onClick={handleSave}>
          保存
        </Button>
      </div>

      <div className="space-y-2">
        {keys.map((k) => (
          <div key={k.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
            <div>
              <p className="text-sm font-medium">{AI_PROVIDERS[k.provider as AiProviderId]?.label ?? k.provider}</p>
              <p className="text-xs text-[var(--muted)]">
                {k.label ? `${k.label} · ` : ""}****{k.lastFour}
              </p>
            </div>
            <button onClick={() => handleDelete(k.id)} className="text-[var(--danger)]">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {keys.length === 0 && <p className="text-sm text-[var(--muted)]">登録されたAPIキーはありません</p>}
      </div>
    </div>
  );
}
