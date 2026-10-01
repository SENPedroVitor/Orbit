FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 ORBIT_DATA_DIR=/app/data
RUN addgroup -S -g 1001 orbit && adduser -S -u 1001 -G orbit orbit && mkdir -p /app/data && chown orbit:orbit /app/data
COPY --from=build --chown=orbit:orbit /app/.next/standalone ./
COPY --from=build --chown=orbit:orbit /app/.next/static ./.next/static
COPY --from=build --chown=orbit:orbit /app/public ./public
COPY --from=build --chown=orbit:orbit /app/scripts ./scripts
COPY --from=build --chown=orbit:orbit /app/lib/local-auth.mjs ./lib/local-auth.mjs
USER orbit
EXPOSE 3000
CMD ["node", "server.js"]
