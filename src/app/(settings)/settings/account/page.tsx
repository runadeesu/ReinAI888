"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Monitor, Trash2 } from "lucide-react";

interface SessionRow {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
}

interface LoginHistoryRow {
  id: string;
  method: string;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export default function AccountSettingsPage() {
  return (
    <div className="space-y-10">
      <h2 className="text-xl font-semibold">アカウント・セキュリティ</h2>
      <ChangePasswordSection />
      <Suspense>
        <ChangeEmailSection />
      </Suspense>
      <TwoFactorSection />
      <SessionsSection />
      <LoginHistorySection />
    </div>
  );
}

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/account/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(res.ok ? "パスワードを変更しました" : data.error);
    if (res.ok) {
      setCurrentPassword("");
      setNewPassword("");
    }
  }

  return (
    <section>
      <h3 className="mb-3 font-medium">パスワード変更</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          type="password"
          placeholder="現在のパスワード"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <Input
          type="password"
          placeholder="新しいパスワード"
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
        <Button type="submit" size="sm" disabled={loading}>
          変更する
        </Button>
      </form>
    </section>
  );
}

function ChangeEmailSection() {
  const searchParams = useSearchParams();
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const status = searchParams.get("emailChange");
    if (status === "success") setMessage("メールアドレスを変更しました");
    if (status === "expired") setMessage("リンクの有効期限が切れています");
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/account/change-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail, currentPassword }),
    });
    const data = await res.json();
    setMessage(res.ok ? "確認メールを送信しました。新しいメールアドレスをご確認ください。" : data.error);
  }

  return (
    <section>
      <h3 className="mb-3 font-medium">メールアドレス変更</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          type="email"
          placeholder="新しいメールアドレス"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder="現在のパスワード"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
        <Button type="submit" size="sm">
          変更をリクエスト
        </Button>
      </form>
    </section>
  );
}

function TwoFactorSection() {
  const [enabled, setEnabled] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account/profile")
      .then((r) => r.json())
      .then((d) => setEnabled(Boolean(d.user?.twoFactorEnabled)));
  }, []);

  async function handleStartSetup() {
    const res = await fetch("/api/account/2fa/setup", { method: "POST" });
    const data = await res.json();
    if (res.ok) setQrCode(data.qrCode);
  }

  async function handleVerify() {
    const res = await fetch("/api/account/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (res.ok) {
      setEnabled(true);
      setQrCode(null);
      setCode("");
      setMessage("2段階認証を有効にしました");
    } else {
      setMessage(data.error);
    }
  }

  async function handleDisable() {
    const res = await fetch("/api/account/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (res.ok) {
      setEnabled(false);
      setPassword("");
      setMessage("2段階認証を無効にしました");
    } else {
      setMessage(data.error);
    }
  }

  return (
    <section>
      <h3 className="mb-3 font-medium">2段階認証 (TOTP)</h3>
      {message && <p className="mb-2 text-sm text-[var(--muted)]">{message}</p>}
      {enabled ? (
        <div className="space-y-3">
          <p className="text-sm text-green-600 dark:text-green-400">有効になっています</p>
          <Input
            type="password"
            placeholder="パスワードを入力して無効化"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button size="sm" variant="danger" onClick={handleDisable}>
            無効にする
          </Button>
        </div>
      ) : qrCode ? (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt="TOTP QR code" className="h-40 w-40 rounded-lg border border-[var(--border)]" />
          <p className="text-sm text-[var(--muted)]">認証アプリでQRコードをスキャンし、表示された6桁のコードを入力してください。</p>
          <Input placeholder="6桁のコード" value={code} onChange={(e) => setCode(e.target.value)} />
          <Button size="sm" onClick={handleVerify}>
            有効化する
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="secondary" onClick={handleStartSetup}>
          2段階認証を設定する
        </Button>
      )}
    </section>
  );
}

function SessionsSection() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  async function load() {
    const res = await fetch("/api/account/sessions");
    const data = await res.json();
    setSessions(data.sessions ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRevoke(id: string) {
    await fetch(`/api/account/sessions/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <section>
      <h3 className="mb-3 font-medium">ログイン中のセッション</h3>
      <div className="space-y-2">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
            <div className="flex items-center gap-2">
              <Monitor size={16} className="text-[var(--muted)]" />
              <div>
                <p className="text-sm">
                  {s.userAgent?.slice(0, 60) ?? "不明なデバイス"} {s.isCurrent && "(現在のセッション)"}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {s.ipAddress ?? "不明なIP"} · 最終アクセス {new Date(s.lastSeenAt).toLocaleString("ja-JP")}
                </p>
              </div>
            </div>
            {!s.isCurrent && (
              <button onClick={() => handleRevoke(s.id)} className="text-[var(--danger)]">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        {sessions.length === 0 && <p className="text-sm text-[var(--muted)]">セッションがありません</p>}
      </div>
    </section>
  );
}

function LoginHistorySection() {
  const [history, setHistory] = useState<LoginHistoryRow[]>([]);

  useEffect(() => {
    fetch("/api/account/login-history")
      .then((r) => r.json())
      .then((d) => setHistory(d.history ?? []));
  }, []);

  return (
    <section>
      <h3 className="mb-3 font-medium">ログイン履歴</h3>
      <div className="max-h-64 space-y-1 overflow-y-auto">
        {history.map((h) => (
          <div key={h.id} className="flex justify-between text-xs text-[var(--muted)]">
            <span>
              {h.method} · {h.ipAddress ?? "不明"}
            </span>
            <span>{new Date(h.createdAt).toLocaleString("ja-JP")}</span>
          </div>
        ))}
        {history.length === 0 && <p className="text-sm text-[var(--muted)]">履歴がありません</p>}
      </div>
    </section>
  );
}
