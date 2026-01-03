# Authentication System Documentation

## Overview

DDNet Bingo использует кастомную систему аутентификации на базе PayloadCMS с логином через никнейм вместо email.

## User Model

### Fields

| Field | Type | Description | Required | Unique |
|-------|------|-------------|----------|--------|
| `username` | text | Логин для входа (не меняется после создания) | ✅ | ✅ |
| `name` | text | Публичный никнейм (отображается в игре) | ✅ | ✅ |
| `email` | email | Email (добавлен PayloadCMS, может быть пустым) | ❌ | ✅ |
| `password` | password | Хешированный пароль | ✅ | ❌ |
| `roles` | select | admin / player / moderator | ✅ | ❌ |
| `isSystemVerified` | checkbox | Верифицирован ли через игру | ✅ | ❌ |

### Authentication Configuration

```typescript
auth: {
  useAPIKey: true,
  loginWithUsername: {
    allowEmailLogin: false,    // Запрещен логин через email
    requireUsername: true,      // Требуется username
  },
}
```

## Registration Flow

### 1. User Registration

**Endpoint**: `POST /api/users`

**Request Body**:
```json
{
  "username": "PlayerName",  // Логин (не меняется)
  "name": "PlayerName",      // Никнейм (можно менять)
  "password": "securepass123"
}
```

**Response** (Success):
```json
{
  "doc": {
    "id": "...",
    "username": "PlayerName",
    "name": "PlayerName",
    "roles": "player",
    "isSystemVerified": false,
    "createdAt": "2026-01-04T...",
    "updatedAt": "2026-01-04T..."
  }
}
```

**Response** (Error - Username exists and verified):
```json
{
  "errors": [
    {
      "message": "This nickname is already protected. Please choose a different name or contact support."
    }
  ]
}
```

### 2. Hard Reset Logic

Если пользователь с таким же `name` уже существует:

- **Если `isSystemVerified: false`** → Старый аккаунт удаляется, регистрация продолжается
- **Если `isSystemVerified: true`** → Ошибка, никнейм защищен

Это позволяет игрокам перерегистрироваться, если они забыли пароль до верификации.

```typescript
// Hook в Users.ts
const hardResetHook: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  if (operation !== 'create' || !data.name) return data

  const existingUsers = await payload.find({
    collection: 'users',
    where: { name: { equals: data.name } },
    limit: 1,
  })

  if (existingUsers.docs.length === 0) return data

  const existingUser = existingUsers.docs[0]

  // If verified, throw error
  if (existingUser.isSystemVerified) {
    throw new Error('This nickname is already protected...')
  }

  // Hard Reset: Delete unverified user
  await payload.delete({
    collection: 'users',
    id: existingUser.id,
  })

  return data
}
```

## Login Flow

### 1. User Login

**Endpoint**: `POST /api/users/login`

**Request Body**:
```json
{
  "username": "PlayerName",
  "password": "securepass123"
}
```

**Response** (Success):
```json
{
  "exp": 1704412800,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "PlayerName",
    "name": "PlayerName",
    "roles": "player",
    "isSystemVerified": false,
    "email": null,
    "collection": "users"
  }
}
```

**Response** (Error):
```json
{
  "errors": [
    {
      "message": "The username and/or password provided is incorrect."
    }
  ]
}
```

### 2. Session Management

После успешного логина:
- JWT токен сохраняется в HTTP-only cookie: `payload-token`
- Токен автоматически отправляется с каждым запросом
- Срок действия токена: 7 дней (по умолчанию)

### 3. Check Current User

**Endpoint**: `GET /api/users/me`

**Headers**:
```
Cookie: payload-token=<jwt-token>
```

**Response**:
```json
{
  "user": {
    "id": "...",
    "username": "PlayerName",
    "name": "PlayerName",
    "roles": "player",
    "isSystemVerified": false,
    "collection": "users"
  },
  "exp": 1704412800
}
```

## Logout

**Endpoint**: `POST /api/users/logout`

Удаляет cookie с JWT токеном.

## Verification System

### 1. Create Verification Request

Пользователь запрашивает верификацию своего никнейма через игру.

**Flow**:
1. User создает запрос через UI
2. В игре пользователь получает код верификации
3. Бот проверяет присутствие игрока на сервере
4. После успешной верификации: `isSystemVerified = true`
5. Никнейм теперь защищен от перерегистрации

### 2. Protected Nickname

После `isSystemVerified = true`:
- Никнейм нельзя использовать для новой регистрации
- Hard Reset не сработает
- Нужно обращаться в поддержку для смены никнейма

## Frontend Components

### LoginForm Component

```tsx
// src/components/auth/LoginForm.tsx

const loginSchema = z.object({
  nickname: z.string().min(2).max(16),
  password: z.string().min(6),
})

async function onSubmit(data: LoginFormValues) {
  const response = await fetch('/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: data.nickname,  // Отправляем как username
      password: data.password,
    }),
    credentials: 'include',
  })
}
```

### RegisterForm Component

```tsx
// src/components/auth/RegisterForm.tsx

const registerSchema = z.object({
  name: z.string().min(2).max(16),
  password: z.string().min(8),
  confirmPassword: z.string(),
})

async function onSubmit(data: RegisterFormValues) {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: data.name,  // username для логина
      name: data.name,      // nickname для отображения
      password: data.password,
    }),
  })
}
```

## Server-Side Authentication

### In Next.js Server Components

```typescript
import { getPayload } from 'payload'
import config from '@/payload.config'
import { headers as getHeaders } from 'next/headers'

export default async function ProtectedPage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect('/login')
  }

  return <div>Welcome, {user.name}!</div>
}
```

### In API Routes

```typescript
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Your logic here
}
```

## Access Control

### Collection-Level Access

```typescript
access: {
  read: () => true,  // Anyone can read user profiles
  create: () => true,  // Anyone can register
  update: ({ req }) => {
    if (!req.user) return false
    if (req.user.roles === 'admin') return true
    return { id: { equals: req.user.id } }  // Own profile only
  },
  delete: ({ req }) => req.user?.roles === 'admin',
}
```

### Field-Level Access

```typescript
{
  name: 'roles',
  access: {
    create: ({ req }) => req.user?.roles?.includes('admin') ?? false,
    update: ({ req }) => req.user?.roles?.includes('admin') ?? false,
  },
}
```

## Password Security

- Минимальная длина: 8 символов (регистрация), 6 символов (логин)
- Автоматический bcrypt hashing через PayloadCMS
- Salt rounds: 10 (по умолчанию)
- Пароли никогда не возвращаются в API responses

## API Key Authentication (для бота)

```typescript
auth: {
  useAPIKey: true,
}
```

Бот может использовать API Key для аутентификации:

**Header**:
```
Authorization: <collection-slug> API-Key <api-key>
```

**Example**:
```
Authorization: users API-Key user_abc123xyz456
```

## Common Errors

### "The following field is invalid: Username"

**Причина**: Поле `username` не передано в запросе

**Решение**: Убедитесь, что отправляете `username` в body:
```json
{
  "username": "PlayerName",
  "password": "..."
}
```

### "This nickname is already protected"

**Причина**: Пользователь с таким `name` уже верифицирован

**Решение**: 
- Выбрать другой никнейм
- Обратиться в поддержку (создать тикет category: `name_change`)

### "The username and/or password provided is incorrect"

**Причина**: Неверный username или пароль

**Решение**: Проверить правильность данных

## Security Best Practices

1. **Never store passwords in plain text** ✅ (handled by Payload)
2. **Use HTTPS in production** ⚠️ (настроить на сервере)
3. **Set secure cookie options** ⚠️ (настроить в payload.config.ts)
4. **Implement rate limiting** ❌ (TODO: добавить middleware)
5. **Add CSRF protection** ✅ (встроено в Payload)

## Future Improvements

- [ ] 2FA (Two-Factor Authentication)
- [ ] Email verification (опционально)
- [ ] Password reset flow
- [ ] Session management (список активных сессий)
- [ ] Login history / audit log
- [ ] Rate limiting на login endpoint
- [ ] Captcha на регистрацию

## Testing

### Manual Testing

```bash
# Register new user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"TestPlayer","name":"TestPlayer","password":"testpass123"}'

# Login
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"TestPlayer","password":"testpass123"}' \
  -c cookies.txt

# Check current user
curl http://localhost:3000/api/users/me \
  -b cookies.txt

# Logout
curl -X POST http://localhost:3000/api/users/logout \
  -b cookies.txt
```

## Resources

- [PayloadCMS Authentication](https://payloadcms.com/docs/authentication/overview)
- [PayloadCMS Login with Username](https://payloadcms.com/docs/authentication/config#login-with-username)
- [Next.js Authentication](https://nextjs.org/docs/app/building-your-application/authentication)
