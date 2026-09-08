# Build the dashboard with public values only. Never pass service-role or
# database credentials as build arguments because Next.js can embed them.
FROM node:22-bookworm-slim AS build

WORKDIR /app
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_LEDGER_CORE_URL
ARG NEXT_PUBLIC_RISK_ENGINE_URL
ARG NEXT_PUBLIC_GATEWAY_URL

ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY} \
    NEXT_PUBLIC_LEDGER_CORE_URL=${NEXT_PUBLIC_LEDGER_CORE_URL} \
    NEXT_PUBLIC_RISK_ENGINE_URL=${NEXT_PUBLIC_RISK_ENGINE_URL} \
    NEXT_PUBLIC_GATEWAY_URL=${NEXT_PUBLIC_GATEWAY_URL}

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
RUN npm run build

FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

RUN useradd --system --create-home --uid 10001 tradepulse \
    && chown -R tradepulse:tradepulse /app
USER tradepulse

EXPOSE 3000
CMD ["npm", "start"]
