# Stage 2: Bingo Core - Progress Report

## ✅ Completed Tasks

### 2.1 Обновить коллекцию Bingo

**Файл:** `src/collections/bingo.ts`

Добавлены следующие поля:

#### `isPublic` (checkbox)

- Определяет, видна ли игра в публичном лобби
- По умолчанию: `false` (приватная игра)
- Публичные игры доступны для всех, приватные требуют invite code

#### `difficultyRange` (group)

- **`min`**: Минимальная сложность карт (0-5 звёзд)
- **`max`**: Максимальная сложность карт (0-5 звёзд)
- Используется при генерации сетки для фильтрации карт

#### `createdBy` (relationship → users)

- Создатель игры
- Автоматически устанавливается при создании (`req.user.id`)
- Read-only для пользователей

#### `inviteCode` (text, unique)

- 8-символьный код для приглашения в приватную игру
- Автоматически генерируется для приватных игр
- Формат: `A-Z (без I,O) + 2-9` (исключены похожие символы)
- Ссылка для шаринга: `/bingo/join/{inviteCode}`

**Функция генерации кода:**

```typescript
function generateInviteCode(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const length = 8
  let code = ''
  for (let i = 0; i < length; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return code
}
```

### 2.2 Создать функцию генерации сетки

**Файл:** `src/services/bingo/gridGenerator.ts`

#### Основная функция: `generateBingoGrid(options)`

**Параметры:**

```typescript
interface GridGeneratorOptions {
  category: string // Категория карт (novice, moderate, etc.)
  subcategory?: string // Подкатегория (для ddmax, oldschool)
  gridSize: '3x3' | '5x5' | '7x7'
  difficultyMin: number // 0-5 звёзд
  difficultyMax: number // 0-5 звёзд
}
```

**Возвращает:**

```typescript
interface MapInfo {
  mapName: string
  position: number // 0-48
  difficulty: number // Звёзды
  points: number // Очки DDNet
}
```

**Алгоритм:**

1. Получить все карты из категории (DDNet API)
2. Отфильтровать по диапазону сложности
3. Перемешать (Fisher-Yates shuffle)
4. Выбрать нужное количество (9/25/49)
5. Присвоить позиции (0-48)

**Валидация:**

- Проверка диапазона сложности (0-5)
- Проверка min <= max
- Проверка достаточности карт в категории

**TODO:**

- ⚠️ Интегрировать с реальным DDNet API (сейчас используются sample данные)
- Возможно создать кеш карт в базе для быстрого доступа

### 2.3 Создать функцию определения победителя

**Файл:** `src/services/bingo/winChecker.ts`

#### Основная функция: `checkWinner(gridSize, winCondition, teams)`

**Параметры:**

```typescript
interface TeamCells {
  teamIndex: number
  completedCells: number[] // Массив позиций (0-48)
}
```

**Возвращает:**

```typescript
interface WinCheckResult {
  hasWinner: boolean
  winningTeamIndex?: number
  winningCells?: number[] // Ячейки, составляющие победный паттерн
  condition?: WinCondition
}
```

#### Поддерживаемые условия победы:

**1. Line (линия)**

- Горизонтальная линия (любая строка)
- Вертикальная линия (любой столбец)
- Диагональ (2 варианта: \\ и /)

**2. Cross (крест)**

- Средняя строка + средний столбец
- Работает только для нечётных сеток (3x3, 5x5, 7x7)

**3. Full House (полное заполнение)**

- Все ячейки сетки закрыты

#### Вспомогательные функции:

**`visualizeGrid(size, team1Cells, team2Cells)`**

- Визуализация сетки для дебага
- Показывает:
  - `[ ]` - пустая ячейка
  - `[1]` - закрыта командой 1
  - `[2]` - закрыта командой 2
  - `[X]` - закрыта обеими командами

**`getWinningPatterns(gridSize, winCondition)`**

- Возвращает все возможные победные комбинации
- Используется для подсветки в UI

**Пример использования:**

```typescript
import { checkWinner, visualizeGrid } from '@/services/bingo/winChecker'

const teams = [
  { teamIndex: 0, completedCells: [0, 1, 2, 5, 10] },
  { teamIndex: 1, completedCells: [3, 4, 6, 7, 8] },
]

const result = checkWinner('3x3', 'line', teams)

if (result.hasWinner) {
  console.log(`Team ${result.winningTeamIndex} won!`)
  console.log('Winning cells:', result.winningCells)

  // Визуализация
  console.log(visualizeGrid(3, teams[0].completedCells, teams[1].completedCells))
}
```

## 📊 Примеры работы

### Генерация сетки 3x3 для Novice

```typescript
import { generateBingoGrid } from '@/services/bingo/gridGenerator'

const maps = await generateBingoGrid({
  category: 'novice',
  gridSize: '3x3',
  difficultyMin: 1,
  difficultyMax: 3,
})

// Result:
// [
//   { mapName: 'Kobra', position: 0, difficulty: 2, points: 2 },
//   { mapName: 'Tutorial', position: 1, difficulty: 1, points: 1 },
//   ...
// ]
```

### Проверка победителя (Line)

```typescript
// 3x3 сетка:
// [0] [1] [2]
// [3] [4] [5]
// [6] [7] [8]

// Команда 1 закрыла верхнюю строку
const teams = [{ teamIndex: 0, completedCells: [0, 1, 2] }]

const result = checkWinner('3x3', 'line', teams)
// result.hasWinner = true
// result.winningTeamIndex = 0
// result.winningCells = [0, 1, 2]
```

### Проверка Cross (5x5)

```typescript
// 5x5 сетка, нужна средняя строка + средний столбец:
// [ ] [ ] [X] [ ] [ ]    pos: 2, 7, 12, 17, 22 (средний столбец)
// [ ] [ ] [X] [ ] [ ]    pos: 10, 11, 12, 13, 14 (средняя строка)
// [X] [X] [X] [X] [X]
// [ ] [ ] [X] [ ] [ ]
// [ ] [ ] [X] [ ] [ ]

const teams = [
  {
    teamIndex: 0,
    completedCells: [2, 7, 10, 11, 12, 13, 14, 17, 22],
  },
]

const result = checkWinner('5x5', 'cross', teams)
// result.hasWinner = true
```

## 🔄 Next Steps (Stage 2 продолжение)

### 2.4 Создать Payload Job для отслеживания прогресса

**TODO:**

- [ ] Создать `src/jobs/bingoProgressJob.ts`
- [ ] Интегрировать с DDNet API для проверки финишей
- [ ] Поллинг активных игр каждые 5 секунд
- [ ] Обновление completedCells при новых финишах
- [ ] Автоматическая проверка победителя
- [ ] Обновление gameStatus на "completed" при победе

### 2.5 Создать API endpoint для создания игры

**TODO:**

- [ ] `POST /api/bingo/create`
- [ ] Валидация параметров
- [ ] Генерация сетки
- [ ] Проверка лимита (1 активная игра на юзера)
- [ ] Создание записи в коллекции Bingo

### 2.6 Создать API endpoint для присоединения к игре

**TODO:**

- [ ] `POST /api/bingo/join/{gameId}`
- [ ] `POST /api/bingo/join-by-code/{inviteCode}`
- [ ] Проверка доступности (public или invite code)
- [ ] Добавление игрока в команду
- [ ] Проверка лимитов (max 2 игрока в команде)

### 2.7 Frontend компоненты

**TODO:**

- [ ] `BingoGrid` - отображение сетки с картами
- [ ] `BingoLobby` - список публичных игр
- [ ] `CreateGameForm` - форма создания игры
- [ ] `GameInviteLink` - компонент для шаринга
- [ ] `BingoProgress` - real-time прогресс игры

## 🎯 Key Features Summary

### Реализованные фичи:

✅ Публичные/приватные игры (isPublic + inviteCode)
✅ Генерация сеток с фильтром по сложности
✅ Универсальный алгоритм проверки победителя (line/cross/full_house)
✅ Поддержка всех размеров сетки (3x3, 5x5, 7x7)
✅ Визуализация для дебага

### Следующие шаги:

🔄 Real-time отслеживание финишей (DDNet API polling)
🔄 API endpoints для создания/присоединения
🔄 Frontend интерфейс

## 📝 Notes

- **Performance:** Генерация сетки может занимать время при первом запросе (кеш рекомендуется)
- **DDNet API:** Текущая версия использует sample данные. Нужна интеграция с реальным API
- **Масштабирование:** При большом количестве игр, polling job может стать bottleneck. Рассмотреть WebSockets для real-time
