# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json* ./

# If you use npm:
RUN npm ci

# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . ./

# Build Next.js
RUN npm run build
RUN mkdir -p .next/cache && chmod -R 777 .next/cache

# ---- runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# (Optional but recommended)
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Copy the standalone output (recommended for Next.js)
# This works best if you enable "output: 'standalone'" in next.config.js (see below).
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

USER nextjs

# Railway sets PORT automatically
ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "node server.js -p ${PORT}"]
