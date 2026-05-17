#!/usr/bin/env node
/**
 * SECfinAPI MCP server.
 *
 * Exposes SECfinAPI's standardized SEC EDGAR financial data as MCP tools so
 * an AI assistant (Claude Desktop, Cursor, VS Code, …) can fetch company
 * fundamentals on demand. The server is a thin stdio wrapper over the
 * SECfinAPI REST API — it holds the user's API key and runs locally.
 *
 * Config (env vars):
 *   SECFINAPI_KEY        required — your API key from https://www.secfinapi.com
 *   SECFINAPI_BASE_URL   optional — defaults to the production API
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE =
  process.env.SECFINAPI_BASE_URL ??
  "https://sec-financial-api-production.up.railway.app";
const API_KEY = process.env.SECFINAPI_KEY ?? "";

/** Call a SECfinAPI endpoint and return the parsed JSON (or raw text). */
async function callApi(
  path: string,
  params: Record<string, string | undefined> = {},
): Promise<unknown> {
  if (!API_KEY) {
    throw new Error(
      "SECFINAPI_KEY is not set. Get a free key at https://www.secfinapi.com " +
        "and set it in the MCP server's env config.",
    );
  }
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, v);
  }
  const res = await fetch(url, { headers: { "X-API-Key": API_KEY } });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`SECfinAPI returned ${res.status}: ${body.slice(0, 300)}`);
  }
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function fail(err: unknown): ToolResult {
  const msg = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
}

const tickerArg = z
  .string()
  .describe("US stock ticker, e.g. AAPL, MSFT, BRK.B");
const periodArg = z
  .enum(["annual", "quarterly", "ttm", "all"])
  .optional()
  .describe("Reporting period filter. Defaults to annual (10-K filings).");

const server = new McpServer({ name: "secfinapi", version: "0.1.0" });

server.tool(
  "get_company_info",
  "Company metadata for a US public company: legal name, SIC/industry, " +
    "exchange, fiscal year end, S&P 500 membership, and a link to its " +
    "original filings on SEC EDGAR.",
  { ticker: tickerArg },
  async ({ ticker }) => {
    try {
      return ok(await callApi(`/v1/company/${ticker}/info`));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  "get_income_statement",
  "Standardized income statement (revenue, cost of revenue, operating " +
    "income, net income, EPS) for a US public company, parsed from SEC " +
    "EDGAR XBRL filings. Each period includes its filing date.",
  { ticker: tickerArg, period: periodArg },
  async ({ ticker, period }) => {
    try {
      return ok(
        await callApi(`/v1/company/${ticker}/income-statement`, { period }),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  "get_balance_sheet",
  "Standardized balance sheet (assets, liabilities, equity) for a US " +
    "public company, parsed from SEC EDGAR XBRL filings.",
  { ticker: tickerArg, period: periodArg },
  async ({ ticker, period }) => {
    try {
      return ok(
        await callApi(`/v1/company/${ticker}/balance-sheet`, { period }),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  "get_cash_flow",
  "Standardized cash flow statement (operating, investing, financing " +
    "cash flows) for a US public company, parsed from SEC EDGAR XBRL.",
  { ticker: tickerArg, period: periodArg },
  async ({ ticker, period }) => {
    try {
      return ok(await callApi(`/v1/company/${ticker}/cash-flow`, { period }));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  "get_metrics",
  "50+ financial ratios and metrics for a US public company: ROE, ROIC, " +
    "gross/operating/net margin, FCF margin, debt/equity, current ratio, " +
    "and year-over-year growth rates.",
  { ticker: tickerArg },
  async ({ ticker }) => {
    try {
      return ok(await callApi(`/v1/company/${ticker}/metrics`));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  "list_companies",
  "List or search the US public companies available in SECfinAPI. " +
    "Optionally filter by a name/ticker search term.",
  {
    search: z
      .string()
      .optional()
      .describe("Optional name or ticker search term."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .describe("Max companies to return (1-200)."),
  },
  async ({ search, limit }) => {
    try {
      return ok(
        await callApi("/v1/companies", {
          search,
          limit: limit !== undefined ? String(limit) : undefined,
        }),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio servers must not write to stdout — it's the protocol channel.
  console.error("secfinapi-mcp running (stdio)");
}

main().catch((err) => {
  console.error("secfinapi-mcp fatal:", err);
  process.exit(1);
});
