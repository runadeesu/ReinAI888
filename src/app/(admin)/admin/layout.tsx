import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/auth/admin";

const NAV = [
  { href: "/admin", label: "ダッシュボード" },
  { href: "/admin/users", label: "ユーザー" },
  { href: "/admin/providers", label: "プロバイダー" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!isAdminEmail(session.user.email)) redirect("/chat");

  return (
    <div className="flex min-h-screen bg-[#0b0d12] text-[#e5e7eb]">
      <div className="w-56 shrink-0 border-r border-white/10 p-4">
        <Link href="/chat" className="mb-4 block text-xs text-white/50 hover:text-white/80">
          ← チャットに戻る
        </Link>
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
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </div>
    </div>
  );
}
