import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { runIa, checkIaAvailable } from "../utils/ia-runner.js";
import { validateIdentifier } from "../utils/sanitize.js";

export interface MetadataArgs {
  identifier: string;
}

export async function handleMetadata(
  args: MetadataArgs
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
    const { stdout } = await runIa(["metadata", identifier]);

    const trimmed = stdout.trim();
    if (!trimmed) {
      return {
        content: [
          {
            type: "text",
            text: `No metadata found for "${identifier}". The item may not exist.`,
          },
        ],
        isError: true,
      };
    }

    const parsed = JSON.parse(trimmed);
    return {
      content: [{ type: "text", text: JSON.stringify(parsed, null, 2) }],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Metadata retrieval failed: ${msg}` }],
      isError: true,
    };
  }
}
