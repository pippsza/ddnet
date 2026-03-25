'use client'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { KOG_CATEGORIES } from '@/lib/kog-constants'
import { CategoryIcon } from '@/components/bingo/CategoryIcon'

interface KoGCategorySelectProps {
  name: string
  defaultValue?: string
  value?: string
  disabled?: boolean
  onValueChange?: (value: string, mapCount: number | null) => void
}

export function KoGCategorySelect({
  name,
  defaultValue = 'kog_main',
  value,
  disabled,
  onValueChange,
}: KoGCategorySelectProps) {
  return (
    <Select name={name} value={value} defaultValue={value ? undefined : defaultValue} onValueChange={(v) => onValueChange?.(v, null)} disabled={disabled}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>KoG Categories</SelectLabel>
          {KOG_CATEGORIES.map((cat) => (
            <SelectItem key={cat.value} value={cat.value}>
              <span className="flex items-center gap-2">
                <CategoryIcon iconName={cat.icon} className="h-4 w-4 text-muted-foreground" />
                {cat.label}
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
