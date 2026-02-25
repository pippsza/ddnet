'use client'

import useSWR from 'swr'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DDNET_CATEGORIES } from '@/lib/ddnet-constants'
import { CategoryIcon } from '@/components/bingo/CategoryIcon'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface CategorySelectProps {
  name: string
  defaultValue?: string
  value?: string
  disabled?: boolean
  onValueChange?: (value: string, mapCount: number | null) => void
}

export function CategorySelect({
  name,
  defaultValue = 'novice',
  value,
  disabled,
  onValueChange,
}: CategorySelectProps) {
  const { data } = useSWR('/api/globals/custom-categories', fetcher)
  const customCategories = data?.categories || []

  const handleValueChange = (value: string) => {
    if (!onValueChange) return
    const custom = customCategories.find((c: any) => c.slug === value)
    onValueChange(value, custom ? custom.maps?.length ?? 0 : null)
  }

  return (
    <Select name={name} value={value} defaultValue={value ? undefined : defaultValue} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Standard Categories</SelectLabel>
          {DDNET_CATEGORIES.map((cat) => (
            <SelectItem key={cat.value} value={cat.value}>
              <span className="flex items-center gap-2">
                <CategoryIcon category={cat.value} className="h-4 w-4 text-muted-foreground" />
                {cat.label}
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
        {customCategories.length > 0 && (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Custom Categories</SelectLabel>
              {customCategories.map((cat: any) => (
                <SelectItem key={cat.slug} value={cat.slug}>
                  <span className="flex items-center gap-2">
                    <CategoryIcon iconName={cat.icon} className="h-4 w-4 text-muted-foreground" />
                    {cat.name}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          </>
        )}
      </SelectContent>
    </Select>
  )
}
