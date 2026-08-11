import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReinAI Admin",
  description: "ReinAI 管理ダッシュボード",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>{children}</body>
    </html>
  );
}
