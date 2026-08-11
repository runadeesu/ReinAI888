"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Star, Trash2, Download, Upload, Copy, X, MessageSquarePlus, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const VAR_PATTERN = /\{\{\s*([a-zA-Z0-9_.\-ぁ-んァ-ヶ一-龠]+)\s*\}\}/g;

function extractVariables(content: string): string[] {
  const names = new Set<string>();
  for (const match of content.matchAll(VAR_PATTERN)) {
    names.add(match[1]);
  }
  return [...names];
}

function fillVariables(content: string, values: Record<string, string>): string {
  return content.replace(VAR_PATTERN, (_, name) => (values[name] ?? "").trim() || `{{${name}}}`);
}

interface Category {
  id: string;
  name: string;
}

interface Prompt {
  id: string;
  title: string;
  content: string;
  isFavorite: boolean;
  categoryId: string | null;
  category: Category | null;
}

export default function PromptsPage() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [usingPrompt, setUsingPrompt] = useState<Prompt | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (activeCategory) params.set("categoryId", activeCategory);
    const [pRes, cRes] = await Promise.all([
      fetch(`/api/prompts?${params.toString()}`),
      fetch("/api/prompt-categories"),
    ]);
    setPrompts((await pRes.json()).prompts ?? []);
    setCategories((await cRes.json()).categories ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  async function handleDelete(id: string) {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/prompts/${id}`, { method: "DELETE" });
    load();
  }

  async function handleToggleFavorite(p: Prompt) {
    await fetch(`/api/prompts/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: !p.isFavorite }),
    });
    load();
  }

  async function startChatWithContent(content: string) {
    const provider = localStorage.getItem("reinai-last-provider") || undefined;
    const model = localStorage.getItem("reinai-last-model") || undefined;
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, model }),
    });
    const data = await res.json();
    const conversationId = data.conversation.id;
    sessionStorage.setItem(`reinai-draft-${conversationId}`, content);
    router.push(`/chat/${conversationId}`);
  }

  function handleUse(p: Prompt) {
    if (extractVariables(p.content).length > 0) {
      setUsingPrompt(p);
    } else {
      startChatWithContent(p.content);
    }
  }

  async function handleExport() {
    window.open("/api/prompts/export", "_blank");
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const json = JSON.parse(text);
      await fetch("/api/prompts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      load();
    } catch {
      alert("ファイルの読み込みに失敗しました");
    }
    e.target.value = "";
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
        <h1 className="text-lg font-semibold">プロンプトテンプレート</h1>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <Button variant="secondary" size="sm" type="button" onClick={(e) => (e.currentTarget.nextElementSibling as HTMLInputElement)?.click()}>
              <Upload size={14} /> インポート
            </Button>
            <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
          </label>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download size={14} /> エクスポート
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            <Plus size={14} /> 新規作成
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 shrink-0 overflow-y-auto border-r border-[var(--border)] p-3">
          <button
            onClick={() => setActiveCategory(null)}
            className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm ${!activeCategory ? "bg-[var(--surface-hover)]" : "hover:bg-[var(--surface-hover)]"}`}
          >
            すべて
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`block w-full truncate rounded-lg px-3 py-1.5 text-left text-sm ${activeCategory === c.id ? "bg-[var(--surface-hover)]" : "hover:bg-[var(--surface-hover)]"}`}
            >
              {c.name}
            </button>
          ))}
          <NewCategoryButton onCreated={load} />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {prompts.map((p) => (
              <div key={p.id} className="rounded-xl border border-[var(--border)] p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium">{p.title}</h3>
                  <button onClick={() => handleToggleFavorite(p)}>
                    <Star size={16} className={p.isFavorite ? "fill-current text-yellow-500" : "text-[var(--muted)]"} />
                  </button>
                </div>
                <p className="mt-1 line-clamp-3 text-xs text-[var(--muted)]">{p.content}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => handleUse(p)}>
                    <MessageSquarePlus size={12} /> 使用
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigator.clipboard.writeText(p.content)}
                  >
                    <Copy size={12} /> コピー
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditing(p);
                      setShowForm(true);
                    }}
                  >
                    編集
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {prompts.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <BookMarked size={28} className="text-[var(--muted)]" />
              <p className="text-sm text-[var(--muted)]">プロンプトはまだありません</p>
              <p className="text-xs text-[var(--muted)]">「新規作成」からよく使うプロンプトを保存しましょう</p>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <PromptForm
          prompt={editing}
          categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {usingPrompt && (
        <VariableFillModal
          prompt={usingPrompt}
          onClose={() => setUsingPrompt(null)}
          onSubmit={(filled) => {
            setUsingPrompt(null);
            startChatWithContent(filled);
          }}
        />
      )}
    </div>
  );
}

function VariableFillModal({
  prompt,
  onClose,
  onSubmit,
}: {
  prompt: Prompt;
  onClose: () => void;
  onSubmit: (filled: string) => void;
}) {
  const variables = extractVariables(prompt.content);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(variables.map((v) => [v, ""]))
  );

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">変数を入力 — {prompt.title}</h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="max-h-80 space-y-3 overflow-y-auto">
          {variables.map((v) => (
            <div key={v} className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted)]">{v}</label>
              <Input
                autoFocus={variables[0] === v}
                value={values[v] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [v]: e.target.value }))}
                placeholder={`{{${v}}}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={() => onSubmit(fillVariables(prompt.content, values))}>チャットで使用</Button>
        </div>
      </div>
    </div>
  );
}

function NewCategoryButton({ onCreated }: { onCreated: () => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  if (!adding) {
    return (
      <button onClick={() => setAdding(true)} className="mt-2 flex items-center gap-1 px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)]">
        <Plus size={12} /> カテゴリー追加
      </button>
    );
  }

  return (
    <div className="mt-2 flex gap-1 px-1">
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={async (e) => {
          if (e.key === "Enter" && name.trim()) {
            await fetch("/api/prompt-categories", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: name.trim() }),
            });
            setName("");
            setAdding(false);
            onCreated();
          }
        }}
        className="h-7 text-xs"
      />
    </div>
  );
}

function PromptForm({
  prompt,
  categories,
  onClose,
  onSaved,
}: {
  prompt: Prompt | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(prompt?.title ?? "");
  const [content, setContent] = useState(prompt?.content ?? "");
  const [categoryId, setCategoryId] = useState(prompt?.categoryId ?? "");

  async function handleSave() {
    if (!title.trim() || !content.trim()) return;
    const body = JSON.stringify({ title, content, categoryId: categoryId || null });
    if (prompt) {
      await fetch(`/api/prompts/${prompt.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body });
    } else {
      await fetch("/api/prompts", { method: "POST", headers: { "Content-Type": "application/json" }, body });
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">{prompt ? "プロンプトを編集" : "新規プロンプト"}</h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <Input placeholder="タイトル" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          >
            <option value="">カテゴリーなし</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <textarea
            placeholder="プロンプト内容"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </div>
      </div>
    </div>
  );
}
