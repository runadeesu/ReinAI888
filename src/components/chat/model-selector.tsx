"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { AI_PROVIDERS, type AiProviderId } from "@/lib/ai/models";
import { cn } from "@/lib/utils/cn";

interface ModelSelectorProps {
  provider: string;
  model: string;
  onChange: (provider: AiProviderId, model: string) => void;
}

export function ModelSelector({ provider, model, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const currentModel = AI_PROVIDERS[provider as AiProviderId]?.models.find((m) => m.id === model);

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
        <div className="absolute right-0 top-full z-20 mt-1 w-80 max-w-[90vw] rounded-xl border border-[var(--border)] bg-[var(--background)] p-2 shadow-lg sm:left-0 sm:right-auto">
          {Object.values(AI_PROVIDERS).map((p) => (
            <div key={p.id} className="mb-2 last:mb-0">
              <p className="px-2 py-1 text-xs font-semibold text-[var(--muted)]">{p.label}</p>
              {p.models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onChange(p.id, m.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "block w-full rounded-lg px-2 py-1.5 text-left hover:bg-[var(--surface-hover)]",
                    provider === p.id && model === m.id && "bg-[var(--surface-hover)]"
                  )}
                >
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-xs text-[var(--muted)]">{m.description}</p>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
