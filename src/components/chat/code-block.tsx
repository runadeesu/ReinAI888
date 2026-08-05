"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";

interface CodeBlockProps {
  language: string;
  code: string;
}

export function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleDownload() {
    const ext = EXTENSION_MAP[language] ?? "txt";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `snippet.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-[var(--border)]">
      <div className="flex items-center justify-between bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--muted)]">
        <span>{language || "text"}</span>
        <div className="flex gap-2">
          <button onClick={handleDownload} className="flex items-center gap-1 hover:text-[var(--foreground)]">
            <Download size={13} />
            保存
          </button>
          <button onClick={handleCopy} className="flex items-center gap-1 hover:text-[var(--foreground)]">
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "コピー済み" : "コピー"}
          </button>
        </div>
      </div>
      <pre className="!m-0 !rounded-none !border-0 overflow-x-auto p-3 text-sm">
        <code className={`hljs language-${language}`}>{code}</code>
      </pre>
    </div>
  );
}

const EXTENSION_MAP: Record<string, string> = {
  typescript: "ts",
  javascript: "js",
  tsx: "tsx",
  jsx: "jsx",
  python: "py",
  go: "go",
  rust: "rs",
  java: "java",
  kotlin: "kt",
  swift: "swift",
  csharp: "cs",
  cpp: "cpp",
  c: "c",
  php: "php",
  sql: "sql",
  html: "html",
  css: "css",
  json: "json",
  yaml: "yml",
  bash: "sh",
  shell: "sh",
};
