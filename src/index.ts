#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import {
  handleSearch,
  handleMetadata,
  handleDownload,
  handleList,
} from "./tools/index.js";

const server = new Server(
  { name: "internet-archive", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "ia_search",
      description:
        "Search the Internet Archive (archive.org) for items. " +
        "Returns metadata for matching items as JSON.",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description:
              "Search query. Supports Lucene syntax, e.g. " +
              "'collection:prelinger subject:\"san francisco\"' or " +
              "'creator:\"Mark Twain\"'",
          },
          fields: {
            type: "array",
            items: { type: "string" },
            description:
              "Metadata fields to return for each result " +
              "(e.g. ['identifier', 'title', 'date', 'description']). " +
              "If omitted, returns the default field set.",
          },
          rows: {
            type: "number",
            description:
              "Number of results per page (default 50, max 10000)",
          },
          page: {
            type: "number",
            description: "Page number for pagination (default 1)",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "ia_metadata",
      description:
        "Get the full metadata for a specific Internet Archive item. " +
        "Returns JSON with all metadata fields, file list, reviews, etc.",
      inputSchema: {
        type: "object" as const,
        properties: {
          identifier: {
            type: "string",
            description:
              "The Internet Archive item identifier " +
              "(e.g. 'TripDown1905' or 'gov.uscourts.cacd.123456')",
          },
        },
        required: ["identifier"],
      },
    },
    {
      name: "ia_download",
      description:
        "Download files from an Internet Archive item to a local directory. " +
        "Can filter by glob pattern or format name. " +
        "Use dry_run=true to preview what would be downloaded.",
      inputSchema: {
        type: "object" as const,
        properties: {
          identifier: {
            type: "string",
            description: "The Internet Archive item identifier",
          },
          glob: {
            type: "string",
            description:
              "Glob pattern to filter files (e.g. '*.mp4', '*.pdf')",
          },
          destdir: {
            type: "string",
            description:
              "Destination directory for downloaded files. " +
              "If omitted, downloads to the current working directory.",
          },
          format: {
            type: "string",
            description:
              "Download only files of this format " +
              "(e.g. 'MPEG4', 'PDF', 'EPUB'). " +
              "Mutually exclusive with glob.",
          },
          dry_run: {
            type: "boolean",
            description:
              "If true, print download URLs without actually downloading.",
          },
        },
        required: ["identifier"],
      },
    },
    {
      name: "ia_list",
      description:
        "List all files in an Internet Archive item with metadata " +
        "(name, size, format, checksums). " +
        "Useful for exploring an item before downloading.",
      inputSchema: {
        type: "object" as const,
        properties: {
          identifier: {
            type: "string",
            description: "The Internet Archive item identifier",
          },
        },
        required: ["identifier"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "ia_search":
      return handleSearch(
        args as {
          query: string;
          fields?: string[];
          rows?: number;
          page?: number;
        }
      );
    case "ia_metadata":
      return handleMetadata(args as { identifier: string });
    case "ia_download":
      return handleDownload(
        args as {
          identifier: string;
          glob?: string;
          destdir?: string;
          format?: string;
          dry_run?: boolean;
        }
      );
    case "ia_list":
      return handleList(args as { identifier: string });
    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("internet-archive MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
