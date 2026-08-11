"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "loading" | "ready" | "confirming" | "done" | "error";

export default function DiscordVerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [status, setStatus] = useState<Status>("loading");
  const [discordUsername, setDiscordUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/discord-verify/${code}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "エラーが発生しました");
        return r.json();
      })
      .then((d) => {
        setDiscordUsername(d.discordUsername);
        setStatus("ready");
      })
      .catch((err) => {
        setError(err.message);
        setStatus("error");
      });
  }, [code]);

  async function handleConfirm() {
    setStatus("confirming");
    const res = await fetch(`/api/discord-verify/${code}`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatus("done");
    } else {
      setError(data.error ?? "連携に失敗しました");
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        {status === "loading" && <p className="text-sm text-[var(--muted)]">読み込み中...</p>}

        {status === "ready" && (
          <>
            <h1 className="text-lg font-semibold">Discord連携</h1>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Discordアカウント <span className="font-medium text-[var(--foreground)]">@{discordUsername}</span>{" "}
              をこのReinAIアカウントと連携しますか?
            </p>
            <Button className="mt-5 w-full" onClick={handleConfirm}>
              連携する
            </Button>
          </>
        )}

        {status === "confirming" && <p className="text-sm text-[var(--muted)]">連携中...</p>}

        {status === "done" && (
          <>
            <CheckCircle2 size={36} className="mx-auto text-green-500" />
            <h1 className="mt-3 text-lg font-semibold">連携が完了しました</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              @{discordUsername} との連携が完了しました。Discordサーバーに戻って認証済みロールが付与されるのをお待ちください。
            </p>
            <Link href="/chat" className="mt-5 inline-block">
              <Button variant="secondary">ReinAIに戻る</Button>
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle size={36} className="mx-auto text-[var(--danger)]" />
            <h1 className="mt-3 text-lg font-semibold">連携できませんでした</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">{error}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Discordでもう一度 /verify を実行して、新しいリンクから試してください。
            </p>
          </>
        )}
      </div>
    </div>
  );
}
