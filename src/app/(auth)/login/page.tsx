"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "メールアドレスまたはパスワードが正しくありません",
  EMAIL_NOT_VERIFIED: "メールアドレスが確認されていません。受信箱をご確認ください。",
  TOTP_REQUIRED: "2段階認証コードを入力してください",
  INVALID_TOTP: "認証コードが正しくありません",
  ACCOUNT_SUSPENDED: "このアカウントは停止されています。詳細はサポートにお問い合わせください。",
  CredentialsSignin: "メールアドレスまたはパスワードが正しくありません",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const registered = searchParams.get("registered");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      totpCode: totpCode || undefined,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      const code = result.code ?? result.error;
      if (code === "TOTP_REQUIRED") {
        setNeedsTotp(true);
        setError(null);
        return;
      }
      setError(ERROR_MESSAGES[code] ?? "ログインに失敗しました");
      return;
    }

    router.push("/chat");
    router.refresh();
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {registered && (
          <p className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
            登録が完了しました。確認メールのリンクをクリックしてください。
          </p>
        )}
        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-[var(--danger)]">{error}</p>}

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted)]">メールアドレス</label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted)]">パスワード</label>
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {needsTotp && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted)]">2段階認証コード</label>
            <Input
              type="text"
              inputMode="numeric"
              autoFocus
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
            />
          </div>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "ログイン中..." : "ログイン"}
        </Button>
      </form>

      <Button
        type="button"
        variant="secondary"
        className="mt-3 w-full"
        onClick={() => signIn("google", { callbackUrl: "/chat" })}
      >
        Googleでログイン
      </Button>

      <div className="mt-6 flex justify-between text-sm text-[var(--muted)]">
        <Link href="/forgot-password" className="hover:text-[var(--foreground)]">
          パスワードをお忘れですか？
        </Link>
        <Link href="/register" className="hover:text-[var(--foreground)]">
          新規登録
        </Link>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
