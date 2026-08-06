import { diffLines } from "diff";

interface DiffViewProps {
  path: string;
  before: string;
  after: string;
}

export function DiffView({ path, before, after }: DiffViewProps) {
  const parts = diffLines(before, after);

  return (
    <div
      style={{
        margin: "6px 0",
        borderRadius: 8,
        border: "1px solid var(--border)",
        overflow: "hidden",
        fontSize: 12,
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          padding: "4px 10px",
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          color: "var(--muted)",
        }}
      >
        {path}
      </div>
      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {parts.map((part, i) => {
          const color = part.added ? "#4ade80" : part.removed ? "#f87171" : "var(--foreground)";
          const bg = part.added ? "rgba(74,222,128,0.1)" : part.removed ? "rgba(248,113,113,0.1)" : "transparent";
          const prefix = part.added ? "+ " : part.removed ? "- " : "  ";
          const lines = part.value.replace(/\n$/, "").split("\n");
          return (
            <div key={i} style={{ background: bg }}>
              {lines.map((line, j) => (
                <div key={j} style={{ color, padding: "0 10px", whiteSpace: "pre-wrap" }}>
                  {prefix}
                  {line}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
