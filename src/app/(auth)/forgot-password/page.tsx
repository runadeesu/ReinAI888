"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm">
          {email} 宛にパスワード再設定用のリンクを送信しました（登録されている場合）。
        </p>
        <Link href="/login" className="text-sm text-[var(--primary)] hover:underline">
          ログインに戻る
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-[var(--muted)]">登録済みのメールアドレスを入力してください。</p>
      <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "送信中..." : "リセットリンクを送信"}
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-[var(--primary)] hover:underline">
          ログインに戻る
        </Link>
      </p>
    </form>
  );
}
