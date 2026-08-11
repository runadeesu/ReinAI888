import { prisma } from "@/lib/prisma";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  const [
    totalUsers,
    totalConversations,
    totalMessages,
    messagesToday,
    newUsersToday,
    newUsersThisWeek,
    discordLinkedUsers,
    conversationsByProvider,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.message.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.discordLink.count(),
    prisma.conversation.groupBy({ by: ["provider"], _count: { _all: true }, orderBy: { _count: { provider: "desc" } } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, email: true, displayId: true, createdAt: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white">ダッシュボード</h2>
        <p className="mt-1 text-sm text-white/50">ReinAI全体の利用状況</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="総ユーザー数" value={totalUsers} />
        <StatCard label="総会話数" value={totalConversations} />
        <StatCard label="総メッセージ数" value={totalMessages} />
        <StatCard label="今日のメッセージ" value={messagesToday} />
        <StatCard label="今日の新規登録" value={newUsersToday} />
        <StatCard label="今週の新規登録" value={newUsersThisWeek} />
        <StatCard label="Discord連携ユーザー数" value={discordLinkedUsers} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="mb-3 text-sm font-medium text-white/80">プロバイダー別 会話数</h3>
          {conversationsByProvider.length === 0 ? (
            <p className="text-sm text-white/40">データがありません</p>
          ) : (
            <ul className="space-y-1.5">
              {conversationsByProvider.map((row) => (
                <li key={row.provider} className="flex items-center justify-between text-sm">
                  <span className="text-white/70">{row.provider}</span>
                  <span className="text-white/90">{row._count._all}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="mb-3 text-sm font-medium text-white/80">最近登録したユーザー</h3>
          {recentUsers.length === 0 ? (
            <p className="text-sm text-white/40">データがありません</p>
          ) : (
            <ul className="space-y-1.5">
              {recentUsers.map((u) => (
                <li key={u.id} className="flex items-center justify-between text-sm">
                  <span className="truncate text-white/70">{u.email}</span>
                  <span className="shrink-0 text-white/40">{u.createdAt.toLocaleDateString("ja-JP")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
