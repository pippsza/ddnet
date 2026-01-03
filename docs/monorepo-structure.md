# DDNet Bingo - Monorepo Structure & Build Guide

## 📁 Структура Монорепы

Ваш проект использует **pnpm workspaces** для управления монорепой:

```
ddnet/
├── apps/
│   └── bot/                    # Teeworlds verification bot
│       ├── src/
│       │   ├── index.ts        # Entry point
│       │   ├── client.ts       # Teeworlds client wrapper
│       │   ├── api.ts          # API communication
│       │   └── serverHopper.ts # Server hopping logic
│       ├── package.json        # @ddnet/bot
│       ├── tsconfig.json
│       └── Dockerfile          # Bot Docker image
│
├── src/                        # Main Next.js app
│   ├── app/                    # App router
│   ├── collections/            # PayloadCMS collections
│   ├── components/             # React components
│   ├── lib/                    # Utilities & constants
│   └── payload.config.ts       # Payload configuration
│
├── messages/                   # i18n translations
├── docs/                       # Documentation
├── tests/                      # E2E & integration tests
├── package.json                # Root package (@ddnet/web)
├── pnpm-workspace.yaml         # Workspace configuration
├── docker-compose.yml          # Development environment
└── Dockerfile                  # Production Next.js image
```

## 🔧 Как это работает

### pnpm Workspaces

`pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
```

Это означает, что все пакеты в папке `apps/` являются отдельными workspace-пакетами.

### Пакеты в монорепе

1. **@ddnet/web** (root) - основное Next.js приложение с PayloadCMS
2. **@ddnet/bot** (apps/bot) - бот для верификации игроков в Teeworlds

### Зависимости между пакетами

- Bot пока **независим** от основного приложения
- В будущем можно создать shared packages (например, `@ddnet/shared-types`)

## 🏗️ Как билдится

### Development (разработка)

#### Основное приложение (Next.js + PayloadCMS)

```bash
# Запуск dev сервера
pnpm dev

# С очисткой кеша
pnpm devsafe

# Использует:
# - Next.js dev server (hot reload)
# - PayloadCMS в dev режиме
# - MongoDB из docker-compose
```

#### Bot (Teeworlds verification)

```bash
# Запуск bot в dev режиме
pnpm bot:dev

# Или напрямую из bot директории
cd apps/bot
pnpm dev

# Использует tsx для TypeScript execution
```

#### Docker Compose для разработки

```bash
docker-compose up

# Запускает:
# - MongoDB на порту 27017
# - Next.js app на порту 3000
# - Автоматически устанавливает зависимости
```

### Production Build

#### 1. Основное приложение

```bash
# Build Next.js app
pnpm build

# Процесс:
# 1. TypeScript компиляция
# 2. Next.js build с Payload
# 3. Создание standalone output
# 4. Оптимизация для production
```

**next.config.mjs** настроен на `output: 'standalone'`:

- Создает минимальный standalone сервер
- Включает только необходимые зависимости
- Готов для Docker контейнера

#### 2. Bot

```bash
# Build bot
pnpm bot:build

# Или из root
cd apps/bot && pnpm build

# Процесс:
# 1. TypeScript компиляция (tsc)
# 2. Создание dist/ с JavaScript файлами
```

### Docker Build (Production)

#### Основное приложение

```bash
docker build -t ddnet-web:latest .

# Dockerfile использует multi-stage build:
# Stage 1 (deps): Установка зависимостей
# Stage 2 (builder): Build Next.js app
# Stage 3 (runner): Минимальный production образ
```

**Особенности Dockerfile:**

- Использует Node.js 22 Alpine (минимальный размер)
- Копирует только standalone output и static файлы
- Запускается от non-root пользователя (nextjs:nodejs)
- Порт 3000

#### Bot

```bash
# Build bot docker image
pnpm bot:docker:build

# Или напрямую
cd apps/bot
docker build -t bingo-bot:latest .

# Multi-stage build:
# Stage 1 (builder): TypeScript компиляция
# Stage 2 (production): Только runtime + dist/
```

## 📦 Package Manager - pnpm

### Преимущества pnpm

- **Эффективное хранение**: Все пакеты в глобальном store, симлинки в проектах
- **Workspaces**: Нативная поддержка монорепы
- **Быстрая установка**: Параллельная установка зависимостей
- **Строгость**: `node_modules` structure предотвращает phantom dependencies

### Основные команды

```bash
# Установка всех зависимостей (root + workspaces)
pnpm install

# Добавить зависимость в root
pnpm add <package>

# Добавить зависимость в workspace
pnpm --filter @ddnet/bot add <package>

# Запустить скрипт в workspace
pnpm --filter @ddnet/bot dev
pnpm --filter @ddnet/bot build

# Или сокращенно (из package.json root)
pnpm bot:dev
pnpm bot:build

# Запустить команду во всех workspaces
pnpm -r build  # -r = recursive
```

## 🚀 CI/CD & Deployment

### Build Pipeline (рекомендуемый)

```yaml
# .github/workflows/deploy.yml (пример)
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      - name: Build Docker image
        run: docker build -t ddnet-web:${{ github.sha }} .

      - name: Push to registry
        run: |
          docker tag ddnet-web:${{ github.sha }} registry.example.com/ddnet-web:latest
          docker push registry.example.com/ddnet-web:latest

  build-bot:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm --filter @ddnet/bot install --frozen-lockfile
      - run: pnpm --filter @ddnet/bot build

      - name: Build Docker image
        run: |
          cd apps/bot
          docker build -t bingo-bot:${{ github.sha }} .
```

### Production Deployment

#### Option 1: Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  web:
    image: ddnet-web:latest
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DATABASE_URI=mongodb://mongo:27017/ddnet
      - PAYLOAD_SECRET=${PAYLOAD_SECRET}
    depends_on:
      - mongo

  bot:
    image: bingo-bot:latest
    environment:
      - API_URL=http://web:3000
      - API_KEY=${BOT_API_KEY}
    depends_on:
      - web

  mongo:
    image: mongo:latest
    volumes:
      - mongo_data:/data/db
    ports:
      - '27017:27017'

volumes:
  mongo_data:
```

```bash
docker-compose -f docker-compose.prod.yml up -d
```

#### Option 2: Kubernetes

```yaml
# k8s/deployment.yaml (упрощенный пример)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ddnet-web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ddnet-web
  template:
    metadata:
      labels:
        app: ddnet-web
    spec:
      containers:
        - name: web
          image: registry.example.com/ddnet-web:latest
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_URI
              valueFrom:
                secretKeyRef:
                  name: ddnet-secrets
                  key: database-uri
```

#### Option 3: Vercel (для Next.js app)

```bash
# Требуется Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Или через GitHub integration
# (автоматический deploy при push в main)
```

**Примечание**: Bot нужно деплоить отдельно (Docker/VM/Cloud Run)

## 🧪 Testing

```bash
# Unit & Integration tests
pnpm test:int

# E2E tests (Playwright)
pnpm test:e2e

# Все тесты
pnpm test

# Запуск тестов для конкретного workspace
pnpm --filter @ddnet/bot test  # (если есть тесты в bot)
```

## 📝 Scripts Reference

### Root (package.json)

| Script           | Описание                     |
| ---------------- | ---------------------------- |
| `pnpm dev`       | Dev сервер Next.js + Payload |
| `pnpm build`     | Production build             |
| `pnpm start`     | Запуск production сервера    |
| `pnpm lint`      | ESLint проверка              |
| `pnpm typecheck` | TypeScript type checking     |
| `pnpm test`      | Запуск всех тестов           |
| `pnpm bot:dev`   | Dev режим для bot            |
| `pnpm bot:build` | Build bot                    |

### Bot (apps/bot/package.json)

| Script              | Описание                        |
| ------------------- | ------------------------------- |
| `pnpm build`        | Компиляция TypeScript → dist/   |
| `pnpm start`        | Запуск bot (node dist/index.js) |
| `pnpm dev`          | Dev режим (tsx с hot reload)    |
| `pnpm docker:build` | Build Docker image              |

## 🔄 Workflow Examples

### Добавление нового workspace

1. Создать папку в `apps/`:

```bash
mkdir -p apps/my-new-service
cd apps/my-new-service
pnpm init
```

2. Обновить `pnpm-workspace.yaml` (уже настроен на `apps/*`)

3. Установить зависимости:

```bash
pnpm --filter @ddnet/my-new-service add express
```

### Shared Package (будущее расширение)

```bash
# Создать shared types package
mkdir -p packages/shared-types
cd packages/shared-types
pnpm init

# В pnpm-workspace.yaml добавить:
# packages:
#   - 'apps/*'
#   - 'packages/*'

# Использовать в других пакетах:
# pnpm --filter @ddnet/bot add @ddnet/shared-types@workspace:*
```

## 🐛 Troubleshooting

### Проблема: "Cannot find module"

```bash
# Очистить node_modules и переустановить
rm -rf node_modules apps/*/node_modules
pnpm install
```

### Проблема: TypeScript errors при build

```bash
# Проверить типы без build
pnpm typecheck

# Обновить generated types
pnpm generate:types
```

### Проблема: Docker build fails

```bash
# Проверить standalone output настроен
# next.config.mjs должен иметь: output: 'standalone'

# Build локально для проверки
pnpm build

# Проверить .next/standalone/ создан
ls -la .next/standalone
```

### Проблема: Bot не подключается к серверу

```bash
# Проверить логи
docker logs <container-id>

# Проверить сетевое соединение в контейнере
docker exec -it <container-id> sh
ping ddnet.org
```

## 📚 Дополнительные ресурсы

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Next.js Standalone Output](https://nextjs.org/docs/advanced-features/output-file-tracing)
- [PayloadCMS Deployment](https://payloadcms.com/docs/production/deployment)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)

## 🎯 Резюме

**Ваша монорепа:**

- ✅ Использует pnpm workspaces для эффективного управления
- ✅ Standalone Next.js build для легкого деплоя
- ✅ Отдельный bot как независимый сервис
- ✅ Multi-stage Docker builds для оптимального размера образов
- ✅ Hot reload в dev режиме для всех сервисов
- ✅ TypeScript везде с shared types (можно расширить)
- ✅ Готова к CI/CD и production deployment
