'use client'

import { useEffect } from 'react'

const LS_MODE_KEY = 'landing-render-mode'

/**
 * Sets data-map-bg attribute on <html> when map background is active.
 * CSS variables in globals.css handle the rest — forcing dark-green forest
 * theme + glassmorphism cards via [data-map-bg='true'] selector.
 * No theme switching needed — just attribute toggle.
 */
export function useRenderModeTheme() {
  useEffect(() => {
    const apply = () => {
      const mode = localStorage.getItem(LS_MODE_KEY) || 'quality'
      const mapActive = mode !== 'performance'

      if (mapActive) {
        document.documentElement.setAttribute('data-map-bg', 'true')
      } else {
        document.documentElement.removeAttribute('data-map-bg')
      }
    }

    apply()

    window.addEventListener('render-mode-change', apply)
    window.addEventListener('storage', apply)
    return () => {
      window.removeEventListener('render-mode-change', apply)
      window.removeEventListener('storage', apply)
    }
  }, [])
}
