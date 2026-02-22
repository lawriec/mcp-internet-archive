import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  runIa,
  checkIaAvailable,
  DOWNLOAD_TIMEOUT_MS,
} from "../utils/ia-runner.js";
import {
  validateIdentifier,
  validateGlob,
  validateDestdir,
  validateFormat,
} from "../utils/sanitize.js";

export interface DownloadArgs {
  identifier: string;
  glob?: string;
  destdir?: string;
  format?: string;
  dry_run?: boolean;
}

export async function handleDownload(
  args: DownloadArgs
): Promise<CallToolResult> {
  try {
    await checkIaAvailable();
  } catch (e) {
    return {
      content: [{ type: "text", text: (e as Error).message }],
      isError: true,
    };
  }

  try {
    const identifier = validateIdentifier(args.identifier);
    const iaArgs: string[] = ["download", identifier];

    if (args.glob) {
      iaArgs.push("--glob", validateGlob(args.glob));
    }

    if (args.destdir) {
      iaArgs.push("--destdir", validateDestdir(args.destdir));
    }

    if (args.format) {
      iaArgs.push("--format", validateFormat(args.format));
    }

    if (args.dry_run) {
      iaArgs.push("--dry-run");
    }

    const { stdout, stderr } = await runIa(iaArgs, DOWNLOAD_TIMEOUT_MS);

    const output = [stdout, stderr].filter(Boolean).join("\n").trim();

    if (!output) {
      return {
        content: [
          {
            type: "text",
            text: `Download completed for "${identifier}" (no output — files may already exist).`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: args.dry_run
            ? `Dry run for "${identifier}":\n${output}`
            : `Download completed for "${identifier}":\n${output}`,
        },
      ],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Download failed: ${msg}` }],
      isError: true,
    };
  }
}
