# secfinapi-mcp

MCP server for [SECfinAPI](https://www.secfinapi.com) — standardized SEC EDGAR
financial data (income statements, balance sheets, cash flow, 50+ ratios) as
tools for Claude, Cursor, and other AI assistants.

Ask your AI assistant things like *"What's Apple's revenue trend?"* or
*"Compare MSFT and GOOGL operating margins"* — it fetches the data live
through SECfinAPI.

It runs locally on your machine and is a thin wrapper over the SECfinAPI
REST API. No server to host, no extra cost.

## Setup

1. Get an API key (free) at <https://www.secfinapi.com>.
2. Add the server to your AI assistant's MCP config.

### Claude Desktop

Open **Settings → Developer → Edit Config** and add:

**Once published to npm:**

```json
{
  "mcpServers": {
    "secfinapi": {
      "command": "npx",
      "args": ["-y", "secfinapi-mcp"],
      "env": { "SECFINAPI_KEY": "your-api-key-here" }
    }
  }
}
```

**Running from source (before publishing):**

```json
{
  "mcpServers": {
    "secfinapi": {
      "command": "node",
      "args": ["C:/path/to/sec-financial-mcp/dist/index.js"],
      "env": { "SECFINAPI_KEY": "your-api-key-here" }
    }
  }
}
```

Restart Claude Desktop. The 6 tools below appear under the tools (🔌) menu.

### Cursor / VS Code

Same config shape in the editor's MCP settings — `command`, `args`, and the
`SECFINAPI_KEY` env var.

## Tools

| Tool | Returns |
|------|---------|
| `get_company_info` | Company metadata + a link to its filings on SEC EDGAR |
| `get_income_statement` | Standardized income statement (with filing dates) |
| `get_balance_sheet` | Standardized balance sheet |
| `get_cash_flow` | Standardized cash flow statement |
| `get_metrics` | 50+ financial ratios (ROE, ROIC, margins, growth…) |
| `list_companies` | List / search the available US public companies |

## Environment variables

| Variable | Required | Default |
|----------|----------|---------|
| `SECFINAPI_KEY` | yes | — |
| `SECFINAPI_BASE_URL` | no | the SECfinAPI production API |

## Run from source

```bash
npm install
npm run build
SECFINAPI_KEY=your-key node dist/index.js
```

## Publishing (maintainer)

```bash
npm run build
npm publish
```

## License

MIT
