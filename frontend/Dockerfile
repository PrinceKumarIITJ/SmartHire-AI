# SmartHire web — production image (Next.js standalone output)
# Build:  docker build -t smarthire-web --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/api/v1 frontend
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S smarthire && adduser -S smarthire -G smarthire
COPY --from=build /app/public ./public
COPY --from=build --chown=smarthire:smarthire /app/.next/standalone ./
COPY --from=build --chown=smarthire:smarthire /app/.next/static ./.next/static
USER smarthire
EXPOSE 3000
CMD ["node", "server.js"]
