import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT_MS = 120_000;
export const DOWNLOAD_TIMEOUT_MS = 600_000;

const IS_WINDOWS = process.platform === "win32";

/**
 * Cached resolved executable info. Resolved once, reused for all calls.
 */
let resolvedIa: { command: string; useShell: boolean } | null = null;

/**
 * On Windows, pip-installed CLI tools are often behind .bat/.cmd shims
 * (e.g. from pyenv). Running .bat files requires shell: true in execFile,
 * which makes command injection possible through cmd.exe metacharacters
 * like & | < > in argument values.
 *
 * To avoid this, we resolve the real .exe behind the shim so we can call
 * execFile WITHOUT a shell — making injection impossible regardless of
 * argument content.
 *
 * Resolution strategies (Windows only):
 * 1. Try `ia.exe` directly via execFile (works if real .exe is on PATH)
 * 2. Read pyenv version file and find ia.exe in the matching version's Scripts dir
 * 3. Walk pyenv versions directories looking for ia.exe
 * 4. Fall back to `ia` with shell: true (last resort, validated inputs only)
 */
async function resolveIaExecutable(): Promise<{
  command: string;
  useShell: boolean;
}> {
  if (resolvedIa) return resolvedIa;

  if (!IS_WINDOWS) {
    resolvedIa = { command: "ia", useShell: false };
    return resolvedIa;
  }

  // Strategy 1: ia.exe directly on PATH
  try {
    await execFileAsync("ia.exe", ["--version"], { timeout: 5_000 });
    resolvedIa = { command: "ia.exe", useShell: false };
    return resolvedIa;
  } catch {
    // Not on PATH as .exe
  }

  // Strategy 2: Find via pyenv version file
  const pyenvRoot =
    process.env.PYENV_ROOT ||
    process.env.PYENV ||
    join(process.env.USERPROFILE || "", ".pyenv", "pyenv-win");
  const versionsDir = join(pyenvRoot, "versions");

  if (existsSync(versionsDir)) {
    const versionFile = join(pyenvRoot, "version");
    if (existsSync(versionFile)) {
      const versionPrefix = readFileSync(versionFile, "utf-8")
        .trim()
        .split(/\r?\n/)[0];

      // Version file may say "3.13" but directory is "3.13.7" — prefix match
      try {
        const dirs = readdirSync(versionsDir);
        const match = dirs.find((d) => d.startsWith(versionPrefix));
        if (match) {
          const candidate = join(versionsDir, match, "Scripts", "ia.exe");
          if (existsSync(candidate)) {
            resolvedIa = { command: candidate, useShell: false };
            return resolvedIa;
          }
        }
      } catch {
        // Can't read versions directory
      }
    }

    // Strategy 3: Search all pyenv version directories for ia.exe
    try {
      const dirs = readdirSync(versionsDir);
      for (const dir of dirs) {
        const candidate = join(versionsDir, dir, "Scripts", "ia.exe");
        if (existsSync(candidate)) {
          resolvedIa = { command: candidate, useShell: false };
          return resolvedIa;
        }
      }
    } catch {
      // Can't enumerate versions
    }
  }

  // Strategy 4: Check standard pip user/global Scripts directories
  const userProfile = process.env.USERPROFILE || "";
  const pipPaths = [
    join(userProfile, "AppData", "Local", "Programs", "Python", "**", "Scripts", "ia.exe"),
    join(userProfile, "AppData", "Roaming", "Python", "**", "Scripts", "ia.exe"),
  ];
  // Check non-glob common Python install locations
  for (const base of [
    join(userProfile, "AppData", "Local", "Programs", "Python"),
    join(userProfile, "AppData", "Roaming", "Python"),
    "C:\\Python313\\Scripts",
    "C:\\Python312\\Scripts",
    "C:\\Python311\\Scripts",
  ]) {
    if (existsSync(base)) {
      const candidate = base.endsWith("Scripts")
        ? join(base, "ia.exe")
        : null;
      if (candidate && existsSync(candidate)) {
        resolvedIa = { command: candidate, useShell: false };
        return resolvedIa;
      }
      // Check subdirectories (e.g. Python313/Scripts/)
      try {
        for (const sub of readdirSync(base)) {
          const scriptsCandidate = join(base, sub, "Scripts", "ia.exe");
          if (existsSync(scriptsCandidate)) {
            resolvedIa = { command: scriptsCandidate, useShell: false };
            return resolvedIa;
          }
        }
      } catch {
        // Can't read directory
      }
    }
  }

  // Last resort: use `ia` with shell (required for .bat shims).
  // This path is only used when all .exe resolution strategies fail.
  // Input validation in sanitize.ts constrains what can be passed.
  console.error(
    "Warning: Could not resolve ia.exe directly. " +
      "Using shell mode — ensure inputs are validated."
  );
  resolvedIa = { command: "ia", useShell: true };
  return resolvedIa;
}

export interface IaResult {
  stdout: string;
  stderr: string;
}

/**
 * Check whether the `ia` CLI is available.
 * Returns the version string if found, throws otherwise.
 * Also warms up the executable resolution cache.
 */
export async function checkIaAvailable(): Promise<string> {
  try {
    const { command, useShell } = await resolveIaExecutable();
    const { stdout } = await execFileAsync(command, ["--version"], {
      timeout: 10_000,
      ...(useShell ? { shell: true } : {}),
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
 * Resolves the real ia.exe on Windows to avoid shell: true, which
 * prevents command injection via cmd.exe metacharacters.
 * Arguments are always passed as an array — never interpolated into
 * a command string.
 */
export async function runIa(
  args: string[],
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<IaResult> {
  const { command, useShell } = await resolveIaExecutable();

  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout: timeoutMs,
      maxBuffer: 50 * 1024 * 1024,
      ...(useShell ? { shell: true } : {}),
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
