# Dependencies, cached on package.json + lockfile alone.
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build. NEXT_PUBLIC_* values are inlined into the client bundle at build time,
# so they have to be present here and not only at runtime. Nothing secret is
# passed as a build argument — build args are recorded in the image.
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL
ARG NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
RUN npm run build

# The maintenance image: full source and full node_modules, including dev
# dependencies. Used for one-off commands that the slim runtime cannot run —
# applying migrations (drizzle-kit reads the schema from source) and deploying
# the Trigger.dev tasks (the CLI reads trigger.config.ts and features/).
# Compose supplies the command, so this stage declares none.
FROM node:24-alpine AS tools
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Runtime: the standalone server plus the assets it cannot inline.
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# The docs route reads these from disk at request time.
COPY --from=builder /app/content ./content
EXPOSE 3000
CMD ["node", "server.js"]
