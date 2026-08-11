"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, BookMarked, Settings, Sun, Moon, MessageSquare } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

interface ConversationHit {
  id: string;
  title: string;
}

interface StaticAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  run: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const { toggleTheme, theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ConversationHit[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHits([]);
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        close();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [close]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open || !query.trim()) {
      setHits([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/conversations?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => setHits((d.conversations ?? []).slice(0, 6)));
    }, 200);
    return () => clearTimeout(timeout);
  }, [query, open]);

  const staticActions: StaticAction[] = [
    {
      id: "new-chat",
      label: "新規チャットを開始",
      icon: <Plus size={15} />,
      run: () => router.push("/chat"),
    },
    {
      id: "prompts",
      label: "プロンプトテンプレートを開く",
      icon: <BookMarked size={15} />,
      run: () => router.push("/prompts"),
    },
    {
      id: "settings",
      label: "設定を開く",
      icon: <Settings size={15} />,
      run: () => router.push("/settings/profile"),
    },
    {
      id: "theme",
      label: theme === "dark" ? "ライトモードに切替" : "ダークモードに切替",
      icon: theme === "dark" ? <Sun size={15} /> : <Moon size={15} />,
      run: toggleTheme,
    },
  ];

  const filteredActions = query.trim()
    ? staticActions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : staticActions;

  const items: { key: string; label: string; icon: React.ReactNode; run: () => void }[] = [
    ...filteredActions.map((a) => ({ key: a.id, label: a.label, icon: a.icon, run: a.run })),
    ...hits.map((h) => ({
      key: h.id,
      label: h.title,
      icon: <MessageSquare size={15} />,
      run: () => router.push(`/chat/${h.id}`),
    })),
  ];

  function runItem(index: number) {
    const item = items[index];
    if (!item) return;
    item.run();
    close();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24" onClick={close}>
      <div
        className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
          <Search size={16} className="text-[var(--muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, items.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                runItem(activeIndex);
              }
            }}
            placeholder="コマンドを検索、またはチャットを検索..."
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <kbd className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 && <p className="px-3 py-4 text-center text-sm text-[var(--muted)]">結果がありません</p>}
          {items.map((item, i) => (
            <button
              key={item.key}
              onClick={() => runItem(i)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                i === activeIndex ? "bg-[var(--surface-hover)]" : ""
              }`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
