import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT_MS = 120_000;
export const DOWNLOAD_TIMEOUT_MS = 600_000;

export interface IaResult {
  stdout: string;
  stderr: string;
}

/**
 * Check whether the `ia` CLI is available on PATH.
 * Returns the version string if found, throws otherwise.
 */
export async function checkIaAvailable(): Promise<string> {
  try {
    const { stdout } = await execFileAsync("ia", ["--version"], {
      timeout: 10_000,
    });
    return stdout.trim();
  } catch {
    throw new Error(
      "The Internet Archive CLI (ia) is not installed or not on PATH.\n" +
        "Install it with: pip install internetarchive\n" +
        "Then configure with: ia configure\n" +
        "Verify with: ia --version"
    );
  }
}

/**
 * Execute an ia CLI command with the given arguments.
 *
 * Uses execFile (NOT exec) to avoid shell interpretation of arguments.
 * All arguments are passed as an array, never interpolated into a string.
 */
export async function runIa(
  args: string[],
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<IaResult> {
  try {
    const { stdout, stderr } = await execFileAsync("ia", args, {
      timeout: timeoutMs,
      maxBuffer: 50 * 1024 * 1024,
    });
    return { stdout, stderr };
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "killed" in error &&
      (error as { killed: boolean }).killed
    ) {
      throw new Error(
        `ia command timed out after ${timeoutMs / 1000} seconds. ` +
          `Command: ia ${args.join(" ")}`
      );
    }
    const execError = error as {
      stderr?: string;
      stdout?: string;
      message?: string;
    };
    const msg = execError.stderr || execError.message || String(error);
    throw new Error(`ia command failed: ${msg}`);
  }
}
