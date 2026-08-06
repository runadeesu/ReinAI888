import Link from "next/link";

const NAV = [
  { href: "/settings/profile", label: "プロフィール" },
  { href: "/settings/account", label: "アカウント・セキュリティ" },
  { href: "/settings/api-keys", label: "APIキー" },
  { href: "/settings/billing", label: "プラン・お支払い" },
  { href: "/settings/appearance", label: "外観" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <div className="shrink-0 border-b border-[var(--border)] p-3 md:w-56 md:border-b-0 md:border-r md:p-4">
        <Link
          href="/chat"
          className="mb-2 block text-sm text-[var(--muted)] hover:text-[var(--foreground)] md:mb-4"
        >
          ← チャットに戻る
        </Link>
        <h1 className="mb-2 hidden px-2 text-lg font-semibold md:mb-3 md:block">設定</h1>
        <nav className="flex gap-1 overflow-x-auto md:block md:space-y-0.5 md:overflow-visible">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block shrink-0 rounded-lg px-3 py-1.5 text-sm hover:bg-[var(--surface-hover)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto max-w-xl">{children}</div>
      </div>
    </div>
  );
}
