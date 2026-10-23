# Production image (used by Render's Docker runtime).
FROM node:22-bookworm-slim

# OpenSSL is required by the Prisma query engine.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies first so this layer is cached between deploys.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .

# Optional institutional Student ID rule (inlined into the browser bundle at build time).
ARG NEXT_PUBLIC_STUDENT_ID_PATTERN
RUN npm run build

ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000

# On start: apply database migrations, create the first staff account if configured, then serve.
CMD ["sh", "-c", "node scripts/render-prepare.mjs && npm start"]
