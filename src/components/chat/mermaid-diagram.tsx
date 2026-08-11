"use client";

import { useEffect, useId, useState } from "react";

export function MermaidDiagram({ code }: { code: string }) {
  const id = useId().replace(/:/g, "-");
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    import("mermaid").then(async (mod) => {
      const mermaid = mod.default;
      mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "strict" });
      try {
        const result = await mermaid.render(`mermaid-${id}`, code);
        if (!cancelled) setSvg(result.svg);
      } catch {
        if (!cancelled) setError("図表の描画に失敗しました");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [code, id]);

  if (error) {
    return <pre className="my-2 overflow-x-auto rounded-lg border border-[var(--border)] p-3 text-xs">{code}</pre>;
  }

  if (!svg) {
    return (
      <div className="my-2 flex h-24 items-center justify-center rounded-lg border border-[var(--border)] text-xs text-[var(--muted)]">
        図表を描画中...
      </div>
    );
  }

  return (
    <div
      className="my-2 overflow-x-auto rounded-lg border border-[var(--border)] bg-white p-3"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
