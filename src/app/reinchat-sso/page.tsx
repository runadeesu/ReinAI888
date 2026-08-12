"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

function ReinChatSsoInner() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("リンクが正しくありません");
      return;
    }
    signIn("reinchat-token", { token, callbackUrl: "/chat", redirect: true }).catch(() => {
      setError("ログインに失敗しました");
    });
  }, [searchParams]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      {error ? (
        <>
          <p className="text-sm text-[var(--danger)]">{error}</p>
          <p className="text-xs text-[var(--muted)]">REINChatからもう一度「ReinAIを開く」を試してください。</p>
        </>
      ) : (
        <p className="text-sm text-[var(--muted)]">ログイン中...</p>
      )}
    </div>
  );
}

export default function ReinChatSsoPage() {
  return (
    <Suspense>
      <ReinChatSsoInner />
    </Suspense>
  );
}
