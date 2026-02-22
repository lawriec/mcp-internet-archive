import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { runIa, checkIaAvailable } from "../utils/ia-runner.js";
import { validateIdentifier } from "../utils/sanitize.js";

export interface ListArgs {
  identifier: string;
}

export async function handleList(args: ListArgs): Promise<CallToolResult> {
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
    const { stdout } = await runIa(["list", identifier, "--all", "--verbose"]);

    const trimmed = stdout.trim();
    if (!trimmed) {
      return {
        content: [
          {
            type: "text",
            text: `No files found for "${identifier}". The item may not exist.`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        { type: "text", text: `Files in "${identifier}":\n\n${trimmed}` },
      ],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `List failed: ${msg}` }],
      isError: true,
    };
  }
}
