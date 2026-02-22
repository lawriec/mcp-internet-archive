# mcp-internet-archive

MCP server for searching and downloading from the [Internet Archive](https://archive.org) via the `ia` CLI.

Exposes four read-only tools that let Claude search items, read metadata, list files, and download content from archive.org.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Internet Archive CLI](https://archive.org/developers/internetarchive/cli.html) (`ia`)

### Installing the ia CLI

```bash
pip install internetarchive
ia configure   # optional — needed for some restricted items
ia --version   # verify installation
```

## Installation

```bash
git clone https://github.com/youruser/mcp-internet-archive.git
cd mcp-internet-archive
npm install
npm run build
```

## Claude Desktop Configuration

Add to your Claude Desktop config (`%APPDATA%\Claude\claude_desktop_config.json` on Windows, `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "internet-archive": {
      "command": "node",
      "args": ["C:/Users/youruser/dev/mcp/mcp-internet-archive/build/index.js"]
    }
  }
}
```

No environment variables needed — read-only operations don't require authentication.

## Tools

### ia_search

Search archive.org items using [Lucene query syntax](https://archive.org/advancedsearch.php).

| Parameter | Type     | Required | Description                          |
|-----------|----------|----------|--------------------------------------|
| `query`   | string   | yes      | Search query (Lucene syntax)         |
| `fields`  | string[] | no       | Fields to return per result          |
| `rows`    | number   | no       | Results per page (default 50)        |
| `page`    | number   | no       | Page number (default 1)              |

**Example queries:**
- `collection:prelinger subject:"san francisco"`
- `creator:"Mark Twain" mediatype:texts`
- `title:"Apollo 11"`

### ia_metadata

Get full metadata for a specific item.

| Parameter    | Type   | Required | Description              |
|--------------|--------|----------|--------------------------|
| `identifier` | string | yes      | Item identifier          |

### ia_download

Download files from an item to a local directory.

| Parameter    | Type    | Required | Description                              |
|--------------|---------|----------|------------------------------------------|
| `identifier` | string  | yes      | Item identifier                          |
| `glob`       | string  | no       | Filter files by glob (e.g. `*.mp4`)      |
| `destdir`    | string  | no       | Destination directory                    |
| `format`     | string  | no       | Filter by format (e.g. `PDF`, `MPEG4`)   |
| `dry_run`    | boolean | no       | Preview URLs without downloading         |

### ia_list

List all files in an item with metadata (name, size, format, checksums).

| Parameter    | Type   | Required | Description              |
|--------------|--------|----------|--------------------------|
| `identifier` | string | yes      | Item identifier          |

## Troubleshooting

**"The Internet Archive CLI (ia) is not installed or not on PATH"**
- Install with `pip install internetarchive`
- Ensure the `ia` command is on your system PATH
- Verify with `ia --version`

**Timeouts on large downloads**
- Downloads have a 10-minute timeout. For very large items, use `glob` or `format` to download specific files.

**Empty search results**
- Check your query syntax at [archive.org/advancedsearch.php](https://archive.org/advancedsearch.php)
- Try broader queries or different field names

## License

MIT
