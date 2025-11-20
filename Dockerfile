# Use Node.js LTS
FROM node:24-alpine
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

COPY imas-mcp.js ./

EXPOSE 3000
CMD ["pnpm", "start"]
