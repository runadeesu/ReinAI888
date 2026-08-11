"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Star } from "lucide-react";
import { AI_PROVIDERS, type AiProviderId } from "@/lib/ai/models";
import { cn } from "@/lib/utils/cn";

interface ModelSelectorProps {
  provider: string;
  model: string;
  onChange: (provider: AiProviderId, model: string) => void;
}

export function ModelSelector({ provider, model, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<AiProviderId[] | null>(null);
  const [favoriteModels, setFavoriteModels] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    fetch("/api/ai/providers")
      .then((r) => r.json())
      .then((d) => setAvailableProviders(d.providers ?? []));
    fetch("/api/account/favorite-models")
      .then((r) => r.json())
      .then((d) => setFavoriteModels(d.favoriteModels ?? []));
  }, []);

  async function toggleFavorite(e: React.MouseEvent, key: string) {
    e.stopPropagation();
    setFavoriteModels((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    const res = await fetch("/api/account/favorite-models", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelKey: key }),
    });
    const data = await res.json().catch(() => null);
    if (data?.favoriteModels) setFavoriteModels(data.favoriteModels);
  }

  const currentModel = AI_PROVIDERS[provider as AiProviderId]?.models.find((m) => m.id === model);
  const visibleProviders = Object.values(AI_PROVIDERS).filter(
    (p) => availableProviders === null || availableProviders.includes(p.id)
  );

  const favoriteEntries = visibleProviders.flatMap((p) =>
    p.models.filter((m) => favoriteModels.includes(`${p.id}:${m.id}`)).map((m) => ({ provider: p, model: m }))
  );

  function ModelRow({ p, m }: { p: (typeof visibleProviders)[number]; m: (typeof p.models)[number] }) {
    const key = `${p.id}:${m.id}`;
    const isFavorite = favoriteModels.includes(key);
    return (
      <button
        key={key}
        onClick={() => {
          onChange(p.id, m.id);
          setOpen(false);
        }}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--surface-hover)]",
          provider === p.id && model === m.id && "bg-[var(--surface-hover)]"
        )}
      >
        <span className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{m.label}</p>
          <p className="truncate text-xs text-[var(--muted)]">{m.description}</p>
        </span>
        <span
          onClick={(e) => toggleFavorite(e, key)}
          role="button"
          tabIndex={0}
          title={isFavorite ? "お気に入りから外す" : "お気に入りに追加"}
          className="shrink-0 rounded p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <Star size={13} fill={isFavorite ? "currentColor" : "none"} className={isFavorite ? "text-amber-400" : ""} />
        </span>
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm hover:bg-[var(--surface-hover)]"
      >
        {currentModel?.label ?? model}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 max-h-[60vh] w-80 max-w-[90vw] overflow-y-auto overscroll-contain rounded-xl border border-[var(--border)] bg-[var(--background)] p-2 shadow-lg sm:left-0 sm:right-auto">
          {visibleProviders.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-[var(--muted)]">
              利用可能なAPIキーがありません。設定 &gt; APIキー から登録してください。
            </p>
          )}
          {favoriteEntries.length > 0 && (
            <div className="mb-2 border-b border-[var(--border)] pb-2">
              <p className="px-2 py-1 text-xs font-semibold text-[var(--muted)]">お気に入り</p>
              {favoriteEntries.map(({ provider: p, model: m }) => (
                <ModelRow key={`fav-${p.id}:${m.id}`} p={p} m={m} />
              ))}
            </div>
          )}
          {visibleProviders.map((p) => (
            <div key={p.id} className="mb-2 last:mb-0">
              <p className="px-2 py-1 text-xs font-semibold text-[var(--muted)]">{p.label}</p>
              {p.models.map((m) => (
                <ModelRow key={m.id} p={p} m={m} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
