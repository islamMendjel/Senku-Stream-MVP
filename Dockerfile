# Stage 1: Build client and prepare backend
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy sources
COPY tsconfig*.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
COPY shared ./shared
COPY server ./server
COPY client ./client

# Build frontend and compile client bundle into dist/client
RUN npm run build

# Stage 2: Production runtime image
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Copy package descriptors and install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Install tsx globally or as production dependency to run TypeScript server directly
RUN npm install -g tsx

# Copy built client artifacts, shared files, and server source
COPY --from=builder /app/dist /app/dist
COPY shared /app/shared
COPY server /app/server

# Expose backend proxy port
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/api/health || exit 1

# Start Senku Stream Gateway
CMD ["tsx", "server/index.ts"]
