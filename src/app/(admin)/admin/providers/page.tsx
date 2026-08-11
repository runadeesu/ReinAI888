import { AI_PROVIDERS } from "@/lib/ai/models";
import { prisma } from "@/lib/db/prisma";

export default async function AdminProvidersPage() {
  const providers = Object.values(AI_PROVIDERS);

  const userKeyCounts = await prisma.apiKey.groupBy({
    by: ["provider"],
    _count: { _all: true },
  });
  const userKeyCountByProvider = new Map(userKeyCounts.map((row) => [row.provider, row._count._all]));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">プロバイダー</h2>
        <p className="mt-1 text-sm text-white/50">
          サーバー共有キー(環境変数)が設定されていれば、全ユーザーがそのプロバイダーを利用できます。
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-white/50">
              <th className="px-3 py-2 font-medium">プロバイダー</th>
              <th className="px-3 py-2 font-medium">環境変数</th>
              <th className="px-3 py-2 font-medium">サーバー共有キー</th>
              <th className="px-3 py-2 font-medium">個人登録数</th>
              <th className="px-3 py-2 font-medium">モデル数</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => {
              const configured = Boolean(process.env[p.envVar] && process.env[p.envVar]!.length > 0);
              return (
                <tr key={p.id} className="border-b border-white/5 last:border-0">
                  <td className="px-3 py-2 text-white/90">{p.label}</td>
                  <td className="px-3 py-2 font-mono text-xs text-white/50">{p.envVar}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        configured ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/40"
                      }`}
                    >
                      {configured ? "設定済み" : "未設定"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-white/70">{userKeyCountByProvider.get(p.id) ?? 0}</td>
                  <td className="px-3 py-2 text-white/70">{p.models.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
