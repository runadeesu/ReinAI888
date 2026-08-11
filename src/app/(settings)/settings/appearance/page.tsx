"use client";

import { useTheme, type FontSize } from "@/components/theme-provider";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const FONT_SIZES: { value: FontSize; label: string; sample: string }[] = [
  { value: "sm", label: "小", sample: "text-xs" },
  { value: "md", label: "標準", sample: "text-sm" },
  { value: "lg", label: "大", sample: "text-base" },
  { value: "xl", label: "特大", sample: "text-lg" },
];

export default function AppearancePage() {
  const { theme, setTheme, fontSize, setFontSize, highContrast, setHighContrast } = useTheme();

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold">外観</h2>

      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--muted)]">テーマ</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTheme("light")}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-6",
              theme === "light" ? "border-[var(--primary)]" : "border-[var(--border)]"
            )}
          >
            <Sun size={24} />
            <span className="text-sm">ライトモード</span>
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-6",
              theme === "dark" ? "border-[var(--primary)]" : "border-[var(--border)]"
            )}
          >
            <Moon size={24} />
            <span className="text-sm">ダークモード</span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--muted)]">文字サイズ</p>
        <div className="grid grid-cols-4 gap-2">
          {FONT_SIZES.map((f) => (
            <button
              key={f.value}
              onClick={() => setFontSize(f.value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border p-3",
                fontSize === f.value ? "border-[var(--primary)]" : "border-[var(--border)]"
              )}
            >
              <span className={f.sample}>Aa</span>
              <span className="text-xs text-[var(--muted)]">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--muted)]">アクセシビリティ</p>
        <label className="flex items-center justify-between rounded-xl border border-[var(--border)] p-4">
          <div>
            <p className="text-sm font-medium">高コントラストモード</p>
            <p className="text-xs text-[var(--muted)]">境界線や補助テキストのコントラストを強調します</p>
          </div>
          <input
            type="checkbox"
            checked={highContrast}
            onChange={(e) => setHighContrast(e.target.checked)}
            className="h-5 w-5 accent-[var(--primary)]"
          />
        </label>
      </div>
    </div>
  );
}
