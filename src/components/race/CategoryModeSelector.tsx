'use client'

import { ListOrdered, Shuffle } from 'lucide-react'
import { cn } from '@/lib/utils'

type CategoryMode = 'selected' | 'free'

interface CategoryModeSelectorProps {
  mode: CategoryMode
  onModeChange: (mode: CategoryMode) => void
  disabled?: boolean
}

export function CategoryModeSelector({ mode, onModeChange, disabled }: CategoryModeSelectorProps) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onModeChange('selected')}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 rounded-lg border-2 py-2.5 px-3 text-sm font-medium transition-all',
          mode === 'selected'
            ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
            : 'border-border bg-card hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <ListOrdered className="h-4 w-4" />
        Selected
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onModeChange('free')}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 rounded-lg border-2 py-2.5 px-3 text-sm font-medium transition-all',
          mode === 'free'
            ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
            : 'border-border bg-card hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <Shuffle className="h-4 w-4" />
        Free
      </button>
    </div>
  )
}
