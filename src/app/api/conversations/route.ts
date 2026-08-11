import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { conversationSchema } from "@/lib/validation/schemas";
import { AI_PROVIDERS } from "@/lib/ai/models";
import { getAvailableProviders } from "@/lib/ai/resolve-key";

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const url = new URL(request.url);
  const search = url.searchParams.get("q")?.trim();
  const projectId = url.searchParams.get("projectId");
  const folderId = url.searchParams.get("folderId");
  const pinned = url.searchParams.get("pinned");
  const favorite = url.searchParams.get("favorite");
  const archived = url.searchParams.get("archived");

  const conversations = await prisma.conversation.findMany({
    where: {
      userId,
      isArchived: archived === "true",
      ...(search ? { title: { contains: search } } : {}),
      ...(projectId ? { projectId } : {}),
      ...(folderId ? { folderId } : {}),
      ...(pinned === "true" ? { isPinned: true } : {}),
      ...(favorite === "true" ? { isFavorite: true } : {}),
    },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      provider: true,
      model: true,
      isPinned: true,
      isFavorite: true,
      isArchived: true,
      tags: true,
      projectId: true,
      folderId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = conversationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が正しくありません" }, { status: 400 });
  }

  const available = await getAvailableProviders(userId);
  const provider = parsed.data.provider ?? available[0] ?? "anthropic";
  const defaultModel = AI_PROVIDERS[provider as keyof typeof AI_PROVIDERS]?.models[0]?.id ?? "claude-sonnet-5";

  const conversation = await prisma.conversation.create({
    data: {
      userId,
      title: parsed.data.title ?? "New chat",
      provider,
      model: parsed.data.model ?? defaultModel,
      projectId: parsed.data.projectId ?? null,
      folderId: parsed.data.folderId ?? null,
      systemPrompt: parsed.data.systemPrompt ?? null,
    },
  });

  return NextResponse.json({ conversation });
}
