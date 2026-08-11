import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DeleteUserButton } from "./delete-user-button";
import { SuspendUserButton } from "./suspend-user-button";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      displayId: true,
      bio: true,
      emailVerified: true,
      twoFactorEnabled: true,
      isSuspended: true,
      customInstructions: true,
      createdAt: true,
      apiKeys: { select: { provider: true, label: true, lastFour: true, createdAt: true } },
      conversations: {
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          provider: true,
          model: true,
          updatedAt: true,
          _count: { select: { messages: true } },
        },
      },
      loginHistory: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { method: true, success: true, ipAddress: true, createdAt: true },
      },
      _count: { select: { conversations: true } },
    },
  });

  if (!user) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/users" className="text-xs text-white/50 hover:text-white/80">
          ← ユーザー一覧に戻る
        </Link>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              {user.email}
              {user.isSuspended && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                  停止中
                </span>
              )}
            </h2>
            <p className="mt-0.5 text-sm text-white/50">
              {user.name ?? "名前未設定"} / {user.displayId}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <SuspendUserButton userId={user.id} isSuspended={user.isSuspended} />
            <DeleteUserButton userId={user.id} email={user.email} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs text-white/50">登録日</p>
          <p className="mt-1 text-sm text-white">{user.createdAt.toLocaleString("ja-JP")}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs text-white/50">メール確認</p>
          <p className="mt-1 text-sm text-white">{user.emailVerified ? "確認済み" : "未確認"}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs text-white/50">2段階認証</p>
          <p className="mt-1 text-sm text-white">{user.twoFactorEnabled ? "有効" : "無効"}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs text-white/50">総会話数</p>
          <p className="mt-1 text-sm text-white">{user._count.conversations}</p>
        </div>
      </div>

      {user.customInstructions && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="mb-2 text-sm font-medium text-white/80">カスタム指示</h3>
          <p className="whitespace-pre-wrap text-sm text-white/60">{user.customInstructions}</p>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="mb-3 text-sm font-medium text-white/80">登録済みAPIキー ({user.apiKeys.length})</h3>
        {user.apiKeys.length === 0 ? (
          <p className="text-sm text-white/40">登録されていません(サーバー共有キーを利用)</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {user.apiKeys.map((k) => (
              <li key={k.provider} className="flex items-center justify-between text-white/70">
                <span>
                  {k.provider} {k.label ? `(${k.label})` : ""}
                </span>
                <span className="text-white/40">****{k.lastFour}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="mb-3 text-sm font-medium text-white/80">最近の会話</h3>
        {user.conversations.length === 0 ? (
          <p className="text-sm text-white/40">会話がありません</p>
        ) : (
          <ul className="divide-y divide-white/5 text-sm">
            {user.conversations.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-1.5">
                <span className="truncate text-white/70">{c.title}</span>
                <span className="shrink-0 text-xs text-white/40">
                  {c.provider} · {c._count.messages}件 · {c.updatedAt.toLocaleDateString("ja-JP")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="mb-3 text-sm font-medium text-white/80">ログイン履歴</h3>
        {user.loginHistory.length === 0 ? (
          <p className="text-sm text-white/40">履歴がありません</p>
        ) : (
          <ul className="divide-y divide-white/5 text-sm">
            {user.loginHistory.map((l, i) => (
              <li key={i} className="flex items-center justify-between py-1.5">
                <span className={l.success ? "text-white/70" : "text-red-400"}>
                  {l.method} {l.success ? "" : "(失敗)"}
                </span>
                <span className="text-xs text-white/40">
                  {l.ipAddress ?? "—"} · {l.createdAt.toLocaleString("ja-JP")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
