# Container image for the secfinapi-mcp stdio server.
# Used by Glama (and any container host) to start the server and run
# introspection checks. Build runs tsc via the package `prepare` script.
FROM node:20-slim

WORKDIR /app

# Install deps + build (package `prepare` script runs `npm run build`).
COPY package.json package-lock.json* tsconfig.json ./
COPY src ./src
RUN npm ci || npm install

# stdio MCP server — communicates over stdin/stdout.
ENTRYPOINT ["node", "dist/index.js"]
