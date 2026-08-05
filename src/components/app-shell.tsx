"use client";

import { Menu } from "lucide-react";
import { Sidebar } from "@/components/sidebar/sidebar";
import { SidebarProvider, useSidebar } from "@/components/sidebar/sidebar-context";

function MobileTopBar() {
  const { toggle } = useSidebar();
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-[var(--border)] px-3 py-2.5 md:hidden">
      <button
        onClick={toggle}
        className="rounded-lg p-1.5 hover:bg-[var(--surface-hover)]"
        aria-label="メニューを開く"
      >
        <Menu size={20} />
      </button>
      <span className="text-sm font-semibold">ReinAI</span>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar />
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
