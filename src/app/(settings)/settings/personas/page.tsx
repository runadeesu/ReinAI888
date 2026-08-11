"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Sparkles, History, RotateCcw } from "lucide-react";

interface Persona {
  id: string;
  name: string;
  instructions: string;
  createdAt: string;
}

interface InstructionVersion {
  id: string;
  content: string;
  createdAt: string;
}

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [versions, setVersions] = useState<InstructionVersion[]>([]);
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    fetch("/api/personas")
      .then((r) => r.json())
      .then((d) => setPersonas(d.personas ?? []));
    fetch("/api/instruction-versions")
      .then((r) => r.json())
      .then((d) => setVersions(d.versions ?? []));
  }

  useEffect(load, []);

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(null), 2500);
  }

  async function handleCreate() {
    if (!name.trim() || !instructions.trim()) return;
    setCreating(true);
    const res = await fetch("/api/personas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, instructions }),
    });
    setCreating(false);
    if (res.ok) {
      setName("");
      setInstructions("");
      load();
      flash("ペルソナを作成しました");
    }
  }

  async function handleApply(id: string) {
    const res = await fetch(`/api/personas/${id}`, { method: "POST" });
    if (res.ok) {
      load();
      flash("カスタム指示に適用しました");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("このペルソナを削除しますか?")) return;
    const res = await fetch(`/api/personas/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  async function handleRestore(id: string) {
    const res = await fetch(`/api/instruction-versions/${id}/restore`, { method: "POST" });
    if (res.ok) {
      load();
      flash("以前のカスタム指示を復元しました");
    }
  }

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Sparkles size={18} className="text-[var(--primary)]" />
            ペルソナ
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            名前をつけたカスタム指示のプリセットです。「適用」を押すとプロフィールのカスタム指示が置き換わります(直前の内容は指示履歴に保存されます)。
          </p>
        </div>

        {personas.length > 0 && (
          <ul className="space-y-2">
            {personas.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-[var(--border)] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-[var(--muted)]">{p.instructions}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => handleApply(p.id)}>
                      適用
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 rounded-lg border border-dashed border-[var(--border)] p-3">
          <p className="text-xs font-medium text-[var(--muted)]">新規ペルソナ</p>
          <Input placeholder="名前 (例: 校正モード)" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="指示内容"
            className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
          />
          <Button size="sm" onClick={handleCreate} disabled={creating || !name.trim() || !instructions.trim()}>
            {creating ? "作成中..." : "作成"}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <History size={18} className="text-[var(--primary)]" />
            カスタム指示の履歴
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            カスタム指示を変更するたびに、直前の内容がここに保存されます。最新20件まで表示されます。
          </p>
        </div>

        {versions.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">履歴はまだありません。</p>
        ) : (
          <ul className="space-y-2">
            {versions.map((v) => (
              <li key={v.id} className="rounded-lg border border-[var(--border)] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-[var(--muted)]">
                      {new Date(v.createdAt).toLocaleString("ja-JP")}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs">{v.content}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => handleRestore(v.id)}>
                    <RotateCcw size={13} className="mr-1" />
                    復元
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {message && (
        <p className="fixed bottom-6 right-6 rounded-lg bg-[var(--surface)] px-4 py-2 text-sm shadow-lg border border-[var(--border)]">
          {message}
        </p>
      )}
    </div>
  );
}
