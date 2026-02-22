import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { runIa, checkIaAvailable } from "../utils/ia-runner.js";
import {
  validateQuery,
  validateRows,
  validatePage,
  validateFieldName,
} from "../utils/sanitize.js";

export interface SearchArgs {
  query: string;
  fields?: string[];
  rows?: number;
  page?: number;
}

export async function handleSearch(args: SearchArgs): Promise<CallToolResult> {
  try {
    await checkIaAvailable();
  } catch (e) {
    return {
      content: [{ type: "text", text: (e as Error).message }],
      isError: true,
    };
  }

  try {
    const query = validateQuery(args.query);
    const rows = args.rows ? validateRows(args.rows) : 50;
    const page = args.page ? validatePage(args.page) : 1;

    const iaArgs: string[] = [
      "search",
      query,
      "--parameters",
      `page=${page}&rows=${rows}`,
    ];

    if (args.fields && args.fields.length > 0) {
      for (const field of args.fields) {
        const validated = validateFieldName(field);
        iaArgs.push("--field", validated);
      }
    }

    const { stdout } = await runIa(iaArgs);

    // ia search outputs JSON lines (one JSON object per line)
    const lines = stdout.trim().split("\n").filter(Boolean);
    const results: unknown[] = [];
    for (const line of lines) {
      try {
        results.push(JSON.parse(line));
      } catch {
        // skip malformed lines
      }
    }

    const output = {
      total_results: results.length,
      page,
      rows,
      results,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Search failed: ${msg}` }],
      isError: true,
    };
  }
}
