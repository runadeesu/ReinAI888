import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { AppShell } from "@/components/app-shell";
import { Wrench } from "lucide-react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const status = await prisma.systemStatus.findUnique({ where: { id: "singleton" } });
  if (status?.maintenanceMode) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <Wrench size={32} className="text-[var(--muted)]" />
        <h1 className="text-lg font-semibold">ただいまメンテナンス中です</h1>
        <p className="max-w-sm text-sm text-[var(--muted)]">
          {status.maintenanceMessage || "しばらくしてから再度お試しください。"}
        </p>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
