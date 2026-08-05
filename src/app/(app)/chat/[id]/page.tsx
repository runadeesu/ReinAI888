import { ChatWindow } from "@/components/chat/chat-window";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChatWindow conversationId={id} />;
}
