import { z } from "zod";

const password = z
  .string()
  .min(8, "パスワードは8文字以上で入力してください")
  .regex(/[a-z]/, "小文字を含めてください")
  .regex(/[A-Z]/, "大文字を含めてください")
  .regex(/[0-9]/, "数字を含めてください");

export const registerSchema = z.object({
  name: z.string().min(1).max(64),
  email: z.string().email(),
  password,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});

export const changeEmailSchema = z.object({
  newEmail: z.string().email(),
  currentPassword: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  bio: z.string().max(280).optional(),
  image: z.string().url().optional().or(z.literal("")),
  customInstructions: z.string().max(4000).optional().nullable(),
});

export const apiKeySchema = z.object({
  provider: z.enum(["anthropic", "openai", "google", "nvidia", "openrouter"]),
  key: z.string().min(10),
  label: z.string().max(64).optional(),
});

export const promptSchema = z.object({
  title: z.string().min(1).max(120),
  content: z.string().min(1),
  categoryId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
});

export const conversationSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  projectId: z.string().optional().nullable(),
  folderId: z.string().optional().nullable(),
  systemPrompt: z.string().optional().nullable(),
});

export const sendMessageSchema = z
  .object({
    conversationId: z.string().min(1),
    content: z.string().optional(),
    attachmentIds: z.array(z.string()).optional(),
    editMessageId: z.string().optional(),
    useSearch: z.boolean().optional(),
    // Regenerating re-runs the reply for the last user turn without adding
    // new content; everything from this assistant message onward is dropped.
    regenerateMessageId: z.string().optional(),
  })
  .refine((data) => data.regenerateMessageId || (data.content && data.content.trim().length > 0), {
    message: "メッセージを入力してください",
    path: ["content"],
  });

export const generateImageSchema = z.object({
  conversationId: z.string().min(1),
  prompt: z.string().min(1).max(2000),
});
