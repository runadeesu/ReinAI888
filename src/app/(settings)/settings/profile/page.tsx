"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState("");
  const [displayId, setDisplayId] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/account/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setName(d.user.name ?? "");
          setBio(d.user.bio ?? "");
          setImage(d.user.image ?? "");
          setDisplayId(d.user.displayId ?? "");
          setCustomInstructions(d.user.customInstructions ?? "");
        }
      });
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/attachments", { method: "POST", body: formData });
    if (res.ok) {
      const data = await res.json();
      setImage(`/api/attachments/${data.attachment.id}`);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bio, image, customInstructions }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("保存しました");
      update();
    } else {
      setMessage("保存に失敗しました");
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">プロフィール</h2>

      <div className="flex items-center gap-4">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="avatar" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)] text-xl font-semibold text-white">
            {name?.[0]?.toUpperCase() ?? session?.user?.email?.[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            アイコンを変更
          </Button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted)]">アカウントID</label>
        <Input value={displayId} disabled />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted)]">名前</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted)]">自己紹介</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={280}
          className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted)]">カスタム指示</label>
        <p className="text-xs text-[var(--muted)]">
          ReinAIに常に覚えておいてほしいこと(話し方の好み、専門分野、避けてほしい表現など)を書いておくと、新しい会話すべてに自動で反映されます。
        </p>
        <textarea
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          rows={5}
          maxLength={4000}
          placeholder="例: 常に日本語の関西弁で回答して。コード例はTypeScriptを優先して。"
          className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
        />
      </div>

      {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
      <Button onClick={handleSave} disabled={saving}>
        {saving ? "保存中..." : "保存"}
      </Button>
    </div>
  );
}
