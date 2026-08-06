import { spawn } from "node:child_process";

const MAX_OUTPUT_CHARS = 20_000;
const TIMEOUT_MS = 120_000;

export interface ExecResult {
  exitCode: number | null;
  output: string;
  timedOut: boolean;
}

/**
 * Runs a shell command with the project root as cwd. Uses the OS shell
 * (cmd.exe on Windows, /bin/sh elsewhere) so the agent can use normal shell
 * syntax (pipes, &&, etc.) the way it would in a real terminal.
 */
export function runCommand(cwd: string, command: string, onChunk?: (chunk: string) => void): Promise<ExecResult> {
  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      windowsHide: true,
      env: process.env,
    });

    let output = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, TIMEOUT_MS);

    function append(chunk: Buffer) {
      const text = chunk.toString("utf-8");
      if (output.length < MAX_OUTPUT_CHARS) {
        output += text;
        onChunk?.(text);
      }
    }

    child.stdout?.on("data", append);
    child.stderr?.on("data", append);

    child.on("close", (code) => {
      clearTimeout(timer);
      if (output.length > MAX_OUTPUT_CHARS) {
        output = output.slice(0, MAX_OUTPUT_CHARS) + "\n...(出力が長いため省略)";
      }
      resolve({ exitCode: code, output, timedOut });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ exitCode: null, output: `${output}\n[起動エラー: ${err.message}]`, timedOut: false });
    });
  });
}
