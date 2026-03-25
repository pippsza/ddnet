# Landing Page — Scroll Through Teeworlds Map

## Концепция

Лендинг-страница проекта, где фоном является реальная карта Teeworlds/DDNet/KoG. При скролле камера плавно двигается по карте (слева направо или по заданному маршруту). UI-элементы (заголовки, описания фич, кнопки) размещены в координатах карты и появляются по мере продвижения.

**Референс:** bestclient.fun — WebGL рендерер .map файлов в iframe + Framer Motion для UI.

## Как это работает у bestclient.fun

```
┌─────────────────────────────────────────────────┐
│ Next.js page (z-10, pointer-events-none)        │
│  ┌────────────────────────────────────────┐      │
│  │ Framer Motion UI layer                 │      │
│  │  - Navbar (scrollTarget: 0/25/50/75%)  │      │
│  │  - Feature cards at mapX/mapY coords   │      │
│  │  - Download buttons                    │      │
│  │  - Debug panel (hidden, "debug" easter)│      │
│  └────────────────────────────────────────┘      │
│                                                   │
│ <iframe src="/mappreview/index.html"> (z-0)       │
│  ┌────────────────────────────────────────┐      │
│  │ WebGL canvas (twwebgl.js)              │      │
│  │  - Парсит .map файл (twdatafile.js)    │      │
│  │  - Рендерит тайлы + квады через WebGL  │      │
│  │  - Текстуры из .map файла              │      │
│  │  - Камера управляется из parent frame  │      │
│  └────────────────────────────────────────┘      │
└─────────────────────────────────────────────────┘

Scroll (0% → 100%) → cameraX/cameraY → translateX/Y UI + iframe camera
Mouse hover → parallax offset (mouseX/40, mouseY/40)
```

### Проблемы bestclient.fun
1. **Весь .map файл грузится разом** — несколько МБ, все текстуры декодируются в GPU
2. **Нет loading state** — чёрный экран с "Loading..." пока грузится
3. **Нет мобильной вёрстки** — камера и UI не адаптируются
4. **Нет viewport culling** — WebGL рендерит все слои, даже невидимые
5. **iframe коммуникация** — ограниченный контроль над рендерером

---

## Варианты реализации

### Вариант A: Pre-rendered Tilemap (рекомендуется)

**Суть:** Карту заранее рендерим в набор тайлов (как Google Maps) и отображаем через CSS transform.

**Подготовка:**
1. Выбираем .map файл
2. Рендерим его оффлайн в большое PNG (через DDNet map renderer или скрипт)
3. Нарезаем на тайлы 256×256 или 512×512
4. Оптимизируем: WebP, lazy loading по viewport

**Runtime:**
```
scrollYProgress (0→1)
  → useTransform → cameraX, cameraY
  → CSS transform: translate3d(-cameraX, -cameraY, 0) на контейнере с тайлами
  → Только видимые тайлы рендерятся (IntersectionObserver или вычисление viewport)
  → UI-элементы абсолютно позиционированы в координатах карты
```

**Плюсы:**
- Быстрая загрузка (тайлы грузятся по мере скролла)
- Работает везде (нет WebGL зависимости)
- Progressive loading с blur-up
- Отличная мобильная производительность
- SSR-friendly (скелетон/placeholder без JS)

**Минусы:**
- Нельзя выключить текстуры в runtime (статичная картинка)
- Нужен build step для нарезки тайлов
- Масштабирование (zoom) требует нескольких уровней тайлов

**Стек:** Next.js + Framer Motion + CSS transforms + Image lazy loading

---

### Вариант B: WebGL renderer (как bestclient.fun, но лучше)

**Суть:** Берём готовый WebGL рендерер (twwebgl.js), но улучшаем.

**Улучшения над bestclient.fun:**
1. **Viewport culling** — рендерим только видимые тайлы
2. **Streaming load** — грузим .map чанками, показываем прогресс
3. **Loading skeleton** — анимированный placeholder пока грузится
4. **postMessage API** — управление камерой из parent frame
5. **Mobile touch** — touch events для скролла

**Плюсы:**
- Реальный рендер карты (можно переключать текстуры, слои)
- Интерактивность (zoom, pan)
- Формат .map — стандартный, любая карта

**Минусы:**
- WebGL может не работать на старых мобилках
- Сложнее в реализации
- .map файл всё равно несколько МБ
- Нужен fallback для no-WebGL

---

### Вариант C: Гибрид (рекомендуется для продакшена)

**Суть:** Pre-rendered тайлы как дефолт + опциональный WebGL для "живого" режима.

```
Загрузка страницы:
  1. SSR: скелетон + первый видимый тайл (inline, <1KB blur)
  2. Lazy load: тайлы по мере скролла (WebP, 256×256)
  3. Опционально: после полной загрузки предложить "Live mode"
     → Загружает .map файл → WebGL рендер (с toggle текстур)
```

**Плюсы:** быстрая загрузка + возможность live-рендера для энтузиастов

---

## Рекомендация: Вариант A (Pre-rendered Tilemap)

Для лендинга проекта самый надёжный вариант. Причины:

1. **Мобилка** — работает идеально, CSS transforms аппаратно ускорены
2. **Скорость** — первый экран за <1 сек (один тайл + blur placeholder)
3. **SEO** — SSR-friendly, контент индексируется
4. **Простота** — нет WebGL, нет iframe, нет бинарного парсинга
5. **Надёжность** — работает в любом браузере

---

## Архитектура (Вариант A)

### Файловая структура

```
public/
  map-tiles/
    tile-0-0.webp    # 512×512 тайлы
    tile-0-1.webp
    tile-1-0.webp
    ...
    placeholder.webp  # 64×64 blur версия всей карты

src/
  app/(frontend)/
    page.tsx          # Лендинг (или отдельный route)

  components/landing/
    MapScroller.tsx    # Основной компонент карты + скролл
    MapSection.tsx     # UI-секция привязанная к координатам карты
    MapNavbar.tsx      # Навбар с навигацией по секциям
    MapTile.tsx        # Компонент одного тайла с lazy loading
```

### Ключевые компоненты

#### MapScroller — контейнер карты

```tsx
interface MapScrollerProps {
  mapWidth: number        // Полная ширина карты в px
  mapHeight: number       // Полная высота карты в px
  tileSize: number        // 512
  tilesX: number          // Кол-во тайлов по X
  tilesY: number          // Кол-во тайлов по Y
  path: {x: number, y: number}[]  // Маршрут камеры (scroll 0→1 → path)
  children: ReactNode     // UI-секции
}

// Логика:
// 1. Scroll (0→100%) → progress
// 2. progress → интерполяция по path → cameraX, cameraY
// 3. CSS transform: translate3d(-cameraX, -cameraY, 0) + scale
// 4. Видимые тайлы = вычисляем по cameraX/Y + viewport size
// 5. Рендерим только видимые тайлы
```

#### MapSection — UI-элемент на карте

```tsx
interface MapSectionProps {
  x: number              // Позиция на карте (в px карты)
  y: number
  children: ReactNode
  animateIn?: boolean    // Анимация появления при скролле
}

// Рендерится как absolute div внутри карты
// Появляется когда камера приближается
```

#### Маршрут камеры

```typescript
// Маршрут задаётся массивом точек
// Scroll progress интерполируется между ними
const CAMERA_PATH = [
  { x: 100, y: 150 },   // 0% — начало (Hero)
  { x: 400, y: 150 },   // 25% — Features
  { x: 700, y: 120 },   // 50% — Performance
  { x: 900, y: 180 },   // 75% — Download
  { x: 1100, y: 150 },  // 100% — Footer
]
```

### Адаптивность

**Desktop (>1024px):**
- Полный скролл по маршруту
- Параллакс при движении мыши
- UI-секции сбоку от маршрута

**Tablet (768-1024px):**
- Уменьшенный масштаб карты
- Убрать параллакс мыши
- UI-секции по центру

**Mobile (<768px):**
- Вертикальный скролл (стандартный)
- Карта как фоновая полоска (горизонтальная, фиксированная)
- Или: отказаться от карты, показать статичный скриншот
- UI-секции стандартным потоком (flex column)

### Подготовка тайлов (build script)

```bash
# 1. Рендерим карту в PNG через DDNet инструменты
# (map_renderer или screenshot из клиента)

# 2. Нарезаем на тайлы
python3 scripts/slice-map.py \
  --input map-render.png \
  --tile-size 512 \
  --output public/map-tiles/ \
  --format webp \
  --quality 85

# 3. Генерируем blur placeholder
convert map-render.png -resize 64x -quality 20 public/map-tiles/placeholder.webp
```

### Loading flow

```
T=0ms    SSR: HTML с placeholder (blur) + скелетон UI
T=100ms  Hydration: React mount, scroll listener
T=200ms  Первый видимый тайл загружен (один HTTP запрос, ~50KB WebP)
T=500ms  Соседние тайлы подгружаются в фоне
T=1s     Все видимые тайлы готовы, UI анимации запускаются
Scroll   Новые тайлы грузятся по мере продвижения
```

---

## Шаги реализации

1. **Выбрать карту** — любая .map из DDNet/KoG, которая визуально красивая и достаточно длинная горизонтально
2. **Отрендерить карту** — через DDNet map renderer или скриншотом из клиента (максимальный зум)
3. **Нарезать тайлы** — скрипт для нарезки PNG → WebP тайлы
4. **Создать MapScroller компонент** — Framer Motion useScroll + CSS transforms
5. **Разместить UI-секции** — Hero, Features, Download и т.д. в координатах карты
6. **Мобильная вёрстка** — fallback layout без карты или с упрощённой версией
7. **Loading state** — blur placeholder + progressive tile loading
8. **Оптимизация** — viewport culling, preload соседних тайлов, WebP

## Нужно от тебя

1. Какую карту хочешь использовать? (название .map файла)
2. Какой контент на лендинге? (секции: hero, features, download, stats?)
3. Лендинг для DDNet Bingo проекта или для чего-то другого?
4. Хочешь ли "живой режим" (WebGL) или достаточно статичных тайлов?
