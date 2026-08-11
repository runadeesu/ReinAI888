import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "ReinAI",
  description: "ReinAI — AI開発プラットフォーム",
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#0b0b0f",
};

const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("reinai-theme");
    var theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    if (theme === "dark") document.documentElement.classList.add("dark");
    var fontSize = localStorage.getItem("reinai-font-size");
    if (fontSize) document.documentElement.setAttribute("data-font-size", fontSize);
    if (localStorage.getItem("reinai-high-contrast") === "1") document.documentElement.classList.add("high-contrast");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className="min-h-full flex flex-col font-sans"
        style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}
      >
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
