# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:/app/data/build.db"
RUN npx prisma generate && npm run build

# A self-contained Prisma CLI used only to apply the schema at container start.
FROM base AS prisma-cli
WORKDIR /cli
COPY package.json ./package.json
RUN npm install --no-save --no-audit --no-fund "prisma@$(node -p "require('./package.json').dependencies.prisma")"

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:/app/data/app.db"
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=prisma-cli /cli/node_modules ./prisma-cli/node_modules
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && mkdir -p /app/data
VOLUME ["/app/data"]
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
