"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutGrid, List, Search, Pin, Star, Archive, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { tagColor } from "@/lib/utils/tag-color";
import type { ConversationSummary } from "@/types/api";

type ViewMode = "grid" | "list";

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [view, setView] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("reinai-conversations-view") as ViewMode | null;
    if (stored) setView(stored);
  }, []);

  function setViewMode(mode: ViewMode) {
    setView(mode);
    localStorage.setItem("reinai-conversations-view", mode);
  }

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (showArchived) params.set("archived", "true");
    const timeout = setTimeout(() => {
      fetch(`/api/conversations?${params.toString()}`)
        .then((r) => r.json())
        .then((d) => setConversations(d.conversations ?? []));
    }, 200);
    return () => clearTimeout(timeout);
  }, [search, showArchived]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
        <h1 className="text-lg font-semibold">すべての会話</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs",
              showArchived ? "bg-[var(--surface-hover)]" : ""
            )}
          >
            <Archive size={13} />
            アーカイブ済み
          </button>
          <div className="flex overflow-hidden rounded-lg border border-[var(--border)]">
            <button
              onClick={() => setViewMode("grid")}
              className={cn("p-1.5", view === "grid" ? "bg-[var(--surface-hover)]" : "")}
              aria-label="グリッド表示"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-1.5", view === "list" ? "bg-[var(--surface-hover)]" : "")}
              aria-label="リスト表示"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-[var(--border)] px-6 py-3">
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="会話を検索"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-1.5 pl-8 pr-2 text-sm outline-none focus:border-[var(--primary)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {conversations.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            {showArchived ? "アーカイブされた会話はありません" : "会話はまだありません"}
          </p>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {conversations.map((c) => (
              <ConversationCard key={c.id} conversation={c} />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((c) => (
              <ConversationRow key={c.id} conversation={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TagChips({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {tags.map((t) => {
        const color = tagColor(t);
        return (
          <span key={t} className="rounded px-1.5 py-0 text-[10px] leading-4" style={{ background: color.bg, color: color.fg }}>
            {t}
          </span>
        );
      })}
    </div>
  );
}

function ConversationCard({ conversation: c }: { conversation: ConversationSummary }) {
  const tags: string[] = JSON.parse(c.tags || "[]");
  return (
    <Link
      href={`/chat/${c.id}`}
      className="flex flex-col rounded-xl border border-[var(--border)] p-4 hover:border-[var(--primary)]"
    >
      <div className="flex items-start justify-between gap-2">
        <MessageSquare size={16} className="mt-0.5 shrink-0 text-[var(--muted)]" />
        <div className="flex shrink-0 gap-1">
          {c.isPinned && <Pin size={12} className="fill-current text-[var(--muted)]" />}
          {c.isFavorite && <Star size={12} className="fill-current text-yellow-500" />}
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium">{c.title}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{c.provider} · {c.model}</p>
      <TagChips tags={tags} />
      <p className="mt-auto pt-3 text-[10px] text-[var(--muted)]">
        {new Date(c.updatedAt).toLocaleDateString("ja-JP")}
      </p>
    </Link>
  );
}

function ConversationRow({ conversation: c }: { conversation: ConversationSummary }) {
  const tags: string[] = JSON.parse(c.tags || "[]");
  return (
    <Link
      href={`/chat/${c.id}`}
      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[var(--surface-hover)]"
    >
      <MessageSquare size={15} className="shrink-0 text-[var(--muted)]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm">{c.title}</p>
          {c.isPinned && <Pin size={11} className="fill-current shrink-0 text-[var(--muted)]" />}
          {c.isFavorite && <Star size={11} className="fill-current shrink-0 text-yellow-500" />}
        </div>
        <TagChips tags={tags} />
      </div>
      <span className="shrink-0 text-xs text-[var(--muted)]">{c.provider} · {c.model}</span>
      <span className="w-20 shrink-0 text-right text-[10px] text-[var(--muted)]">
        {new Date(c.updatedAt).toLocaleDateString("ja-JP")}
      </span>
    </Link>
  );
}
