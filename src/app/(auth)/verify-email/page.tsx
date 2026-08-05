"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      setStatus("error");
      setMessage("無効なリンクです");
      return;
    }

    fetch("/api/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, email }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
        } else {
          setStatus("error");
          setMessage(data.error ?? "確認に失敗しました");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("確認に失敗しました");
      });
  }, [searchParams]);

  return (
    <div className="text-center space-y-4">
      {status === "loading" && <p className="text-sm text-[var(--muted)]">確認中...</p>}
      {status === "success" && (
        <>
          <p className="text-sm">メールアドレスが確認されました。</p>
          <Link href="/login">
            <Button className="w-full">ログインへ進む</Button>
          </Link>
        </>
      )}
      {status === "error" && <p className="text-sm text-[var(--danger)]">{message}</p>}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
