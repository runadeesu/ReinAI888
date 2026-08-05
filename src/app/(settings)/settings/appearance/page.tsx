"use client";

import { useTheme } from "@/components/theme-provider";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">外観</h2>
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
  );
}
