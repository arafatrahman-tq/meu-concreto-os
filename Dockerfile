# Stage 1: Build
# Use alpine so the native libsql binary is compiled for musl (linux-x64-musl),
# matching the runtime stage. Mixing gnu (debian) build + musl runtime causes
# "Cannot find module" errors for native packages like @libsql/isomorphic-ws.
FROM oven/bun:1.3.9-alpine AS build

WORKDIR /app

# Install build dependencies needed for native modules on Alpine
RUN apk add --no-cache python3 make g++

# Copy dependency files
COPY package.json bun.lock ./

# Full install (scripts included so libsql native binary is downloaded)
RUN bun install --frozen-lockfile

# Copy project files
COPY . .

# Build for production (Nuxt Nitro)
ENV NODE_ENV=production
RUN bun run build

# Ensure the app data directory exists in the runtime image
# This is where the SQLite database will live (mapped via volume)
RUN mkdir -p /app/data

# Stage 2: Runtime
FROM oven/bun:1.3.9-alpine AS runtime

WORKDIR /app

# Create data directory in runtime as well to ensure permissions
RUN mkdir -p /app/data

# Copy built output
COPY --from=build /app/.output ./.output

# Nitro's externals mechanism pre-populates .output/server/node_modules/ with
# only the top-level listed packages — some entries are bundled as single files,
# not directories. This makes it impossible to layer a full node_modules on top.
# Fix: wipe Nitro's partial/conflicting node_modules, then do a full production
# install in its place so ALL transitive deps (including @libsql/isomorphic-ws
# and the correct @libsql/linux-x64-musl native binary) are present.
COPY --from=build /app/package.json /app/bun.lock ./.output/server/
RUN rm -rf .output/server/node_modules \
    && cd .output/server \
    && bun install --production --frozen-lockfile

# Production environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Copy drizzle config + schema into .output/server/ preserving relative paths
# so `bun run db:push` works from that directory without --config flag.
# drizzle.config.ts expects schema at './server/database/schema.ts'
COPY --from=build /app/drizzle.config.ts ./.output/server/drizzle.config.ts
RUN mkdir -p .output/server/server/database
COPY --from=build /app/server/database/schema.ts ./.output/server/server/database/schema.ts
COPY --from=build /app/server/database/migrations ./.output/server/server/database/migrations

# Copy seed script for manual execution
COPY --from=build /app/scripts/seed.ts ./.output/server/scripts/seed.ts

# Expose the application port
EXPOSE 3000

# Start Nuxt Nitro server
CMD ["bun", "./.output/server/index.mjs"]
