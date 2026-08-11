"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  customInstructions: string | null;
}

export default function ProjectSettingsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        setProject(d.project);
        setName(d.project.name);
        setDescription(d.project.description ?? "");
        setCustomInstructions(d.project.customInstructions ?? "");
      })
      .catch(() => setNotFound(true));
  }, [params.id]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/projects/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, customInstructions }),
    });
    setSaving(false);
    setMessage(res.ok ? "保存しました" : "保存に失敗しました");
  }

  async function handleDelete() {
    if (!confirm(`「${project?.name}」を削除しますか？プロジェクト内の会話は削除されません。`)) return;
    await fetch(`/api/projects/${params.id}`, { method: "DELETE" });
    router.push("/chat");
  }

  if (notFound) {
    return <div className="flex flex-1 items-center justify-center text-sm text-[var(--muted)]">見つかりません</div>;
  }

  if (!project) {
    return <div className="flex flex-1 items-center justify-center text-sm text-[var(--muted)]">読み込み中...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="mx-auto max-w-xl space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft size={14} /> 戻る
        </button>

        <h1 className="text-xl font-semibold">プロジェクト設定</h1>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted)]">名前</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted)]">説明</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted)]">プロジェクト専用のカスタム指示</label>
          <p className="text-xs text-[var(--muted)]">
            設定すると、アカウント全体のカスタム指示の代わりに、このプロジェクト内の会話すべてに適用されます。
          </p>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            rows={5}
            maxLength={4000}
            placeholder="例: このプロジェクトではPythonのコード例のみ使ってください。"
            className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
          />
        </div>

        {message && <p className="text-sm text-[var(--muted)]">{message}</p>}

        <div className="flex items-center justify-between">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
          <button onClick={handleDelete} className="text-sm text-[var(--danger)] hover:underline">
            プロジェクトを削除
          </button>
        </div>
      </div>
    </div>
  );
}
