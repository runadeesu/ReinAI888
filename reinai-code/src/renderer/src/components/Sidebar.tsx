import { useEffect, useState } from "react";
import type { FileEntry } from "../../../shared/types";

interface TreeNodeProps {
  projectRoot: string;
  entry: FileEntry;
  depth: number;
}

function TreeNode({ projectRoot, entry, depth }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[] | null>(null);

  async function toggle() {
    if (!entry.isDirectory) return;
    if (!expanded && children === null) {
      const list = await window.reinai.listDirectory(projectRoot, entry.relPath);
      setChildren(list);
    }
    setExpanded((e) => !e);
  }

  return (
    <div>
      <div
        onClick={toggle}
        style={{
          padding: "3px 8px",
          paddingLeft: 8 + depth * 14,
          cursor: entry.isDirectory ? "pointer" : "default",
          fontSize: 13,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={entry.relPath}
      >
        {entry.isDirectory ? (expanded ? "▾ " : "▸ ") : "  "}
        {entry.name}
      </div>
      {expanded && children && (
        <div>
          {children.map((c) => (
            <TreeNode key={c.relPath} projectRoot={projectRoot} entry={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ projectRoot }: { projectRoot: string }) {
  const [rootEntries, setRootEntries] = useState<FileEntry[]>([]);

  useEffect(() => {
    window.reinai.listDirectory(projectRoot, ".").then(setRootEntries);
  }, [projectRoot]);

  return (
    <div
      style={{
        width: 260,
        flexShrink: 0,
        borderRight: "1px solid var(--border)",
        overflowY: "auto",
        background: "var(--surface)",
      }}
    >
      <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
        {projectRoot}
      </div>
      <div style={{ padding: "6px 0" }}>
        {rootEntries.map((e) => (
          <TreeNode key={e.relPath} projectRoot={projectRoot} entry={e} depth={0} />
        ))}
      </div>
    </div>
  );
}
