'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Plus, Trash2, Grid3x3, Rows3, Hash, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getWinningPatterns, getPlusCrossCells, getXCells } from '@/services/bingo/winChecker'

function getLocalMapThumbnailUrl(mapName: string): string {
  return `/maps/${mapName.replace(/ /g, '_')}.png`
}

type GridSize = '3x3' | '5x5' | '7x7'
type WinCondition = 'line' | 'cross' | 'full_house'

interface BingoGridPreviewProps {
  gridSize: GridSize
  winCondition: WinCondition
  onGridSizeChange: (size: GridSize) => void
  onWinConditionChange: (condition: WinCondition) => void
  availableMapCount: number | null
  disabled?: boolean
}

const GRID_SIZES: GridSize[] = ['3x3', '5x5', '7x7']
const CELLS_FOR_SIZE: Record<GridSize, number> = { '3x3': 9, '5x5': 25, '7x7': 49 }

const PLACEHOLDER_MAPS = [
  'Kobra 4', 'Sunny Side Up', 'Multeasymap', 'Back in Time 2', 'Absurd 3',
  'Stronghold', 'Crimson', 'Frozen', 'Grandma', 'Jungle Run',
  'Just2Easy', 'Binary', 'LearnToPlay', 'Linear', 'Moonlight',
  'Naufrage 3', 'Orange 1', 'Springlobe 3', 'StepByStep', 'Tsunami',
  'Tutorial', 'Wasteland', 'Autumn', 'Castle', 'Zenith',
]

const WIN_CONDITION_OPTIONS: { value: WinCondition; label: string; icon: typeof Rows3 }[] = [
  { value: 'line', label: 'Line', icon: Rows3 },
  { value: 'cross', label: 'Cross', icon: Hash },
  { value: 'full_house', label: 'Full House', icon: LayoutGrid },
]

// ---------- Memoized cell components ----------

const GhostCell = React.memo(function GhostCell({
  row,
  col,
  displaySize,
  onExpand,
}: {
  row: number
  col: number
  displaySize: number
  onExpand: () => void
}) {
  const isCorner = (row === 0 || row === displaySize - 1) && (col === 0 || col === displaySize - 1)

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.3 }}
      onClick={onExpand}
      className={cn(
        'aspect-square flex items-center justify-center rounded-lg border-2 border-dashed transition-colors',
        'border-muted-foreground/20 bg-transparent hover:border-primary/50 hover:bg-primary/5',
        isCorner && 'opacity-40',
      )}
    >
      <Plus className="h-3.5 w-3.5 text-muted-foreground/50" />
    </motion.button>
  )
})

const GridCell = React.memo(function GridCell({
  position,
  mapName,
  isHighlighted,
  isOuterRing,
  onShrink,
  imageFailed,
  onImageError,
}: {
  position: number
  mapName: string
  isHighlighted: boolean
  isOuterRing: boolean
  onShrink: (() => void) | null
  imageFailed: boolean
  onImageError: () => void
}) {
  const showImage = !imageFailed

  return (
    <motion.div
      layoutId={`cell-${position}`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        layout: { duration: 0.4, ease: 'easeInOut' },
        scale: { duration: 0.3 },
        opacity: { duration: 0.3 },
      }}
      className={cn(
        'aspect-square flex flex-col items-center justify-center rounded-lg border-2 p-1 text-center relative overflow-hidden group transition-colors duration-300',
        isHighlighted
          ? 'border-sky-400/70 bg-sky-400/15 ring-2 ring-sky-400/40'
          : isOuterRing
            ? 'border-destructive/40 bg-muted/20 hover:bg-destructive/10'
            : 'border-border bg-muted/30',
      )}
    >
      {showImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${getLocalMapThumbnailUrl(mapName)})` }}
          />
          <div
            className={cn(
              'absolute inset-0',
              isHighlighted ? 'bg-sky-900/60' : isOuterRing ? 'bg-black/70' : 'bg-black/55',
            )}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getLocalMapThumbnailUrl(mapName)}
            alt=""
            onError={onImageError}
            className="hidden"
          />
        </>
      )}

      <span
        className={cn(
          'text-[7px] sm:text-[9px] font-semibold leading-tight line-clamp-2 transition-colors duration-300 relative z-10 text-center',
          showImage
            ? isHighlighted
              ? 'text-sky-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
              : 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
            : isHighlighted
              ? 'text-sky-300'
              : isOuterRing
                ? 'text-muted-foreground/40'
                : 'text-muted-foreground/60',
        )}
      >
        {mapName}
      </span>

      {isOuterRing && onShrink && (
        <button
          type="button"
          onClick={onShrink}
          className="absolute inset-0 z-20 flex items-center justify-center hover:bg-destructive/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </button>
      )}
    </motion.div>
  )
})

// ---------- Main component ----------

export function BingoGridPreview({
  gridSize,
  winCondition,
  onGridSizeChange,
  onWinConditionChange,
  availableMapCount,
  disabled,
}: BingoGridPreviewProps) {
  const size = parseInt(gridSize.split('x')[0])
  const totalCells = size * size

  const [failedImages, setFailedImages] = useState<Set<number>>(new Set())
  const handleImageError = useCallback((position: number) => {
    setFailedImages((prev) => {
      const next = new Set(prev)
      next.add(position)
      return next
    })
  }, [])

  const currentSizeIndex = GRID_SIZES.indexOf(gridSize)
  const nextSize = GRID_SIZES[currentSizeIndex + 1] as GridSize | undefined
  const prevSize = GRID_SIZES[currentSizeIndex - 1] as GridSize | undefined

  const canExpand =
    nextSize != null &&
    (availableMapCount === null || availableMapCount >= CELLS_FOR_SIZE[nextSize])
  const canShrink = prevSize != null

  // Single number driving all animations — derived into a Set via useMemo
  const [animationPhase, setAnimationPhase] = useState(0)

  // Precompute all pattern data
  const patterns = useMemo(
    () => getWinningPatterns(gridSize, winCondition),
    [gridSize, winCondition],
  )

  // Cross sub-patterns: + examples at various intersections then X
  const crossSubPatterns = useMemo(() => {
    if (winCondition !== 'cross') return null
    const center = Math.floor(size / 2)
    const patterns: { cells: number[]; label: string }[] = []

    // Corner example
    patterns.push({ cells: getPlusCrossCells(size, 0, 0), label: `+ (row 1 × col 1)` })

    // Off-center examples (not edge, not center) — only for grids >= 5
    if (size >= 5) {
      patterns.push({
        cells: getPlusCrossCells(size, 1, center + 1),
        label: `+ (row 2 × col ${center + 2})`,
      })
      patterns.push({
        cells: getPlusCrossCells(size, center + 1, 1),
        label: `+ (row ${center + 2} × col 2)`,
      })
    }

    // Center
    patterns.push({ cells: getPlusCrossCells(size, center, center), label: '+ (center × center)' })

    // Another off-center for 5+ or opposite corner for 3
    if (size >= 5) {
      patterns.push({
        cells: getPlusCrossCells(size, size - 2, size - 2),
        label: `+ (row ${size - 1} × col ${size - 1})`,
      })
    } else {
      patterns.push({
        cells: getPlusCrossCells(size, size - 1, 0),
        label: `+ (row ${size} × col 1)`,
      })
    }

    // X pattern
    patterns.push({ cells: getXCells(size), label: 'X (both diagonals)' })

    return patterns
  }, [winCondition, size])

  const fullHouseOrder = useMemo(() => {
    if (winCondition !== 'full_house') return null
    const order: number[] = []
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        order.push(row * size + col)
      }
    }
    return order
  }, [winCondition, size])

  // Derive highlighted set from animationPhase
  const crossLen = crossSubPatterns?.length ?? 0
  const highlightedCells = useMemo(() => {
    if (winCondition === 'full_house' && fullHouseOrder) {
      return new Set(fullHouseOrder.slice(0, animationPhase))
    }
    if (winCondition === 'cross' && crossSubPatterns && crossLen > 0) {
      return new Set(crossSubPatterns[animationPhase % crossLen].cells)
    }
    if (winCondition === 'line' && patterns.length > 0) {
      return new Set(patterns[animationPhase % patterns.length])
    }
    return new Set<number>()
  }, [animationPhase, winCondition, patterns, crossSubPatterns, crossLen, fullHouseOrder])

  // Animation timer — only updates a single number
  useEffect(() => {
    setAnimationPhase(0)

    if (winCondition === 'full_house') {
      const max = size * size + 2
      const interval = setInterval(() => {
        setAnimationPhase((p) => (p >= max ? 0 : p + 1))
      }, 120)
      return () => clearInterval(interval)
    }

    if (winCondition === 'cross' && crossSubPatterns) {
      const count = crossSubPatterns.length
      const interval = setInterval(() => {
        setAnimationPhase((p) => (p + 1) % count)
      }, 2000)
      return () => clearInterval(interval)
    }

    if (winCondition === 'line' && patterns.length > 0) {
      const interval = setInterval(() => {
        setAnimationPhase((p) => (p + 1) % patterns.length)
      }, 1500)
      return () => clearInterval(interval)
    }

    return undefined
  }, [winCondition, size, crossSubPatterns, patterns])

  const handleExpand = useCallback(() => {
    if (nextSize && canExpand) onGridSizeChange(nextSize)
  }, [nextSize, canExpand, onGridSizeChange])

  const handleShrink = useCallback(() => {
    if (prevSize) onGridSizeChange(prevSize)
  }, [prevSize, onGridSizeChange])

  const displaySize = size + (canExpand ? 2 : 0)
  const offset = canExpand ? 1 : 0

  // Precompute grid layout info once per render
  const gridItems = useMemo(() => {
    const items: Array<
      | { type: 'ghost'; row: number; col: number; key: string }
      | { type: 'cell'; position: number; isOuterRing: boolean; key: string }
      | { type: 'empty'; key: string }
    > = []

    for (let idx = 0; idx < displaySize * displaySize; idx++) {
      const row = Math.floor(idx / displaySize)
      const col = idx % displaySize

      const isGhost =
        canExpand && (row === 0 || row === displaySize - 1 || col === 0 || col === displaySize - 1)

      if (isGhost) {
        items.push({ type: 'ghost', row, col, key: `ghost-${row}-${col}` })
        continue
      }

      const actualRow = row - offset
      const actualCol = col - offset
      const isReal = actualRow >= 0 && actualRow < size && actualCol >= 0 && actualCol < size

      if (!isReal) {
        items.push({ type: 'empty', key: `empty-${idx}` })
        continue
      }

      const position = actualRow * size + actualCol
      const isOuterRing =
        canShrink &&
        size > 3 &&
        (actualRow === 0 || actualRow === size - 1 || actualCol === 0 || actualCol === size - 1)

      items.push({ type: 'cell', position, isOuterRing, key: `cell-${position}` })
    }

    return items
  }, [displaySize, size, offset, canExpand, canShrink])

  // Phase labels for display
  const crossPhase = winCondition === 'cross' && crossLen > 0 ? animationPhase % crossLen : 0
  const linePhase =
    winCondition === 'line' && patterns.length > 0 ? animationPhase % patterns.length : 0

  return (
    <div className="flex flex-col items-center gap-3 max-h-full w-full">
      <LayoutGroup>
        <div
          className={cn("grid gap-1 w-full max-w-md mx-auto", disabled && "pointer-events-none opacity-60")}
          style={{ gridTemplateColumns: `repeat(${displaySize}, minmax(0, 1fr))` }}
        >
          {gridItems.map((item) => {
            if (item.type === 'ghost') {
              return (
                <GhostCell
                  key={item.key}
                  row={item.row}
                  col={item.col}
                  displaySize={displaySize}
                  onExpand={handleExpand}
                />
              )
            }
            if (item.type === 'empty') return null
            return (
              <GridCell
                key={item.key}
                position={item.position}
                mapName={PLACEHOLDER_MAPS[item.position % PLACEHOLDER_MAPS.length]}
                isHighlighted={highlightedCells.has(item.position)}
                isOuterRing={item.isOuterRing}
                onShrink={item.isOuterRing ? handleShrink : null}
                imageFailed={failedImages.has(item.position)}
                onImageError={() => handleImageError(item.position)}
              />
            )
          })}
        </div>
      </LayoutGroup>

      {/* Cell count badge */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
        <Grid3x3 className="h-3.5 w-3.5" />
        <span>
          {totalCells} maps
          {availableMapCount !== null && (
            <span className={availableMapCount < totalCells ? 'text-destructive' : ''}>
              {' '}
              ({availableMapCount} available)
            </span>
          )}
        </span>
      </div>

      {/* Win condition selector */}
      <div className="flex gap-2 w-full flex-col sm:flex-row shrink-0">
        {WIN_CONDITION_OPTIONS.map((opt) => {
          const Icon = opt.icon
          const isSelected = winCondition === opt.value

          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onWinConditionChange(opt.value)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-lg border-2 py-2 px-3 text-sm font-medium transition-all',
                isSelected
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                  : 'border-border bg-card hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground',
                disabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              <Icon className="h-4 w-4" />
              {opt.label}
            </button>
          )
        })}
      </div>

      {/* Pattern label */}
      <AnimatePresence mode="wait">
        {winCondition === 'cross' && crossSubPatterns && (
          <motion.p
            key={`cross-${crossPhase}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-xs text-muted-foreground text-center"
          >
            {crossSubPatterns[crossPhase]?.label}
          </motion.p>
        )}
        {winCondition === 'line' && patterns.length > 0 && (
          <motion.p
            key={`line-${linePhase}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-xs text-muted-foreground text-center"
          >
            Pattern {linePhase + 1} of {patterns.length}
          </motion.p>
        )}
        {winCondition === 'full_house' && (
          <motion.p
            key="fullhouse"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-muted-foreground text-center"
          >
            Complete all {totalCells} cells to win
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
