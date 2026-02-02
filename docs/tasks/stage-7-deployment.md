# Stage 7: Deployment

## Overview
Деплой на VPS с AAPanel, настройка Docker, DooD, PWA.

## Prerequisites

- VPS с минимум 2GB RAM, 2 CPU
- AAPanel установлен
- Docker установлен
- Домен (опционально)

## Deployment Steps

### 7.1 Подготовка VPS

#### Установить Docker
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавить пользователя в группу docker
sudo usermod -aG docker $USER
```

#### Установить Docker Compose
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 7.2 Production Docker Compose

**Файл:** `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ddnet-web
    restart: unless-stopped
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DATABASE_URI=${DATABASE_URI}
      - PAYLOAD_SECRET=${PAYLOAD_SECRET}
      - NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}
      - CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
      - CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}
      - CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET}
      - BACKEND_SECRET=${BACKEND_SECRET}
      - MAX_BOTS=${MAX_BOTS}
      - BINGO_POLL_INTERVAL_MS=${BINGO_POLL_INTERVAL_MS}
    volumes:
      # DooD: mount docker socket
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      - mongo
    networks:
      - ddnet-network

  mongo:
    image: mongo:7
    container_name: ddnet-mongo
    restart: unless-stopped
    volumes:
      - mongo_data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_USER}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}
    networks:
      - ddnet-network

volumes:
  mongo_data:

networks:
  ddnet-network:
    driver: bridge
```

### 7.3 Production Dockerfile

**Файл:** `Dockerfile`

```dockerfile
# Stage 1: Dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/bot/package.json ./apps/bot/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:22-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/bot/node_modules ./apps/bot/node_modules
COPY . .

# Build
ENV NEXT_TELEMETRY_DISABLED 1
RUN pnpm build

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Install docker CLI for DooD
RUN apk add --no-cache docker-cli

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 7.4 Production Environment

**Файл:** `.env.production`

```env
# Server
NODE_ENV=production
NEXT_PUBLIC_SERVER_URL=https://yourdomain.com

# Database
DATABASE_URI=mongodb://mongo:27017/ddnet
MONGO_USER=admin
MONGO_PASSWORD=your-secure-password

# Security
PAYLOAD_SECRET=your-very-long-random-secret-key-here
BACKEND_SECRET=another-long-random-secret-for-bot-auth
AUTH_SECRET=auth-secret-for-sessions

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Bot Configuration
MAX_BOTS=10
BINGO_POLL_INTERVAL_MS=5000
MAX_ACTIVE_GAMES_PER_USER=1
USE_MOCK_BOT=false

# Verification Servers (JSON array)
VERIFICATION_SERVERS=["ger1.ddnet.org:8303","ger2.ddnet.org:8303"]
```

### 7.5 Build and Deploy Script

**Файл:** `scripts/deploy.sh`

```bash
#!/bin/bash
set -e

echo "=== DDNet Bingo Deployment ==="

# Build bot image first
echo "Building bot image..."
cd apps/bot
docker build -t bingo-bot:latest .
cd ../..

# Pull latest code
echo "Pulling latest changes..."
git pull origin main

# Build and restart services
echo "Building and starting services..."
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Cleanup old images
echo "Cleaning up old images..."
docker image prune -f

echo "=== Deployment Complete ==="
docker-compose -f docker-compose.prod.yml ps
```

### 7.6 AAPanel Configuration

#### Nginx Reverse Proxy

В AAPanel: Website -> Add Site -> Set up reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### SSL Certificate
1. В AAPanel: Website -> SSL -> Let's Encrypt
2. Включить автообновление

### 7.7 Monitoring

#### Health Check Endpoint

**Файл:** `src/app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { getBotManager } from '@/services/verification/BotManager'

export async function GET() {
  try {
    const payload = await getPayload({ config: payloadConfig })
    const botManager = getBotManager()

    // Check database
    await payload.find({ collection: 'users', limit: 1 })

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      bots: {
        active: botManager.getActiveBotsCount(),
        max: parseInt(process.env.MAX_BOTS || '10'),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: String(error) },
      { status: 500 }
    )
  }
}
```

#### Docker Logs
```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f web

# View specific container
docker logs ddnet-web -f --tail 100
```

### 7.8 Backup Strategy

**Файл:** `scripts/backup.sh`

```bash
#!/bin/bash
BACKUP_DIR="/backups/ddnet"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup MongoDB
docker exec ddnet-mongo mongodump \
  --username=$MONGO_USER \
  --password=$MONGO_PASSWORD \
  --authenticationDatabase=admin \
  --out=/backup

docker cp ddnet-mongo:/backup $BACKUP_DIR/mongo_$DATE

# Keep last 7 backups
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +

echo "Backup completed: $BACKUP_DIR/mongo_$DATE"
```

### 7.9 PWA Final Setup

**Файл:** `public/manifest.json`

```json
{
  "name": "DDNet Bingo",
  "short_name": "DDNet Bingo",
  "description": "Play Bingo and Race with DDNet maps",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ]
}
```

## Checklist

### Local Testing
- [ ] Тестировать все API endpoints
- [ ] Тестировать бота локально
- [ ] Проверить все страницы работают

### Pre-Deploy
- [ ] Создать production .env файл
- [ ] Сгенерировать безопасные секреты
- [ ] Настроить Cloudinary для production
- [ ] Подготовить иконки для PWA

### Deploy
- [ ] Установить Docker на VPS
- [ ] Настроить docker-compose.prod.yml
- [ ] Собрать bot image
- [ ] Запустить контейнеры
- [ ] Настроить Nginx reverse proxy
- [ ] Настроить SSL сертификат

### Post-Deploy
- [ ] Проверить health endpoint
- [ ] Тестировать бота на production
- [ ] Настроить backup cron job
- [ ] Проверить PWA установку
- [ ] Мониторинг логов первые дни
