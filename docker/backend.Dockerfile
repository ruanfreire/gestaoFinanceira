FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY UI/package.json UI/

RUN npm ci --workspace backend --include-workspace-root

COPY backend ./backend

RUN npm run build --workspace backend

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY backend/package.json backend/

RUN npm ci --workspace backend --include-workspace-root --omit=dev

COPY --from=builder /app/backend/dist ./backend/dist

WORKDIR /app/backend

EXPOSE 4000

CMD ["node", "dist/main.js"]
