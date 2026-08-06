"use client";

import { useEffect, useRef, useState } from "react";
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
}

export function ChatWindow({ conversationId }: { conversationId: string }) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const handleSendRef = useRef<((content: string, attachmentIds: string[]) => void) | null>(null);

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
        handleSendRef.current?.(draft, []);
      }
    });
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingText]);

  async function streamAssistantReply(payload: Record<string, unknown>): Promise<string | null> {
    setError(null);
    setStreamingText("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({ error: "エラーが発生しました" }));
      setError(data.error ?? "エラーが発生しました");
      setStreamingText(null);
      return null;
    }

    const userMessageId = res.headers.get("X-User-Message-Id");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
      setStreamingText(fullText);
    }

    setStreamingText(null);
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

    return userMessageId;
  }

  async function handleSend(content: string, attachmentIds: string[]) {
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

    const realId = await streamAssistantReply({ conversationId, content, attachmentIds });
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

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-sm text-[var(--muted)]">読み込み中...</div>;
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h2 className="truncate text-sm font-medium">{conversation?.title}</h2>
        {conversation && (
          <ModelSelector provider={conversation.provider} model={conversation.model} onChange={handleModelChange} />
        )}
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
              editDisabled={streamingText !== null || m.id.startsWith("pending-")}
            />
          ))}
          {streamingText !== null && (
            <MessageBubble id="streaming" role="assistant" content={streamingText} pending />
          )}
          {error && (
            <p className="my-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-[var(--danger)]">{error}</p>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl">
        <ChatInput conversationId={conversationId} disabled={streamingText !== null} onSend={handleSend} />
      </div>
    </div>
  );
}
