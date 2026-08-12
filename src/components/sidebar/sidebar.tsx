"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Plus,
  Search,
  Pin,
  Star,
  Settings,
  LogOut,
  Sun,
  Moon,
  FolderClosed,
  Folder as FolderIcon,
  MessageSquare,
  Trash2,
  BookMarked,
  X,
  Tag,
  LayoutGrid,
  MessageCircle,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useSidebar } from "@/components/sidebar/sidebar-context";
import { ReinAILogo } from "@/components/brand/logo";
import type { ConversationSummary, FolderItem, ProjectItem } from "@/types/api";
import { cn } from "@/lib/utils/cn";
import { tagColor } from "@/lib/utils/tag-color";

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { isOpen, close } = useSidebar();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const loadConversations = useCallback(async (q?: string, projectId?: string | null) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (projectId) params.set("projectId", projectId);
    const res = await fetch(`/api/conversations?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    fetch("/api/folders").then((r) => r.json()).then((d) => setFolders(d.folders ?? []));
    fetch("/api/projects").then((r) => r.json()).then((d) => setProjects(d.projects ?? []));
  }, [loadConversations]);

  useEffect(() => {
    const timeout = setTimeout(() => loadConversations(search, activeProjectId), 250);
    return () => clearTimeout(timeout);
  }, [search, activeProjectId, loadConversations]);

  async function handleNewChat() {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: activeProjectId }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/chat/${data.conversation.id}`);
      loadConversations(search, activeProjectId);
    }
  }

  async function handleTogglePin(id: string, current: boolean) {
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !current }),
    });
    loadConversations(search, activeProjectId);
  }

  async function handleToggleFavorite(id: string, current: boolean) {
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: !current }),
    });
    loadConversations(search, activeProjectId);
  }

  async function handleDelete(id: string) {
    if (!confirm("この会話を削除しますか？")) return;
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    loadConversations(search, activeProjectId);
    if (pathname === `/chat/${id}`) router.push("/chat");
  }

  async function handleUpdateTags(id: string, tags: string[]) {
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    });
    loadConversations(search, activeProjectId);
  }

  const pinned = conversations.filter((c) => c.isPinned);
  const others = conversations.filter((c) => !c.isPinned);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={close} aria-hidden="true" />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-72 shrink-0 -translate-x-full flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-transform duration-200 md:static md:z-auto md:translate-x-0",
          isOpen && "translate-x-0"
        )}
      >
      <div className="flex items-center justify-between px-4 py-4">
        <Link href="/chat" className="flex items-center">
          <ReinAILogo size={19} />
        </Link>
        <div className="flex items-center gap-1">
          <button onClick={toggleTheme} className="rounded-lg p-1.5 hover:bg-[var(--surface-hover)]" title="テーマ切替">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={close} className="rounded-lg p-1.5 hover:bg-[var(--surface-hover)] md:hidden" aria-label="メニューを閉じる">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="px-3">
        <button
          onClick={handleNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
        >
          <Plus size={16} />
          新規チャット
        </button>
      </div>

      <div className="px-3 pt-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="チャットを検索"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-1.5 pl-8 pr-2 text-sm outline-none focus:border-[var(--primary)]"
          />
        </div>
      </div>

      <nav className="mt-3 px-3">
        <Link
          href="/conversations"
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--surface-hover)]",
            pathname === "/conversations" && "bg-[var(--surface-hover)] font-medium"
          )}
        >
          <LayoutGrid size={15} />
          すべての会話
        </Link>
        <Link
          href="/prompts"
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--surface-hover)]",
            pathname === "/prompts" && "bg-[var(--surface-hover)] font-medium"
          )}
        >
          <BookMarked size={15} />
          プロンプト
        </Link>
        <a
          href={process.env.NEXT_PUBLIC_REINCHAT_URL ?? "https://reinchat.vercel.app"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-hover)]"
        >
          <MessageCircle size={15} />
          REINChatを使う
        </a>
      </nav>

      {projects.length > 0 && (
        <div className="mt-3 px-3">
          <p className="px-2 text-xs font-semibold text-[var(--muted)]">プロジェクト</p>
          <div className="mt-1 space-y-0.5">
            <button
              onClick={() => setActiveProjectId(null)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-[var(--surface-hover)]",
                !activeProjectId && "bg-[var(--surface-hover)]"
              )}
            >
              すべて
            </button>
            {projects.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "group/proj flex items-center rounded-lg hover:bg-[var(--surface-hover)]",
                  activeProjectId === p.id && "bg-[var(--surface-hover)]"
                )}
              >
                <button
                  onClick={() => setActiveProjectId(p.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 truncate px-2 py-1.5 text-left text-sm"
                >
                  <FolderClosed size={14} />
                  <span className="truncate">{p.name}</span>
                </button>
                <Link
                  href={`/projects/${p.id}`}
                  title="プロジェクト設定"
                  className="mr-1 shrink-0 rounded p-1 opacity-0 hover:bg-[var(--border)] group-hover/proj:opacity-100"
                >
                  <Settings size={12} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {folders.length > 0 && (
        <div className="mt-3 px-3">
          <p className="px-2 text-xs font-semibold text-[var(--muted)]">フォルダ</p>
          <div className="mt-1 space-y-0.5">
            {folders
              .filter((f) => !f.parentId)
              .map((f) => (
                <div key={f.id} className="flex items-center gap-2 truncate rounded-lg px-2 py-1.5 text-sm">
                  <FolderIcon size={14} />
                  {f.name}
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex-1 overflow-y-auto px-3 pb-3">
        {pinned.length > 0 && (
          <div className="mb-2">
            <p className="px-2 text-xs font-semibold text-[var(--muted)]">ピン留め</p>
            <ConversationList
              items={pinned}
              pathname={pathname}
              onTogglePin={handleTogglePin}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDelete}
              onUpdateTags={handleUpdateTags}
            />
          </div>
        )}
        <div>
          <p className="px-2 text-xs font-semibold text-[var(--muted)]">最近のチャット</p>
          <ConversationList
            items={others}
            pathname={pathname}
            onTogglePin={handleTogglePin}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDelete}
            onUpdateTags={handleUpdateTags}
          />
        </div>
      </div>

      <div className="border-t border-[var(--border)] p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-white">
            {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{session?.user?.name}</p>
            <p className="truncate text-xs text-[var(--muted)]">{session?.user?.email}</p>
          </div>
          <Link href="/settings/profile" className="rounded-lg p-1.5 hover:bg-[var(--surface-hover)]" title="設定">
            <Settings size={16} />
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg p-1.5 hover:bg-[var(--surface-hover)]"
            title="ログアウト"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}

function ConversationList({
  items,
  pathname,
  onTogglePin,
  onToggleFavorite,
  onDelete,
  onUpdateTags,
}: {
  items: ConversationSummary[];
  pathname: string | null;
  onTogglePin: (id: string, current: boolean) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  onUpdateTags: (id: string, tags: string[]) => void;
}) {
  const [tagEditorId, setTagEditorId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 px-2 py-6 text-center">
        <MessageSquare size={20} className="text-[var(--muted)]" />
        <p className="text-xs text-[var(--muted)]">チャットはまだありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {items.map((c) => {
        const tags: string[] = JSON.parse(c.tags || "[]");
        return (
          <div key={c.id} className="relative">
            <div
              className={cn(
                "group flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-[var(--surface-hover)]",
                pathname === `/chat/${c.id}` && "bg-[var(--surface-hover)]"
              )}
            >
              <MessageSquare size={14} className="shrink-0 text-[var(--muted)]" />
              <div className="min-w-0 flex-1">
                <Link href={`/chat/${c.id}`} className="block truncate text-sm">
                  {c.title}
                </Link>
                {tags.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {tags.map((t) => {
                      const color = tagColor(t);
                      return (
                        <span
                          key={t}
                          className="rounded px-1.5 py-0 text-[10px] leading-4"
                          style={{ background: color.bg, color: color.fg }}
                        >
                          {t}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                <button
                  onClick={() => setTagEditorId(tagEditorId === c.id ? null : c.id)}
                  className="rounded p-1 hover:bg-[var(--border)]"
                  title="タグを編集"
                >
                  <Tag size={12} className={tags.length > 0 ? "fill-current" : ""} />
                </button>
                <button onClick={() => onToggleFavorite(c.id, c.isFavorite)} className="rounded p-1 hover:bg-[var(--border)]">
                  <Star size={12} className={c.isFavorite ? "fill-current text-yellow-500" : ""} />
                </button>
                <button onClick={() => onTogglePin(c.id, c.isPinned)} className="rounded p-1 hover:bg-[var(--border)]">
                  <Pin size={12} className={c.isPinned ? "fill-current" : ""} />
                </button>
                <button onClick={() => onDelete(c.id)} className="rounded p-1 hover:bg-[var(--border)]">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            {tagEditorId === c.id && (
              <TagEditor
                tags={tags}
                onSave={(next) => {
                  onUpdateTags(c.id, next);
                  setTagEditorId(null);
                }}
                onClose={() => setTagEditorId(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TagEditor({
  tags,
  onSave,
  onClose,
}: {
  tags: string[];
  onSave: (tags: string[]) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(tags.join(", "));

  return (
    <div className="absolute left-2 right-2 top-full z-10 mt-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSave(
              value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            );
          } else if (e.key === "Escape") {
            onClose();
          }
        }}
        placeholder="タグをカンマ区切りで入力"
        className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs outline-none focus:border-[var(--primary)]"
      />
      <div className="mt-1.5 flex justify-end gap-1">
        <button onClick={onClose} className="rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--surface-hover)]">
          キャンセル
        </button>
        <button
          onClick={() =>
            onSave(
              value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            )
          }
          className="rounded bg-[var(--primary)] px-2 py-1 text-xs text-white hover:bg-[var(--primary-hover)]"
        >
          保存
        </button>
      </div>
    </div>
  );
}
