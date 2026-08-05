import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user) redirect("/chat");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">ReinAI</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">AI開発プラットフォーム</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
