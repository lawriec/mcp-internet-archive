import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT_MS = 120_000;
export const DOWNLOAD_TIMEOUT_MS = 600_000;

const IS_WINDOWS = process.platform === "win32";

// On Windows, .bat/.cmd shims (e.g. from pyenv, pip) require a shell to execute.
// Input validation in sanitize.ts provides defense-in-depth.
const SHELL_OPTION = IS_WINDOWS ? { shell: true } : {};

/**
 * Escape a single argument for cmd.exe on Windows.
 * Characters like & | < > ^ are special in cmd.exe and must be escaped with ^.
 */
function escapeCmdArg(arg: string): string {
  if (!IS_WINDOWS) return arg;
  // Wrap in double quotes and escape internal double quotes
  // This prevents cmd.exe from interpreting &, |, <, >, ^, etc.
  return `"${arg.replace(/"/g, '""')}"`;
}

/**
 * Prepare arguments for execution. On Windows with shell: true,
 * arguments containing shell metacharacters must be quoted.
 */
function prepareArgs(args: string[]): string[] {
  if (!IS_WINDOWS) return args;
  return args.map((arg) => {
    // Only escape args that contain cmd.exe special characters
    if (/[&|<>^%]/.test(arg)) {
      return escapeCmdArg(arg);
    }
    return arg;
  });
}

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
      ...SHELL_OPTION,
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
 * Uses execFile with args as an array. On Windows, shell: true is needed
 * for .bat shims, and arguments with shell metacharacters are escaped.
 */
export async function runIa(
  args: string[],
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<IaResult> {
  const safeArgs = prepareArgs(args);
  try {
    const { stdout, stderr } = await execFileAsync("ia", safeArgs, {
      timeout: timeoutMs,
      maxBuffer: 50 * 1024 * 1024,
      ...SHELL_OPTION,
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
