import Link from "next/link";

const NAV = [
  { href: "/settings/profile", label: "プロフィール" },
  { href: "/settings/account", label: "アカウント・セキュリティ" },
  { href: "/settings/api-keys", label: "APIキー" },
  { href: "/settings/appearance", label: "外観" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-56 shrink-0 border-r border-[var(--border)] p-4">
        <Link href="/chat" className="mb-4 block text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
          ← チャットに戻る
        </Link>
        <h1 className="mb-3 px-2 text-lg font-semibold">設定</h1>
        <nav className="space-y-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-1.5 text-sm hover:bg-[var(--surface-hover)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-xl">{children}</div>
      </div>
    </div>
  );
}
