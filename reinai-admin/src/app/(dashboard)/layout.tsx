import Link from "next/link";
import { LogoutButton } from "./logout-button";

const NAV = [
  { href: "/", label: "ダッシュボード" },
  { href: "/users", label: "ユーザー" },
  { href: "/providers", label: "プロバイダー" },
  { href: "/announcements", label: "お知らせ" },
  { href: "/broadcast", label: "メール送信" },
  { href: "/reinchat", label: "REINChat" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0b0d12] text-[#e5e7eb]">
      <div className="flex w-56 shrink-0 flex-col border-r border-white/10 p-4">
        <h1 className="mb-4 px-2 text-sm font-semibold tracking-wide text-white/90">ReinAI Admin</h1>
        <nav className="space-y-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-1.5 text-sm text-white/70 hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <LogoutButton />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </div>
    </div>
  );
}
