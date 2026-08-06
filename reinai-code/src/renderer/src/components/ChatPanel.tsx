import { useEffect, useRef, useState } from "react";
import type { AgentEvent, AiProviderId, ChatMessage } from "../../../shared/types";
import { DiffView } from "./DiffView";

interface TimelineItem {
  id: string;
  kind: "message" | "tool" | "diff";
  role?: "user" | "assistant";
  content: string;
  toolName?: string;
  diffPath?: string;
  diffBefore?: string;
  diffAfter?: string;
}

interface ChatPanelProps {
  projectRoot: string;
  provider: AiProviderId;
  model: string;
}

export function ChatPanel({ projectRoot, provider, model }: ChatPanelProps) {
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamingIdRef = useRef<string | null>(null);
  const assistantTextRef = useRef("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    hasLoadedRef.current = false;
    window.reinai.loadConversation(projectRoot).then((saved) => {
      setConversation(saved);
      setTimeline(
        saved.map((m) => ({ id: m.id, kind: "message" as const, role: m.role, content: m.content }))
      );
      hasLoadedRef.current = true;
    });
  }, [projectRoot]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    window.reinai.saveConversation(projectRoot, conversation);
  }, [conversation, projectRoot]);

  useEffect(() => {
    const unsubscribe = window.reinai.onAgentEvent((event: AgentEvent) => {
      if (event.type === "text-delta") {
        assistantTextRef.current += event.text;
        if (!streamingIdRef.current) {
          const id = `assistant-${Date.now()}`;
          streamingIdRef.current = id;
          setTimeline((prev) => [...prev, { id, kind: "message", role: "assistant", content: event.text }]);
        } else {
          const id = streamingIdRef.current;
          setTimeline((prev) => prev.map((item) => (item.id === id ? { ...item, content: item.content + event.text } : item)));
        }
      } else if (event.type === "tool-call") {
        setTimeline((prev) => [
          ...prev,
          {
            id: `tool-${Date.now()}-${Math.random()}`,
            kind: "tool",
            toolName: event.toolName,
            content: `${event.toolName}(${JSON.stringify(event.args)})`,
          },
        ]);
      } else if (event.type === "tool-result") {
        setTimeline((prev) => [
          ...prev,
          {
            id: `tool-result-${Date.now()}-${Math.random()}`,
            kind: "tool",
            toolName: event.toolName,
            content: event.result.length > 500 ? event.result.slice(0, 500) + "..." : event.result,
          },
        ]);
      } else if (event.type === "file-diff") {
        setTimeline((prev) => [
          ...prev,
          {
            id: `diff-${Date.now()}-${Math.random()}`,
            kind: "diff",
            content: "",
            diffPath: event.path,
            diffBefore: event.before,
            diffAfter: event.after,
          },
        ]);
      } else if (event.type === "error") {
        setError(event.message);
        setRunning(false);
        streamingIdRef.current = null;
        assistantTextRef.current = "";
      } else if (event.type === "done") {
        setRunning(false);
        streamingIdRef.current = null;
        if (assistantTextRef.current.trim().length > 0) {
          const content = assistantTextRef.current;
          setConversation((prev) => [...prev, { id: `assistant-msg-${Date.now()}`, role: "assistant", content }]);
        }
        assistantTextRef.current = "";
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timeline]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || running) return;
    setError(null);
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: trimmed };
    const nextConversation = [...conversation, userMessage];
    setConversation(nextConversation);
    setTimeline((prev) => [...prev, { id: userMessage.id, kind: "message", role: "user", content: trimmed }]);
    setInput("");
    setRunning(true);
    streamingIdRef.current = null;
    window.reinai.sendMessage({ projectRoot, provider, model, conversation: nextConversation });
  }

  function handleStop() {
    window.reinai.stopAgent();
    setRunning(false);
    streamingIdRef.current = null;
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {timeline.map((item) =>
          item.kind === "diff" ? (
            <DiffView key={item.id} path={item.diffPath!} before={item.diffBefore!} after={item.diffAfter!} />
          ) : item.kind === "tool" ? (
            <div
              key={item.id}
              style={{
                margin: "6px 0",
                padding: "6px 10px",
                borderRadius: 8,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                fontSize: 12,
                color: "var(--muted)",
                fontFamily: "monospace",
              }}
            >
              {item.toolName && <strong style={{ color: "var(--foreground)" }}>{item.toolName}</strong>}
              <pre style={{ margin: "4px 0 0" }}>{item.content}</pre>
            </div>
          ) : (
            <div
              key={item.id}
              style={{
                margin: "10px 0",
                display: "flex",
                justifyContent: item.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "75%",
                  padding: "10px 14px",
                  borderRadius: 14,
                  background: item.role === "user" ? "var(--primary)" : "var(--surface)",
                  border: item.role === "user" ? "none" : "1px solid var(--border)",
                  color: item.role === "user" ? "#fff" : "var(--foreground)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {item.content}
              </div>
            </div>
          )
        )}
        {error && (
          <div style={{ margin: "10px 0", padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.12)", color: "var(--danger)" }}>
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ borderTop: "1px solid var(--border)", padding: 12, display: "flex", gap: 8 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="例: package.jsonを読んで、依存関係を教えて"
          rows={2}
          style={{
            flex: 1,
            resize: "none",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 10,
            color: "var(--foreground)",
            outline: "none",
          }}
        />
        {running ? (
          <button
            onClick={handleStop}
            style={{ background: "var(--danger)", color: "#fff", border: "none", borderRadius: 10, padding: "0 16px" }}
          >
            停止
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            style={{ background: "var(--primary)", color: "#fff", border: "none", borderRadius: 10, padding: "0 16px" }}
          >
            送信
          </button>
        )}
      </div>
    </div>
  );
}
