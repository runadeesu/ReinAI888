import Link from "next/link";
import { openApiSpec } from "@/lib/openapi";

const METHOD_COLOR: Record<string, string> = {
  get: "#2563eb",
  post: "#16a34a",
  patch: "#d97706",
  delete: "#dc2626",
};

export default function ApiDocsPage() {
  const entries = Object.entries(openApiSpec.paths);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <Link href="/chat" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
          ← ReinAIに戻る
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{openApiSpec.info.title}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{openApiSpec.info.description}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          v{openApiSpec.info.version} ·{" "}
          <a href="/api/openapi.json" className="underline">
            openapi.json
          </a>
        </p>
      </div>

      <div className="space-y-6">
        {entries.map(([path, methods]) => (
          <div key={path} className="rounded-xl border border-[var(--border)] p-4">
            <p className="mb-2 font-mono text-sm">{path}</p>
            <div className="space-y-2">
              {Object.entries(methods).map(([method, def]) => (
                <div key={method} className="flex items-start gap-3 text-sm">
                  <span
                    className="w-16 shrink-0 rounded px-2 py-0.5 text-center text-xs font-semibold uppercase text-white"
                    style={{ background: METHOD_COLOR[method] ?? "#6b7280" }}
                  >
                    {method}
                  </span>
                  <div>
                    <p>{"summary" in def ? def.summary : ""}</p>
                    {"description" in def && def.description && (
                      <p className="mt-0.5 text-xs text-[var(--muted)]">{def.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
