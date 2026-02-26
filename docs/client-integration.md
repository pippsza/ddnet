# DDNet Client Integration — Bingo & Race

## Обзор

DDNet клиент получает данные об играх через один агрегатор-эндпоинт. Клиент периодически поллит его для получения актуального состояния игры, но использует **оптимистик апдейт** — если клиент видит что игрок с нужным ником прошёл карту, он сразу закрашивает ячейку/шаг, не дожидаясь ответа сервера.

---

## Агрегатор-эндпоинт

### `GET https://bingo.pippsza.dev/api/client/profile?nick=PlayerName`

Единственный эндпоинт, который нужен клиенту. Возвращает всю информацию: профиль, статистику, текущую игру.

**Параметры:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| `nick` | string (query) | Имя игрока в DDNet (`ingameNick`) |

**Аутентификация:** Не требуется. Данные публичные.

### Пример запроса

```
GET https://bingo.pippsza.dev/api/client/profile?nick=pippsza
```

### Формат ответа

```jsonc
{
  // ── Профиль игрока ──
  "player": {
    "id": "abc123",
    "username": "pippsza",       // логин на сайте
    "ingameNick": "pippsza"      // ник в DDNet (может отличаться от username)
  },

  // ── Статистика ──
  "stats": {
    "bingo": {
      "totalGamesPlayed": 15,
      "totalGamesWon": 8,
      "winRate": 53,              // 0-100
      "favoriteCategory": "novice"
    },
    "race": {
      "totalRacesPlayed": 7,
      "totalRacesWon": 4,
      "winRate": 57,
      "favoriteCategory": "moderate"
    }
  },

  // ── Текущая игра (null если нет активной) ──
  "activeGame": { ... }           // см. ниже
}
```

**Коды ошибок:**
| Код | Описание |
|-----|----------|
| `400` | Не передан параметр `?nick=` |
| `404` | Игрок с таким ником не найден |
| `500` | Ошибка сервера |

---

## Формат `activeGame`

### Общие поля (для обоих режимов)

```jsonc
{
  "type": "bingo" | "race",       // тип игры
  "id": "gameId123",
  "title": "Novice Race",
  "mode": "solo" | "team",
  "category": "novice",           // slug категории
  "categoryLabel": "Novice",      // человекочитаемое имя
  "gameStatus": "in_progress",    // waiting | ready | in_progress | completed | cancelled
  "playerTeamIndex": 0,           // индекс команды игрока (0 или 1), -1 если не в игре
  "startedAt": "2026-02-26T12:00:00Z",
  "completedAt": null,
  "winnerTeam": null               // индекс выигравшей команды (0 или 1), null пока идёт
}
```

### Бинго (`type: "bingo"`)

```jsonc
{
  // ...общие поля...
  "type": "bingo",
  "gridSize": "5x5",              // "3x3" | "5x5" | "7x7"
  "winCondition": "line",         // "line" | "cross" | "full_house"

  "maps": [
    { "name": "Just2Easy", "position": 0 },
    { "name": "Kobra", "position": 1 },
    // ... (gridSize^2 элементов: 9 / 25 / 49)
  ],

  "teams": [
    {
      "index": 0,
      "name": "Team 1",
      "color": "blue",            // red | blue | green | yellow | purple | orange
      "status": "playing",        // not_ready | ready | playing | winner | loser
      "players": [
        { "ingameNick": "pippsza", "username": "pippsza" },
        { "ingameNick": "player2", "username": "player2" }
      ],
      "completedCells": [
        { "position": 0, "completedAt": "2026-02-26T12:05:00Z" },
        { "position": 7, "completedAt": "2026-02-26T12:08:00Z" }
      ]
    }
    // ... (1 команда в solo, 2 в team)
  ]
}
```

**Как рендерить бинго-сетку:**
- `maps` — массив карт, `position` = индекс ячейки (0-based, слева направо, сверху вниз)
- Для сетки 5x5: `row = Math.floor(position / 5)`, `col = position % 5`
- Если `position` есть в `completedCells` какой-то команды — ячейка закрашена цветом команды

### Рейс (`type: "race"`)

```jsonc
{
  // ...общие поля...
  "type": "race",
  "categoryMode": "selected",     // "selected" | "free"
  "pathLength": 5,                // кол-во шагов (3-20)
  "currentStep": 2,               // текущий шаг (0-indexed), продвигается после каждого финиша
  "surrenderedByTeam": null,       // индекс сдавшейся команды или null

  "maps": [
    { "name": "NUT_short_race2", "position": 0 },
    { "name": "run_ankii", "position": 1 },
    { "name": "Zap", "position": 2 },
    { "name": "NUT_short_race3", "position": 3 },
    { "name": "DontMove", "position": 4 }
  ],

  "teams": [
    {
      "index": 0,
      "name": "Team 1",
      "color": "blue",
      "status": "playing",
      "score": 2,                  // очки (кол-во пройденных шагов командой)
      "players": [
        { "ingameNick": "pippsza", "username": "pippsza" }
      ],
      "completedSteps": [
        { "position": 0, "completedAt": "2026-02-26T12:05:00Z", "finishTime": 13.68 },
        { "position": 1, "completedAt": "2026-02-26T12:07:00Z", "finishTime": 22.50 }
      ]
    },
    {
      "index": 1,
      "name": "Team 2",
      "color": "red",
      "status": "playing",
      "score": 0,
      "players": [
        { "ingameNick": "opponent", "username": "opponent" }
      ],
      "completedSteps": []
    }
  ]
}
```

**Как рендерить рейс-путь:**
- `maps` — линейный путь от `position: 0` до `position: pathLength - 1`
- Для каждого шага: проверить есть ли он в `completedSteps` какой-то команды
- Если есть — закрашен цветом команды + показать `finishTime`
- `currentStep` — текущий активный шаг (который ещё не пройден)

---

## Имплементация в клиенте

### 1. Поллинг

```
Каждые 5 секунд:
  GET /api/client/profile?nick={localPlayerNick}
  → обновить UI из ответа
```

Рекомендуемый интервал: **5 секунд**. Сервер обновляет данные с таким же интервалом (gameProgressJob).

### 2. Оптимистик апдейт

Клиент подключён к серверу и видит финиш-сообщения в чате. При виде финиша от участника игры — **сразу обновить UI**, не дожидаясь следующего поллинга.

#### Алгоритм для бинго:

```
При получении server message:
  1. Распарсить финиш (см. форматы ниже)
  2. Проверить: playerName есть в teams[*].players[*].ingameNick?
  3. Проверить: mapName есть в maps[*].name? (case-insensitive)
  4. Найти position карты: maps.find(m => m.name.lower() == mapName.lower()).position
  5. Проверить: position НЕТ в completedCells ни одной команды?
  6. Если всё ок → добавить в completedCells команды игрока:
     { position, completedAt: now() }
  7. Перерендерить сетку
```

#### Алгоритм для рейса:

```
При получении server message:
  1. Распарсить финиш
  2. Проверить: playerName есть в teams[*].players[*].ingameNick?
  3. Получить текущую карту: maps.find(m => m.position == currentStep).name
  4. Проверить: mapName совпадает с текущей картой? (case-insensitive)
  5. Если совпадает → добавить в completedSteps команды игрока:
     { position: currentStep, completedAt: now(), finishTime }
  6. Увеличить score команды на 1
  7. currentStep++
  8. Перерендерить путь
```

#### Форматы финиш-сообщений DDNet

Парсить из server messages (client_id == -1):

**Формат 1 — DDRace:**
```
PlayerName finished in: X minute(s) Y.ZZ second(s)
```
Regex: `^(.+?)\s+finished in:\s*(\d+)\s+minute\(s\)\s+([\d.]+)\s+second\(s\)`

**Формат 2 — Standard:**
```
'PlayerName' finished in MM:SS.CC
```
Regex: `^'?(.+?)'?\s+finished in\s+(\d+):(\d+)\.(\d+)`

Время в секундах:
- Формат 1: `minutes * 60 + seconds`
- Формат 2: `minutes * 60 + seconds + centiseconds / 100`

### 3. Reconciliation (сверка)

После каждого поллинга — **заменить локальный стейт серверным**. Сервер — источник правды. Оптимистик апдейт — только для мгновенной визуальной обратной связи.

```
onPollResponse(serverData):
  localState = serverData  // полная замена, не мерж
```

Это автоматически исправит ситуации когда:
- Клиент ошибочно посчитал финиш (неправильная карта)
- Кто-то сдался/отменил на сайте
- Игра завершилась

### 4. Определение состояния

```
if activeGame == null:
  → Показать статистику / "Нет активной игры"

if activeGame.gameStatus == "waiting" или "ready":
  → Лобби (ожидание старта)

if activeGame.gameStatus == "in_progress":
  → Игра идёт, показать сетку/путь, слушать финиши

if activeGame.gameStatus == "completed":
  → Показать результат (winnerTeam, team statuses)

if activeGame.gameStatus == "cancelled":
  → Показать "Игра отменена"
```

---

## Категории DDNet

| Slug | Название |
|------|----------|
| `novice` | Novice |
| `moderate` | Moderate |
| `brutal` | Brutal |
| `insane` | Insane |
| `dummy` | Dummy |
| `ddmax` | DDmaX |
| `oldschool` | Oldschool |
| `solo_maps` | Solo |
| `race` | Race |

---

## Цвета команд

| Slug | Рекомендуемый hex |
|------|------------------|
| `red` | `#ef4444` |
| `blue` | `#3b82f6` |
| `green` | `#22c55e` |
| `yellow` | `#eab308` |
| `purple` | `#a855f7` |
| `orange` | `#f97316` |

---

## Пример полного флоу

```
1. Клиент запускается
2. GET /api/client/profile?nick=pippsza
3. Ответ: activeGame.type == "race", gameStatus == "in_progress"
4. Рендерим путь из 5 карт, step 0 текущий
5. Игрок финишит NUT_short_race2 на сервере
6. Клиент видит "pippsza finished in: 0 minute(s) 13.68 second(s)"
7. Оптимистик: закрашиваем step 0, currentStep = 1, показываем "run_ankii"
8. Через 5с поллинг: сервер подтверждает step=1 (gameProgressJob обработал)
9. Reconciliation: localState = serverData (совпадает, ничего не меняется)
10. Игрок финишит все карты, сервер ставит gameStatus = "completed"
11. Поллинг: activeGame.gameStatus == "completed", winnerTeam == 0
12. Показываем результат
```
