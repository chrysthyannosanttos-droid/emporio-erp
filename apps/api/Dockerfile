# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /app

# Install OpenSSL and other deps (Debian-based, compatível com Prisma)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json turbo.json ./

COPY packages/database ./packages/database

COPY apps/api ./apps/api

RUN npm install

RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

RUN npx turbo run build --filter=api

# Stage 2: Production
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install OpenSSL (required by Prisma at runtime)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001
CMD ["node", "dist/main"]
