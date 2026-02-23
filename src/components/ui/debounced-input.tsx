'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'

interface DebouncedInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
  onDebouncedChange: (value: string) => void
  debounce?: number
}

export function DebouncedInput({
  onDebouncedChange,
  debounce = 300,
  defaultValue = '',
  ...props
}: DebouncedInputProps) {
  const [value, setValue] = useState(String(defaultValue))
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const timeout = setTimeout(() => {
      onDebouncedChange(value)
    }, debounce)
    return () => clearTimeout(timeout)
  }, [value, debounce, onDebouncedChange])

  return (
    <Input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      {...props}
    />
  )
}
