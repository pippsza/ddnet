# Landing Page — Scroll Through Teeworlds Map "Quantum"

## Концепция

Главная страница проекта DDashBoard. Фон — карта DDNet **Quantum** (Brutal, mapper: Pulsar). При скролле камера плавно движется по маршруту карты. UI-секции (hero, features, download, about) размещены в координатах карты и появляются по мере продвижения. Заменяет текущий лендинг (`/[locale]/page.tsx`).

Все публичные страницы (about, rules, terms, privacy) переделываются в том же стиле — с фрагментами карты или единым маршрутом.

## Карта

- **Название:** Quantum
- **Источник:** DDNet (Brutal, mapper Pulsar)
- **Файл:** `Quantum.map` (1.3MB, Teeworlds DataFile v4)
- **Превью:** `https://ddnet.org/ranks/maps/Quantum.png` (360×225)
- **Интерактив:** `https://ddnet.org/mappreview/?map=Quantum`

## Реализация: Pre-rendered Tilemap

### Шаг 1: Рендер карты в PNG

Рендерим через DDNet клиент или `map_renderer`:

```bash
# Вариант 1: Скриншот из клиента на максимальном зуме
# Вариант 2: DDNet map_renderer (если есть)
# Вариант 3: Использовать WebGL рендерер (ddnet.org/mappreview)
#   → открыть в браузере, зумнуть, сделать screenshot через DevTools

# Результат: quantum-full.png (ожидаемый размер ~8000×2000 px)
```

### Шаг 2: Нарезка тайлов

```bash
# Нарезка на тайлы 512×512, формат WebP
python3 scripts/slice-map-tiles.py \
  --input quantum-full.png \
  --tile-size 512 \
  --output public/map-tiles/quantum/ \
  --format webp \
  --quality 85

# Blur placeholder для мгновенного показа
convert quantum-full.png -resize 128x -gaussian-blur 0x3 -quality 30 \
  public/map-tiles/quantum/placeholder.webp
```

### Шаг 3: Файловая структура

```
public/
  map-tiles/
    quantum/
      placeholder.webp          # ~5KB blur для SSR
      tile-0-0.webp             # 512×512 тайлы
      tile-0-1.webp
      tile-1-0.webp
      ...
      manifest.json             # { width, height, tileSize, tilesX, tilesY }

src/
  components/landing/
    MapScroller.tsx              # Scroll → camera → transform
    MapTileLayer.tsx             # Lazy-loaded тайлы с viewport culling
    MapSection.tsx               # UI-секция привязанная к координатам
    MapNavbar.tsx                # Навбар с навигацией по секциям
    LandingHero.tsx              # Hero секция
    LandingFeatures.tsx          # Features секция
    LandingGameModes.tsx         # Bingo + Race + KoG описание
    LandingDownload.tsx          # Скачивание клиента
    LandingAbout.tsx             # О проекте
    LandingFooter.tsx            # Футер
    MobileLayout.tsx             # Мобильная версия (без карты)

  app/(frontend)/[locale]/
    page.tsx                     # Лендинг (заменяет текущий)
    (info)/about/page.tsx        # О нас (в стиле карты или с фрагментом)
```

## Секции лендинга

### Маршрут камеры (scroll progress → координаты)

```typescript
const CAMERA_PATH = [
  // progress: 0.00 — Hero (левый край карты)
  { progress: 0.00, x: 50,  y: 80 },

  // progress: 0.15 — Features overview
  { progress: 0.15, x: 180, y: 90 },

  // progress: 0.35 — Game Modes (Bingo + Race)
  { progress: 0.35, x: 350, y: 75 },

  // progress: 0.55 — KoG modes
  { progress: 0.55, x: 520, y: 85 },

  // progress: 0.70 — Download Client
  { progress: 0.70, x: 680, y: 70 },

  // progress: 0.85 — About / Team
  { progress: 0.85, x: 830, y: 90 },

  // progress: 1.00 — Footer
  { progress: 1.00, x: 950, y: 80 },
]
```

*Координаты будут подобраны после рендера карты под реальный ландшафт.*

### 1. Hero (0%)

```
┌─────────────────────────────────┐
│          DDashBoard             │
│    DDNet community platform     │
│                                 │
│  [Start Playing]  [Learn More]  │
│                                 │
│     ↓ Scroll to explore ↓      │
└─────────────────────────────────┘
```

- Большой заголовок с градиентом
- Анимированный тии (PeekingTee) на карте
- Две CTA кнопки: Login/Register + Scroll down
- Subtle particles или glow на кнопках

### 2. Features (15%)

```
┌────────────┐  ┌────────────┐  ┌────────────┐
│  🎯 Bingo  │  │  🏁 Race   │  │  👥 Social │
│ Complete   │  │ Race maps  │  │ Friends,   │
│ maps on    │  │ against    │  │ chat,      │
│ grid       │  │ players    │  │ leaderboard│
└────────────┘  └────────────┘  └────────────┘
```

- 3 карточки с иконками и описаниями
- Анимация: карточки появляются по очереди (stagger)
- Glassmorphism стиль (blur background)

### 3. Game Modes — DDNet (35%)

```
┌──────────────────────────────────────┐
│  DDNet Bingo           DDNet Race    │
│  ┌──────────┐         ┌──────────┐  │
│  │ 3×3 Grid │         │ Path 1→5 │  │
│  │ ■ ■ □    │         │ ●→●→●→●  │  │
│  │ □ ■ ■    │         │          │  │
│  │ ■ □ ■    │         │ 13 cats  │  │
│  └──────────┘         └──────────┘  │
│  Solo & Team modes                   │
└──────────────────────────────────────┘
```

- Мини-демо бинго сетки (анимированное)
- Мини-демо race path
- Список DDNet категорий

### 4. Game Modes — KoG (55%)

```
┌──────────────────────────────────────┐
│  KoG Bingo             KoG Race     │
│                                      │
│  King of Gores maps                  │
│  7 categories: Easy → Extreme        │
│  Same gameplay, different maps       │
│                                      │
│  [Play KoG Bingo]  [Play KoG Race]  │
└──────────────────────────────────────┘
```

- Акцент на KoG как отдельный режим
- Зелёная цветовая схема (emerald) vs синяя DDNet
- Ссылки на kog.tw

### 5. Download Client (70%)

```
┌──────────────────────────────────────┐
│  📥 Download BingoClient             │
│                                      │
│  Modified DDNet client with          │
│  built-in Bingo & Race UI           │
│                                      │
│  ✓ Create games from client          │
│  ✓ Real-time game overlay            │
│  ✓ Auto-join servers                 │
│  ✓ Finish detection                  │
│                                      │
│  [Download for Windows]              │
│  [Download for Linux]                │
│  [Download for macOS]                │
│                                      │
│  Version: 1.0.0 | 45MB              │
└──────────────────────────────────────┘
```

- Карточка с описанием клиента
- Кнопки скачивания по платформам (placeholder URLs)
- Список фич клиента
- Версия и размер файла

### 6. About / Team (85%)

- Компактная версия About page
- Аватарки команды (tee skins)
- Ссылки: Discord, GitHub
- "Powered by DDNet community"

### 7. Footer (100%)

- Ссылки: About, Rules, Terms, Privacy, Support
- Social links
- Copyright

## Навбар

Фиксированный сверху, полупрозрачный. При клике на пункт — плавный скролл к секции.

```
[DDashBoard]  Home  Features  Modes  Download  About  |  [Login] [Register]
```

На мобилке — бургер-меню.

## Адаптивность

### Desktop (>1024px)
- Полный маршрут по карте
- Параллакс при движении мыши (смещение /30)
- UI-секции позиционированы в координатах карты
- Navbar прозрачный с backdrop-blur

### Tablet (768-1024px)
- Карта масштабирована (`transform: scale`)
- Секции по центру viewport
- Без параллакса мыши
- Navbar solid background

### Mobile (<768px)
- **НЕТ карты** — обычный вертикальный скролл
- Карта заменяется на статичный blur-фон или gradient
- Все секции в обычном потоке (flex column)
- Компактные карточки
- Полноценная мобильная вёрстка

```tsx
// MobileLayout.tsx — fallback для мобилки
function MobileLayout({ sections }) {
  return (
    <div className="flex flex-col gap-12 px-4 py-8">
      <LandingHero mobile />
      <LandingFeatures mobile />
      <LandingGameModes mobile />
      <LandingDownload mobile />
      <LandingAbout mobile />
      <LandingFooter />
    </div>
  )
}

// В page.tsx:
function LandingPage() {
  const isMobile = useMediaQuery('(max-width: 768px)')

  if (isMobile) return <MobileLayout />
  return <MapScroller map="quantum" path={CAMERA_PATH}>...</MapScroller>
}
```

## Стилизация публичных страниц

Все публичные страницы (`/about`, `/rules`, `/terms`, `/privacy`) получат:

1. **Фон** — blur-фрагмент карты Quantum (статичный) или тёмный gradient
2. **Стиль текста** — тот же glassmorphism, те же цвета
3. **Navbar** — тот же компонент что на лендинге
4. **Footer** — тот же компонент

Это создаёт единую визуальную идентичность для всех публичных страниц.

## Loading Flow

```
T=0ms    SSR: HTML с placeholder.webp (blur, 5KB inline base64)
         + скелетон UI (заголовки, кнопки)
         + navbar с навигацией
T=50ms   CSS загружен, layout отрисован
T=100ms  React hydration, scroll listener подключен
T=200ms  Первый видимый тайл загружен (~50KB WebP)
         Blur placeholder плавно исчезает (CSS transition)
T=500ms  Соседние тайлы подгружаются в фоне
T=1s     Hero секция полностью готова, анимации запущены
Scroll   Новые тайлы грузятся по мере продвижения (IntersectionObserver)
```

## Зависимости

- **Framer Motion** — уже установлен (`sR.div`, `useScroll`, `useTransform`)
- **next/image** — для оптимизации тайлов
- **tailwindcss** — уже используется
- Нет новых зависимостей

## Шаги реализации

1. Рендер карты Quantum в высоком разрешении
2. Нарезка тайлов + blur placeholder
3. MapScroller компонент (scroll → camera → transforms)
4. MapTileLayer (lazy loading + viewport culling)
5. Секции лендинга (Hero, Features, GameModes, Download, About, Footer)
6. Navbar с навигацией по секциям
7. Мобильная версия (MobileLayout)
8. Замена текущего `[locale]/page.tsx`
9. Адаптация About/Rules/Terms/Privacy страниц
10. Тестирование на desktop + mobile
