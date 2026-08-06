import { streamText, tool, stepCountIs, type ModelMessage } from "ai";
import { z } from "zod";
import { getLanguageModel } from "../ai-client.js";
import { listDirectory, readFile, writeFile } from "./fs.js";
import { runCommand } from "./exec.js";
import type { AgentEvent, ChatMessage } from "../../shared/types.js";
import { getApiKey } from "./settings.js";
import type { AiProviderId } from "../../shared/types.js";

const SYSTEM_PROMPT = `あなたはReinAI Codeです。ユーザーのPC上の実際のプロジェクトフォルダを操作できるAIコーディングアシスタントです。

ルール:
- ファイルを読む/書く/一覧表示する/コマンドを実行する、という道具(ツール)が使えます。実際に使ってタスクを終わらせてください。推測でコードを書かず、必要ならまずファイルを読んで確認してください。
- 破壊的な操作(削除、force pushなど)を行う前は、その旨を説明してください。
- 出力は簡潔に。前置きや繰り返しは避け、行った作業と結果を明確に報告してください。`;

interface PendingDiff {
  toolCallId: string;
  path: string;
  before: string;
  after: string;
}

function buildTools(projectRoot: string, diffQueue: PendingDiff[]) {
  return {
    list_directory: tool({
      description: "プロジェクトフォルダ内のディレクトリの内容を一覧表示する",
      inputSchema: z.object({
        path: z.string().describe("プロジェクトルートからの相対パス。ルート自体は空文字列またはドット"),
      }),
      execute: async ({ path: relPath }: { path: string }) => {
        const entries = await listDirectory(projectRoot, relPath || ".");
        return entries.map((e) => `${e.isDirectory ? "[dir] " : "      "}${e.relPath}`).join("\n") || "(空)";
      },
    }),
    read_file: tool({
      description: "プロジェクト内のファイルの中身を読む",
      inputSchema: z.object({ path: z.string().describe("プロジェクトルートからの相対パス") }),
      execute: async ({ path: relPath }: { path: string }) => {
        return await readFile(projectRoot, relPath);
      },
    }),
    write_file: tool({
      description: "プロジェクト内のファイルに書き込む(新規作成または上書き)。ファイル全体の内容を渡すこと",
      inputSchema: z.object({
        path: z.string().describe("プロジェクトルートからの相対パス"),
        content: z.string().describe("ファイルの新しい内容(全体)"),
      }),
      execute: async (
        { path: relPath, content }: { path: string; content: string },
        { toolCallId }: { toolCallId: string }
      ) => {
        let before = "";
        try {
          before = await readFile(projectRoot, relPath);
        } catch {
          before = "";
        }
        await writeFile(projectRoot, relPath, content);
        diffQueue.push({ toolCallId, path: relPath, before, after: content });
        return `書き込み完了: ${relPath} (${content.length}文字)`;
      },
    }),
    run_command: tool({
      description: "プロジェクトフォルダをカレントディレクトリとしてシェルコマンドを実行する(ビルド、テスト、git操作など)",
      inputSchema: z.object({ command: z.string().describe("実行するシェルコマンド") }),
      execute: async ({ command }: { command: string }) => {
        const result = await runCommand(projectRoot, command);
        const status = result.timedOut ? "タイムアウト" : `終了コード ${result.exitCode}`;
        return `[${status}]\n${result.output || "(出力なし)"}`;
      },
    }),
  };
}

export async function* runAgent(
  projectRoot: string,
  provider: AiProviderId,
  model: string,
  conversation: ChatMessage[],
  signal: AbortSignal
): AsyncGenerator<AgentEvent> {
  const apiKey = getApiKey(provider);
  if (!apiKey) {
    yield { type: "error", message: `${provider} のAPIキーが設定されていません。設定から登録してください。` };
    return;
  }

  const messages: ModelMessage[] = conversation.map((m) => ({ role: m.role, content: m.content }));
  const diffQueue: PendingDiff[] = [];

  try {
    const result = streamText({
      model: getLanguageModel(provider, model, apiKey),
      system: SYSTEM_PROMPT,
      messages,
      tools: buildTools(projectRoot, diffQueue),
      stopWhen: stepCountIs(20),
      abortSignal: signal,
    });

    for await (const part of result.fullStream) {
      switch (part.type) {
        case "text-delta":
          yield { type: "text-delta", text: part.text };
          break;
        case "tool-call":
          yield { type: "tool-call", toolName: part.toolName, args: (part.input as Record<string, unknown>) ?? {} };
          break;
        case "tool-result": {
          yield { type: "tool-result", toolName: part.toolName, result: String(part.output ?? "") };
          if (part.toolName === "write_file") {
            const toolCallId = (part as { toolCallId?: string }).toolCallId;
            const idx = diffQueue.findIndex((d) => d.toolCallId === toolCallId);
            if (idx !== -1) {
              const diff = diffQueue.splice(idx, 1)[0];
              yield { type: "file-diff", path: diff.path, before: diff.before, after: diff.after };
            }
          }
          break;
        }
        case "error":
          yield { type: "error", message: part.error instanceof Error ? part.error.message : String(part.error) };
          break;
        default:
          break;
      }
    }

    yield { type: "done" };
  } catch (err) {
    yield { type: "error", message: err instanceof Error ? err.message : String(err) };
  }
}
