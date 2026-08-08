"use client";

import { useEffect, useRef, useState } from "react";
import { Share2, Download, Check } from "lucide-react";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { ModelSelector } from "@/components/chat/model-selector";
import type { AiProviderId } from "@/lib/ai/models";
import type { MessageItem } from "@/types/api";

interface Conversation {
  id: string;
  title: string;
  provider: string;
  model: string;
  shareId: string | null;
}

export function ChatWindow({ conversationId }: { conversationId: string }) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [videoGenerating, setVideoGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const handleSendRef = useRef<((content: string, attachmentIds: string[], useSearch: boolean) => void) | null>(
    null
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/conversations/${conversationId}`).then((r) => r.json()),
      fetch(`/api/conversations/${conversationId}/messages`).then((r) => r.json()),
    ]).then(([convData, msgData]) => {
      setConversation(convData.conversation);
      setMessages(msgData.messages ?? []);
      setLoading(false);

      const draftKey = `reinai-draft-${conversationId}`;
      const draft = sessionStorage.getItem(draftKey);
      if (draft && (msgData.messages ?? []).length === 0) {
        sessionStorage.removeItem(draftKey);
        handleSendRef.current?.(draft, [], false);
      }
    });
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingText]);

  async function streamAssistantReply(payload: Record<string, unknown>): Promise<string | null> {
    setError(null);
    setStreamingText("");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let res: Response;
    try {
      res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch {
      // Aborted before the response even started.
      setStreamingText(null);
      abortControllerRef.current = null;
      return null;
    }

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({ error: "エラーが発生しました" }));
      setError(data.error ?? "エラーが発生しました");
      setStreamingText(null);
      abortControllerRef.current = null;
      return null;
    }

    const userMessageId = res.headers.get("X-User-Message-Id");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setStreamingText(fullText);
      }
    } catch {
      // Reader aborted mid-stream; fall through and keep whatever text we have.
    }

    abortControllerRef.current = null;
    setStreamingText(null);
    if (fullText.trim().length > 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: fullText,
          provider: conversation?.provider ?? null,
          model: conversation?.model ?? null,
          createdAt: new Date().toISOString(),
          attachments: [],
        },
      ]);
    }

    return userMessageId;
  }

  function handleStop() {
    abortControllerRef.current?.abort();
  }

  async function handleSend(content: string, attachmentIds: string[], useSearch: boolean) {
    const optimisticId = `pending-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        role: "user",
        content,
        provider: null,
        model: null,
        createdAt: new Date().toISOString(),
        attachments: [],
      },
    ]);

    const realId = await streamAssistantReply({ conversationId, content, attachmentIds, useSearch });
    if (realId) {
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? { ...m, id: realId } : m)));
    }
  }

  handleSendRef.current = handleSend;

  async function handleEditMessage(messageId: string, newContent: string) {
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;
    setMessages((prev) => [...prev.slice(0, idx), { ...prev[idx], content: newContent }]);
    await streamAssistantReply({ conversationId, content: newContent, editMessageId: messageId });
  }

  async function handleGenerateImage(prompt: string) {
    const optimisticId = `pending-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        role: "user",
        content: prompt,
        provider: null,
        model: null,
        createdAt: new Date().toISOString(),
        attachments: [],
      },
    ]);
    setError(null);
    setImageGenerating(true);

    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, prompt }),
      });
      const data = await res.json().catch(() => ({ error: "画像生成に失敗しました" }));

      if (!res.ok) {
        setError(data.error ?? "画像生成に失敗しました");
        if (data.userMessageId) {
          setMessages((prev) => prev.map((m) => (m.id === optimisticId ? { ...m, id: data.userMessageId } : m)));
        }
        return;
      }

      setMessages((prev) => [
        ...prev.map((m) => (m.id === optimisticId ? { ...m, id: data.userMessageId } : m)),
        data.assistantMessage,
      ]);
    } finally {
      setImageGenerating(false);
    }
  }

  async function handleGenerateVideo(prompt: string) {
    const optimisticId = `pending-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        role: "user",
        content: prompt,
        provider: null,
        model: null,
        createdAt: new Date().toISOString(),
        attachments: [],
      },
    ]);
    setError(null);
    setVideoGenerating(true);

    try {
      const startRes = await fetch("/api/videos/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, prompt }),
      });
      const startData = await startRes.json().catch(() => ({ error: "動画生成に失敗しました" }));

      if (!startRes.ok) {
        setError(startData.error ?? "動画生成に失敗しました");
        if (startData.userMessageId) {
          setMessages((prev) => prev.map((m) => (m.id === optimisticId ? { ...m, id: startData.userMessageId } : m)));
        }
        return;
      }

      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? { ...m, id: startData.userMessageId } : m)));

      const operationName = startData.operationName as string;
      const maxAttempts = 40; // ~40 * 8s ≈ 5.3 minutes, Veo generation typically finishes well inside this
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 8000));

        const statusRes = await fetch("/api/videos/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, operationName }),
        });
        const statusData = await statusRes.json().catch(() => ({ error: "動画生成の状態確認に失敗しました" }));

        if (!statusRes.ok) {
          setError(statusData.error ?? "動画生成の状態確認に失敗しました");
          return;
        }
        if (statusData.done) {
          if (statusData.error) {
            setError(statusData.error);
          } else if (statusData.assistantMessage) {
            setMessages((prev) => [...prev, statusData.assistantMessage]);
          }
          return;
        }
      }
      setError("動画生成がタイムアウトしました。もう一度お試しください。");
    } finally {
      setVideoGenerating(false);
    }
  }

  async function handleRegenerate(messageId: string) {
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;
    setMessages((prev) => prev.slice(0, idx));
    await streamAssistantReply({ conversationId, regenerateMessageId: messageId });
  }

  async function handleModelChange(provider: AiProviderId, model: string) {
    setConversation((prev) => (prev ? { ...prev, provider, model } : prev));
    localStorage.setItem("reinai-last-provider", provider);
    localStorage.setItem("reinai-last-model", model);
    await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, model }),
    });
  }

  async function handleShare() {
    if (!conversation) return;
    if (conversation.shareId) {
      const url = `${window.location.origin}/share/${conversation.shareId}`;
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1500);
      return;
    }
    const res = await fetch(`/api/conversations/${conversationId}/share`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    setConversation((prev) => (prev ? { ...prev, shareId: data.shareId } : prev));
    const url = `${window.location.origin}/share/${data.shareId}`;
    await navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1500);
  }

  function handleExport() {
    if (!conversation) return;
    const lines = [`# ${conversation.title}`, ""];
    for (const m of messages) {
      const label = m.role === "user" ? "## あなた" : m.role === "assistant" ? "## ReinAI" : "## システム";
      lines.push(label, "", m.content, "");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${conversation.title.replace(/[^\w\p{L}\p{N}-]+/gu, "_").slice(0, 60) || "chat"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-sm text-[var(--muted)]">読み込み中...</div>;
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium">{conversation?.title}</h2>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={handleExport}
            title="Markdownでエクスポート"
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
          >
            <Download size={16} />
          </button>
          <button
            onClick={handleShare}
            title="共有リンクをコピー"
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
          >
            {shareCopied ? <Check size={16} /> : <Share2 size={16} />}
          </button>
          {conversation && (
            <ModelSelector provider={conversation.provider} model={conversation.model} onChange={handleModelChange} />
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
        <div className="mx-auto max-w-3xl">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              id={m.id}
              role={m.role}
              content={m.content}
              attachments={m.attachments}
              onEdit={m.role === "user" ? handleEditMessage : undefined}
              onRegenerate={m.role === "assistant" ? handleRegenerate : undefined}
              editDisabled={streamingText !== null || m.id.startsWith("pending-")}
            />
          ))}
          {streamingText !== null && (
            <MessageBubble id="streaming" role="assistant" content={streamingText} pending />
          )}
          {imageGenerating && <MessageBubble id="image-generating" role="assistant" content="" pending />}
          {videoGenerating && <MessageBubble id="video-generating" role="assistant" content="" pending />}
          {error && (
            <p className="my-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-[var(--danger)]">{error}</p>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl">
        <ChatInput
          conversationId={conversationId}
          disabled={streamingText !== null || imageGenerating || videoGenerating}
          streaming={streamingText !== null}
          onSend={handleSend}
          onGenerateImage={handleGenerateImage}
          onGenerateVideo={handleGenerateVideo}
          onStop={handleStop}
        />
      </div>
    </div>
  );
}
