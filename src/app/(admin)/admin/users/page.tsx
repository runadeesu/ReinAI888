import Link from "next/link";
import { prisma } from "@/lib/db/prisma";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const search = q?.trim();

  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            { displayId: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      displayId: true,
      emailVerified: true,
      twoFactorEnabled: true,
      createdAt: true,
      _count: { select: { conversations: true, apiKeys: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">ユーザー ({users.length})</h2>
      </div>

      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={search ?? ""}
          placeholder="メール・名前・アカウントIDで検索"
          className="w-full max-w-sm rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/15"
        >
          検索
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-white/50">
              <th className="px-3 py-2 font-medium">メール</th>
              <th className="px-3 py-2 font-medium">名前</th>
              <th className="px-3 py-2 font-medium">会話数</th>
              <th className="px-3 py-2 font-medium">APIキー</th>
              <th className="px-3 py-2 font-medium">認証</th>
              <th className="px-3 py-2 font-medium">登録日</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                <td className="px-3 py-2">
                  <Link href={`/admin/users/${u.id}`} className="text-white/90 hover:underline">
                    {u.email}
                  </Link>
                </td>
                <td className="px-3 py-2 text-white/70">{u.name ?? "—"}</td>
                <td className="px-3 py-2 text-white/70">{u._count.conversations}</td>
                <td className="px-3 py-2 text-white/70">{u._count.apiKeys}</td>
                <td className="px-3 py-2 text-white/50">
                  {u.emailVerified ? "確認済み" : "未確認"}
                  {u.twoFactorEnabled ? " / 2FA" : ""}
                </td>
                <td className="px-3 py-2 text-white/50">{u.createdAt.toLocaleDateString("ja-JP")}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-white/40">
                  該当するユーザーがいません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
