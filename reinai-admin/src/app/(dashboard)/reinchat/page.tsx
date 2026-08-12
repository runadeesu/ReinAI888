function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

interface ReinChatStats {
  totalUsers: number;
  totalConversations: number;
  totalMessages: number;
  openReports: number;
}

async function fetchReinChatStats(): Promise<ReinChatStats | { error: string }> {
  const reinchatUrl = process.env.REINCHAT_URL;
  const secret = process.env.REINCHAT_SHARED_SECRET;
  if (!reinchatUrl || !secret) return { error: "REINCHAT_URL / REINCHAT_SHARED_SECRET が設定されていません" };

  try {
    const res = await fetch(`${reinchatUrl.replace(/\/$/, "")}/api/admin-stats`, {
      headers: { "X-ReinChat-Secret": secret },
      cache: "no-store",
    });
    if (!res.ok) return { error: `REINChatからの取得に失敗しました (${res.status})` };
    return res.json();
  } catch {
    return { error: "REINChatに接続できませんでした" };
  }
}

export default async function ReinChatPage() {
  const stats = await fetchReinChatStats();
  const reinchatUrl = process.env.REINCHAT_URL ?? "https://reinchat.vercel.app";

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">REINChat</h2>
          <p className="mt-1 text-sm text-white/50">REINChat側の利用状況(REINChat自身のSupabaseから取得)</p>
        </div>
        <a
          href={`${reinchatUrl.replace(/\/$/, "")}/admin`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/15"
        >
          REINChat管理パネルを開く
        </a>
      </div>

      {"error" in stats ? (
        <p className="text-sm text-red-300">{stats.error}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="総ユーザー数" value={stats.totalUsers} />
          <StatCard label="総会話数" value={stats.totalConversations} />
          <StatCard label="総メッセージ数" value={stats.totalMessages} />
          <StatCard label="未対応の通報" value={stats.openReports} />
        </div>
      )}
    </div>
  );
}
