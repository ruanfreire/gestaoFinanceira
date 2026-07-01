FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY UI/package.json UI/

RUN npm ci --workspace frontend --include-workspace-root

COPY frontend ./frontend
COPY UI ./UI

RUN npm run build --workspace frontend

FROM nginx:1.27-alpine AS runner

COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
