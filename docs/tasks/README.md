# DDNet Bingo - Project Documentation

## Overview

DDNet Bingo - веб-приложение для игры в Bingo и Race режимы, основанное на картах DDNet.

**Технологический стек:**
- **Frontend**: Next.js 15, React 19, Tailwind CSS 4, shadcn/ui, SWR
- **Backend**: Payload CMS 3.69, MongoDB, Cloudinary
- **Bot**: Node.js + teeworlds npm package, Docker (DooD)
- **Deployment**: VPS + AAPanel, PWA

## Project Stages

| Stage | Name | Description | Status |
|-------|------|-------------|--------|
| 1 | [Foundation](./stage-1-foundation.md) | Базовая инфраструктура, коллекции, библиотеки | In Progress |
| 2 | [Bingo Core](./stage-2-bingo-core.md) | Основной функционал Bingo | Planned |
| 3 | [Race Mode](./stage-3-race-mode.md) | Режим Race с ботом | Planned |
| 4 | [Social Features](./stage-4-social.md) | Друзья, инвайты, уведомления | Planned |
| 5 | [Bot System](./stage-5-bots.md) | Расширенная система ботов | Planned |
| 6 | [Frontend Pages](./stage-6-frontend.md) | Все страницы приложения | Planned |
| 7 | [Deployment](./stage-7-deployment.md) | Деплой на VPS, PWA | Planned |

## Additional Documentation

- [Libraries Integration](./libraries.md) - Интеграция ddnet.js, TeeAssembler, teeworlds
- [Collections Schema](./collections.md) - Схема всех коллекций Payload
- [API Endpoints](./api-endpoints.md) - REST API эндпоинты
- [Environment Variables](./env-variables.md) - Все переменные окружения

## Quick Links

- **DDNet.js Docs**: https://ddnet.js.org/
- **TeeAssembler**: https://github.com/AlexIsTheGuy/TeeAssembler-2.0
- **Teeworlds Library**: https://github.com/swarfeya/teeworlds-library-ts

## Key Features Summary

### Bingo Mode
- Solo (1 команда) и Team (2 команды, 1-2 игрока каждая)
- Win conditions: Line, Cross, Full House
- Grid sizes: 3x3, 5x5, 7x7
- Авто-зачёт карт (играет любую карту из категории - если в сетке, закрывается)
- Только финиши ВО ВРЕМЯ игры засчитываются
- Обе команды могут закрыть одну ячейку (визуально половинчатая)
- Публичные и приватные игры
- Лимит: 1 активная игра на пользователя

### Race Mode
- До 4 игроков
- Бот мониторит чат сервера + проверяет DDNet API
- Игроки вотают карты
- Этапы с победителями

### Bot System
- DooD (Docker-out-of-Docker)
- Лимит: 10 ботов (ENV: `MAX_BOTS`)
- Режимы: verification, race, chat
- Расширенная админка с логами

### Social Features
- Друзья, online статус
- Real-time чат через бота (whisper)
- Система инвайтов + публичные ссылки
- In-app уведомления
- PWA

## Configuration Defaults

```env
# Bot limits
MAX_BOTS=10
BINGO_POLL_INTERVAL_MS=5000
MAX_ACTIVE_GAMES_PER_USER=1

# Verification
VERIFICATION_TTL_MS=600000
VERIFICATION_SERVERS=["ip:port", ...]
```
