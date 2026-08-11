export interface ConversationSummary {
  id: string;
  title: string;
  provider: string;
  model: string;
  isPinned: boolean;
  isFavorite: boolean;
  tags: string; // JSON-encoded string[]
  projectId: string | null;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  lastUsedAt: string;
}

export interface MessageItem {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  provider: string | null;
  model: string | null;
  createdAt: string;
  isPinned?: boolean;
  reactions?: string[];
  attachments: { id: string; fileName: string; mimeType: string; sizeBytes: number }[];
}
