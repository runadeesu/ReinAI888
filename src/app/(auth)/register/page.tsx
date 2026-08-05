"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "登録に失敗しました");
      return;
    }

    router.push("/login?registered=1");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-[var(--danger)]">{error}</p>}
      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted)]">名前</label>
        <Input required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted)]">メールアドレス</label>
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted)]">パスワード</label>
        <Input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-[var(--muted)]">8文字以上、大文字・小文字・数字を含めてください</p>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "登録中..." : "新規登録"}
      </Button>
      <p className="text-center text-sm text-[var(--muted)]">
        すでにアカウントをお持ちですか？{" "}
        <Link href="/login" className="text-[var(--primary)] hover:underline">
          ログイン
        </Link>
      </p>
    </form>
  );
}
