'use client'
import { Moon, Sun } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import { getThemeById, getToggleTarget } from '@/lib/themes'

type AnimationVariant = 'circle' | 'circle-blur' | 'gif' | 'polygon'
type StartPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface ThemeToggleButtonProps {
  showLabel?: boolean
  variant?: AnimationVariant
  start?: StartPosition
  url?: string // For gif variant
  className?: string
}

export const ThemeToggleButton = ({
  showLabel = false,
  variant = 'circle',
  start = 'center',
  url,
  className,
}: ThemeToggleButtonProps) => {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const { startTransition } = useThemeTransition()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentThemeDef = getThemeById(theme || 'default-dark')
  const isDark = currentThemeDef ? currentThemeDef.mode === 'dark' : resolvedTheme === 'dark'

  const handleClick = useCallback(() => {
    const nextId = getToggleTarget(theme || 'default-dark')
    const next = getThemeById(nextId) || { id: nextId, name: nextId, mode: 'dark' as const }

    // Inject animation styles for this specific transition
    const styleId = `theme-transition-${Date.now()}`
    const style = document.createElement('style')
    style.id = styleId
    // Generate animation CSS based on variant
    let css = ''
    const positions = {
      center: 'center',
      'top-left': 'top left',
      'top-right': 'top right',
      'bottom-left': 'bottom left',
      'bottom-right': 'bottom right',
    }

    if (variant === 'circle') {
      const cx = start === 'center' ? '50' : start.includes('left') ? '0' : '100'
      const cy = start === 'center' ? '50' : start.includes('top') ? '0' : '100'
      css = `
        @supports (view-transition-name: root) {
          ::view-transition-old(root) { 
            animation: none;
          }
          ::view-transition-new(root) {
            animation: circle-expand 0.4s ease-out;
            transform-origin: ${positions[start]};
          }
          @keyframes circle-expand {
            from {
              clip-path: circle(0% at ${cx}% ${cy}%);
            }
            to {
              clip-path: circle(150% at ${cx}% ${cy}%);
            }
          }
        }
      `
    } else if (variant === 'circle-blur') {
      const cx = start === 'center' ? '50' : start.includes('left') ? '0' : '100'
      const cy = start === 'center' ? '50' : start.includes('top') ? '0' : '100'
      css = `
        @supports (view-transition-name: root) {
          ::view-transition-old(root) { 
            animation: none;
          }
          ::view-transition-new(root) {
            animation: circle-blur-expand 0.5s ease-out;
            transform-origin: ${positions[start]};
            filter: blur(0);
          }
          @keyframes circle-blur-expand {
            from {
              clip-path: circle(0% at ${cx}% ${cy}%);
              filter: blur(4px);
            }
            to {
              clip-path: circle(150% at ${cx}% ${cy}%);
              filter: blur(0);
            }
          }
        }
      `
    } else if (variant === 'gif' && url) {
      css = `
        @supports (view-transition-name: root) {
          ::view-transition-old(root) {
            animation: fade-out 0.4s ease-out;
          }
          ::view-transition-new(root) {
            animation: gif-reveal 2.5s cubic-bezier(0.4, 0, 0.2, 1);
            mask-image: url('${url}');
            mask-size: 0%;
            mask-repeat: no-repeat;
            mask-position: center;
          }
          @keyframes fade-out {
            to {
              opacity: 0;
            }
          }
          @keyframes gif-reveal {
            0% {
              mask-size: 0%;
            }
            20% {
              mask-size: 35%;
            }
            60% {
              mask-size: 35%;
            }
            100% {
              mask-size: 300%;
            }
          }
        }
      `
    } else if (variant === 'polygon') {
      css = `
        @supports (view-transition-name: root) {
          ::view-transition-old(root) {
            animation: none;
          }
          ::view-transition-new(root) {
            animation: ${resolvedTheme === 'dark' ? 'wipe-in-dark' : 'wipe-in-light'} 0.4s ease-out;
          }
          @keyframes wipe-in-dark {
            from {
              clip-path: polygon(0 0, 0 0, 0 100%, 0 100%);
            }
            to {
              clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
            }
          }
          @keyframes wipe-in-light {
            from {
              clip-path: polygon(100% 0, 100% 0, 100% 100%, 100% 100%);
            }
            to {
              clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
            }
          }
        }
      `
    }

    if (css) {
      style.textContent = css
      document.head.appendChild(style)

      // Clean up animation styles after transition
      setTimeout(() => {
        const styleEl = document.getElementById(styleId)
        if (styleEl) {
          styleEl.remove()
        }
      }, 3000)
    }

    // Execute theme change with transition
    startTransition(() => {
      setTheme(next.id)
    })
  }, [variant, start, url, resolvedTheme, theme, setTheme, startTransition])

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <Button
        variant="outline"
        size={showLabel ? 'default' : 'icon'}
        className={cn('relative overflow-hidden transition-all', showLabel && 'gap-2', className)}
        disabled
      >
        <Sun className="h-[1.2rem] w-[1.2rem]" />
        {showLabel && <span className="text-sm">Loading...</span>}
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size={showLabel ? 'default' : 'icon'}
      onClick={handleClick}
      className={cn('relative overflow-hidden transition-all', showLabel && 'gap-2', className)}
      aria-label={`Switch theme (current: ${currentThemeDef?.name || 'Default'})`}
    >
      {isDark ? (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      )}
      {showLabel && <span className="text-sm">{currentThemeDef?.name || 'Theme'}</span>}
    </Button>
  )
}
// Export a helper hook for using with View Transitions API
export const useThemeTransition = () => {
  const startTransition = useCallback((updateFn: () => void) => {
    if ('startViewTransition' in document) {
      ;(document as any).startViewTransition(updateFn)
    } else {
      updateFn()
    }
  }, [])
  return { startTransition }
}
