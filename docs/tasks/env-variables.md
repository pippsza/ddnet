# Environment Variables

## Overview
Все переменные окружения для проекта DDNet Bingo.

---

## Required Variables

### Database
```env
# MongoDB connection string
DATABASE_URI=mongodb://localhost:27017/ddnet

# MongoDB credentials (for production)
MONGO_USER=admin
MONGO_PASSWORD=your-secure-password
```

### Security
```env
# Payload CMS secret (min 32 characters)
PAYLOAD_SECRET=your-very-long-random-secret-key-here

# Auth.js secret
AUTH_SECRET=another-random-secret-for-auth

# Bot authentication secret
BACKEND_SECRET=secret-for-bot-to-api-communication
```

### Server
```env
# Application URL
NEXT_PUBLIC_SERVER_URL=http://localhost:3000

# Node environment
NODE_ENV=development
```

### Cloudinary (Media Storage)
```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=ddnet-bingo
```

---

## Bot Configuration

```env
# Maximum number of concurrent bots
MAX_BOTS=10

# Maximum concurrent verification bots
MAX_CONCURRENT_BOTS=4

# Use mock bot for development
USE_MOCK_BOT=true

# Verification servers (JSON array)
VERIFICATION_SERVERS=["ger1.ddnet.org:8303","ger2.ddnet.org:8303"]

# Race servers (JSON array)
RACE_SERVERS=["your-private-server:8303"]
```

---

## Game Configuration

```env
# Bingo polling interval (ms)
BINGO_POLL_INTERVAL_MS=5000

# Maximum active games per user
MAX_ACTIVE_GAMES_PER_USER=1

# Verification token lifetime (ms)
VERIFICATION_TTL_MS=600000
```

---

## Optional Variables

### OAuth (if using social login)
```env
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

AUTH_DISCORD_ID=your-discord-client-id
AUTH_DISCORD_SECRET=your-discord-client-secret
```

### Rate Limiting
```env
# DDNet API rate limit (requests per minute)
DDNET_API_RATE_LIMIT=100
```

---

## Development vs Production

### Development (.env)
```env
NODE_ENV=development
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
DATABASE_URI=mongodb://localhost:27017/ddnet
USE_MOCK_BOT=true
PAYLOAD_SECRET=dev-secret-change-in-production
BACKEND_SECRET=dev-bot-secret-change-in-production
```

### Production (.env.production)
```env
NODE_ENV=production
NEXT_PUBLIC_SERVER_URL=https://yourdomain.com
DATABASE_URI=mongodb://mongo:27017/ddnet
USE_MOCK_BOT=false
PAYLOAD_SECRET=<generate with: openssl rand -base64 32>
BACKEND_SECRET=<generate with: openssl rand -base64 32>
```

---

## Generating Secrets

```bash
# Generate random secret
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Bot Environment Variables

When starting bot containers, these are passed:

| Variable | Mode | Description |
|----------|------|-------------|
| `BOT_MODE` | All | Bot mode: verification, race, chat, monitor |
| `TARGET_NICK` | Verification | Player nickname to find |
| `VERIFY_TOKEN` | Verification | 6-digit verification token |
| `REQUEST_ID` | Verification | Verification request ID |
| `SERVERS_LIST` | Verification | JSON array of servers |
| `RACE_ID` | Race | Race game ID |
| `SERVER_IP` | Race, Chat | Server IP to connect |
| `SERVER_PORT` | Race, Chat | Server port |
| `PLAYERS_LIST` | Race | JSON array of player names |
| `SESSION_ID` | Chat | Chat session ID |
| `BACKEND_URL` | All | API URL for callbacks |
| `BACKEND_SECRET` | All | Authentication secret |
