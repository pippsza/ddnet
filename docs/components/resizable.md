# Resizable Component

Компоненты для создания изменяемых панелей на основе библиотеки [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels).

## Установка

Библиотека уже установлена в проекте.

## Основные компоненты

- **ResizablePanelGroup** - контейнер для панелей (обертка над `Group`)
- **ResizablePanel** - отдельная панель (обертка над `Panel`)
- **ResizableHandle** - разделитель/ручка для изменения размера (обертка над `Separator`)

## Примеры использования

### Базовый пример (горизонтальный)

```tsx
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'

export function Example() {
  return (
    <ResizablePanelGroup orientation="horizontal" className="min-h-[200px]">
      <ResizablePanel defaultSize="50%">
        <div className="p-4">Левая панель</div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize="50%">
        <div className="p-4">Правая панель</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
```

### Вертикальная ориентация

```tsx
<ResizablePanelGroup orientation="vertical" className="min-h-[400px]">
  <ResizablePanel defaultSize="50%">
    <div className="p-4">Верхняя панель</div>
  </ResizablePanel>
  <ResizableHandle />
  <ResizablePanel defaultSize="50%">
    <div className="p-4">Нижняя панель</div>
  </ResizablePanel>
</ResizablePanelGroup>
```

### С видимой ручкой

```tsx
<ResizablePanelGroup orientation="horizontal" className="min-h-[200px]">
  <ResizablePanel defaultSize="50%">
    <div className="p-4">Левая панель</div>
  </ResizablePanel>
  <ResizableHandle withHandle /> {/* Добавляем видимую ручку */}
  <ResizablePanel defaultSize="50%">
    <div className="p-4">Правая панель</div>
  </ResizablePanel>
</ResizablePanelGroup>
```

### С ограничениями размера

```tsx
<ResizablePanelGroup orientation="horizontal" className="min-h-[200px]">
  <ResizablePanel defaultSize="30%" minSize="20%" maxSize="40%">
    <div className="p-4">Минимум 20%, максимум 40%</div>
  </ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel minSize="30%">
    <div className="p-4">Минимум 30%</div>
  </ResizablePanel>
</ResizablePanelGroup>
```

### Сворачиваемая панель

```tsx
<ResizablePanelGroup orientation="horizontal" className="min-h-[200px]">
  <ResizablePanel defaultSize="30%" minSize="20%" collapsible collapsedSize="0%">
    <div className="p-4">Можно свернуть полностью</div>
  </ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel>
    <div className="p-4">Основная панель</div>
  </ResizablePanel>
</ResizablePanelGroup>
```

### Вложенные группы

```tsx
<ResizablePanelGroup orientation="horizontal" className="min-h-[400px]">
  <ResizablePanel defaultSize="50%">
    <div className="p-4">Левая панель</div>
  </ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel defaultSize="50%">
    <ResizablePanelGroup orientation="vertical">
      <ResizablePanel defaultSize="50%">
        <div className="p-4">Верхняя правая</div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize="50%">
        <div className="p-4">Нижняя правая</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  </ResizablePanel>
</ResizablePanelGroup>
```

### С сохранением состояния

```tsx
import { useDefaultLayout } from 'react-resizable-panels'

export function PersistentLayout() {
  const { defaultLayout, onLayoutChange } = useDefaultLayout({
    id: 'my-layout-id',
    storage: localStorage,
  })

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      defaultLayout={defaultLayout}
      onLayoutChange={onLayoutChange}
      className="min-h-[200px]"
    >
      <ResizablePanel id="left" defaultSize="30%">
        <div className="p-4">Левая</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel id="center" defaultSize="40%">
        <div className="p-4">Центр</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel id="right" defaultSize="30%">
        <div className="p-4">Правая</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
```

## Пропсы

### ResizablePanelGroup

| Проп             | Тип                          | По умолчанию   | Описание                               |
| ---------------- | ---------------------------- | -------------- | -------------------------------------- |
| `orientation`    | `"horizontal" \| "vertical"` | `"horizontal"` | Ориентация панелей                     |
| `defaultLayout`  | `Layout`                     | -              | Начальная раскладка (массив процентов) |
| `onLayoutChange` | `(layout: Layout) => void`   | -              | Колбэк при изменении размеров          |
| `id`             | `string \| number`           | -              | ID для сохранения состояния            |
| `className`      | `string`                     | -              | CSS классы                             |

### ResizablePanel

| Проп            | Тип                                       | По умолчанию | Описание                              |
| --------------- | ----------------------------------------- | ------------ | ------------------------------------- |
| `defaultSize`   | `number \| string`                        | -            | Начальный размер (%, px, rem, vh, vw) |
| `minSize`       | `number \| string`                        | `"0%"`       | Минимальный размер                    |
| `maxSize`       | `number \| string`                        | `"100%"`     | Максимальный размер                   |
| `collapsible`   | `boolean`                                 | `false`      | Можно ли полностью свернуть           |
| `collapsedSize` | `number \| string`                        | `"0%"`       | Размер в свернутом состоянии          |
| `id`            | `string \| number`                        | -            | Уникальный ID панели                  |
| `onResize`      | `(size: PanelSize, id, prevSize) => void` | -            | Колбэк при изменении размера          |
| `className`     | `string`                                  | -            | CSS классы                            |

### ResizableHandle

| Проп         | Тип       | По умолчанию | Описание                    |
| ------------ | --------- | ------------ | --------------------------- |
| `withHandle` | `boolean` | `false`      | Показывать видимую ручку    |
| `disabled`   | `boolean` | `false`      | Отключить изменение размера |
| `className`  | `string`  | -            | CSS классы                  |

## Форматы размеров

Размеры могут быть указаны в следующих форматах:

- **Проценты**: `"30%"` или `30` (число без единиц считается процентами)
- **Пиксели**: `"200px"` или `200` (с явным указанием `px`)
- **Относительные единицы**: `"10rem"`, `"2em"`
- **Viewport единицы**: `"50vh"`, `"30vw"`

## Imperative API

Можно управлять панелями программно:

```tsx
import { usePanelRef } from 'react-resizable-panels'

export function ControlledPanel() {
  const panelRef = usePanelRef()

  return (
    <>
      <button onClick={() => panelRef.current?.collapse()}>Свернуть</button>
      <button onClick={() => panelRef.current?.expand()}>Развернуть</button>
      <button onClick={() => panelRef.current?.resize(50)}>Установить 50%</button>

      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel panelRef={panelRef} collapsible>
          <div className="p-4">Управляемая панель</div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel>
          <div className="p-4">Другая панель</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  )
}
```

## Стилизация

Компоненты используют data-атрибуты для стилизации:

- `data-orientation` - ориентация группы
- `data-panel` - атрибут панели
- `data-resize-handle` - атрибут разделителя

Можно переопределить стили через `className`.

## Доступность

- Компоненты следуют паттерну ["Window Splitter"](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/)
- Поддержка клавиатуры (стрелки для изменения размера)
- ARIA-атрибуты для screen readers
- Фокус на разделителе при изменении размера

## Полезные ссылки

- [Официальная документация react-resizable-panels](https://github.com/bvaughn/react-resizable-panels)
- [Примеры использования](https://react-resizable-panels.vercel.app/)
