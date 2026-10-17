FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
# Rewrite destinations are compiled into the build, so the backend origin must be known here.
ARG API_URL=http://api:8417
ENV API_URL=$API_URL \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ARG API_URL=http://api:8417
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    API_URL=$API_URL \
    HOSTNAME=0.0.0.0 \
    PORT=3417
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3417
CMD ["node", "server.js"]
