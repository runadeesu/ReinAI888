"use client";

import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";

interface Announcement {
  id: string;
  message: string;
}

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    fetch("/api/announcement")
      .then((r) => r.json())
      .then((d) => {
        if (!d.announcement) return;
        setAnnouncement(d.announcement);
        const dismissedId = localStorage.getItem("reinai-dismissed-announcement");
        setDismissed(dismissedId === d.announcement.id);
      });
  }, []);

  if (!announcement || dismissed) return null;

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--primary)]/10 px-4 py-2 text-sm">
      <Megaphone size={15} className="shrink-0 text-[var(--primary)]" />
      <p className="min-w-0 flex-1 whitespace-pre-wrap">{announcement.message}</p>
      <button
        onClick={() => {
          localStorage.setItem("reinai-dismissed-announcement", announcement.id);
          setDismissed(true);
        }}
        className="shrink-0 rounded p-1 hover:bg-[var(--surface-hover)]"
        aria-label="閉じる"
      >
        <X size={14} />
      </button>
    </div>
  );
}
