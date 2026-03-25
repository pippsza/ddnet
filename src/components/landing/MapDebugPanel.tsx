'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bug, Move, Lock, ZoomIn, ZoomOut, RotateCcw, Copy, ChevronDown, ChevronUp } from 'lucide-react'
import type { MapStop } from './types'

export interface MapDebugApi {
  /** Get current camera world position */
  getPos: () => { x: number; y: number }
  /** Jump camera to world position (bypasses scroll) */
  jumpTo: (x: number, y: number) => void
  /** Get current zoom multiplier (1 = default VIEW_WIDTH) */
  getZoom: () => number
  /** Set zoom multiplier (< 1 = zoomed out, > 1 = zoomed in) */
  setZoom: (z: number) => void
  /** Enable/disable free-pan mode (disconnects scroll-driven camera) */
  setFreePan: (enabled: boolean) => void
  /** Whether free-pan is currently on */
  isFreePan: boolean
}

interface MapDebugPanelProps {
  api: MapDebugApi | null
  stops: MapStop[]
}

export function MapDebugPanel({ api, stops }: MapDebugPanelProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [freePan, setFreePan] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const rafRef = useRef<number>(0)

  // Poll camera position for display
  useEffect(() => {
    if (!api) return
    const tick = () => {
      const p = api.getPos()
      setPos({ x: Math.round(p.x), y: Math.round(p.y) })
      setZoom(Math.round(api.getZoom() * 100) / 100)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [api])

  // Block browser Ctrl+wheel zoom globally
  useEffect(() => {
    const prevent = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault()
    }
    document.addEventListener('wheel', prevent, { passive: false })
    return () => document.removeEventListener('wheel', prevent)
  }, [])

  const toggleFreePan = useCallback(() => {
    if (!api) return
    const next = !freePan
    setFreePan(next)
    api.setFreePan(next)
  }, [api, freePan])

  const handleJump = useCallback((stop: MapStop) => {
    if (!api) return
    api.jumpTo(stop.camera.x, stop.camera.y)
  }, [api])

  const handleZoom = useCallback((delta: number) => {
    if (!api) return
    api.setZoom(api.getZoom() + delta)
  }, [api])

  const resetZoom = useCallback(() => {
    if (!api) return
    api.setZoom(1)
  }, [api])

  const copyCoords = useCallback(() => {
    navigator.clipboard.writeText(`{ x: ${pos.x}, y: ${pos.y} }`)
  }, [pos])

  if (!api) return null

  return (
    <div className="fixed bottom-4 left-4 z-[100] select-none" style={{ maxHeight: 'calc(100vh - 32px)' }}>
      <div className="bg-black/80 backdrop-blur-xl rounded-xl border border-white/10 text-white text-xs overflow-hidden" style={{ width: 280 }}>
        {/* Header */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-between w-full px-3 py-2 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Bug className="size-3.5 text-yellow-400" />
            <span className="font-semibold text-yellow-400">Map Debug</span>
          </div>
          {collapsed ? <ChevronUp className="size-3.5 text-white/40" /> : <ChevronDown className="size-3.5 text-white/40" />}
        </button>

        {!collapsed && (
          <div className="px-3 pb-3 space-y-3">
            {/* Coordinates */}
            <div className="flex items-center justify-between">
              <div className="font-mono text-white/80">
                x: <span className="text-cyan-400">{pos.x}</span>{' '}
                y: <span className="text-cyan-400">{pos.y}</span>
              </div>
              <button
                onClick={copyCoords}
                className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
                title="Copy coordinates"
              >
                <Copy className="size-3" />
              </button>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-1.5">
              <span className="text-white/50 w-10">Zoom</span>
              <button onClick={() => handleZoom(-0.2)} className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white"><ZoomOut className="size-3.5" /></button>
              <div className="flex-1 text-center font-mono text-white/80">{zoom}x</div>
              <button onClick={() => handleZoom(0.2)} className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white"><ZoomIn className="size-3.5" /></button>
              <button onClick={resetZoom} className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white" title="Reset zoom"><RotateCcw className="size-3" /></button>
            </div>

            {/* Free pan toggle */}
            <button
              onClick={toggleFreePan}
              className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg border transition-all ${
                freePan
                  ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white/80'
              }`}
            >
              {freePan ? <Move className="size-3.5" /> : <Lock className="size-3.5" />}
              <span>{freePan ? 'Free Pan ON — drag to move, scroll to zoom' : 'Free Pan OFF — scroll-driven camera'}</span>
            </button>

            {/* Stops list */}
            <div>
              <div className="text-white/40 mb-1.5">Jump to stop:</div>
              <div className="space-y-0.5 max-h-52 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                {stops.map((stop) => (
                  <button
                    key={stop.id}
                    onClick={() => handleJump(stop)}
                    className="flex items-center justify-between w-full px-2 py-1 rounded hover:bg-white/10 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`size-1.5 rounded-full ${stop.section ? 'bg-cyan-400' : 'bg-white/20'}`} />
                      <span className="text-white/80 group-hover:text-white">{stop.id}</span>
                      {stop.navLabel && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-white/40">{stop.navLabel}</span>
                      )}
                    </div>
                    <span className="font-mono text-white/30 text-[10px]">
                      {stop.camera.x},{stop.camera.y}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hint */}
            <p className="text-white/20 text-[10px] leading-tight">
              Ctrl+Scroll blocked. In free pan: drag to move, wheel to zoom.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
