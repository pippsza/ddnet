'use client'

import { useRef, useEffect, useCallback, useState, useMemo, type ReactNode } from 'react'
import { useScroll, useTransform, useSpring } from 'framer-motion'
import type { CameraPoint, MapStop } from './types'
import { MapDebugPanel, type MapDebugApi } from './MapDebugPanel'

interface MapCanvasProps {
  mapName: string
  path: CameraPoint[]
  scrollMultiplier?: number
  children?: ReactNode
  onLoaded?: () => void
  /** Blur placeholder image shown while WebGL loads */
  placeholderUrl?: string
  /** Pass stops to enable the debug panel (dev mode only) */
  debugStops?: MapStop[]
}

const SCRIPTS = [
  '/mappreview/jquery-1.10.2.min.js',
  '/mappreview/jquery.mousewheel.js',
  '/mappreview/gl-matrix.js',
  '/mappreview/crc32.min.js',
  '/mappreview/zlib.min.js',
  '/mappreview/dataviewext.js',
  '/mappreview/twdatafile.js',
  '/mappreview/twwebgl.js',
]

let _scriptsLoaded = false
let _scriptsPromise: Promise<void> | null = null

function loadScriptsSequentially(urls: string[]): Promise<void> {
  if (_scriptsLoaded) return Promise.resolve()
  if (_scriptsPromise) return _scriptsPromise

  _scriptsPromise = urls.reduce((chain, url) => {
    return chain.then(() => new Promise<void>((resolve, reject) => {
      // Skip if already loaded
      if (document.querySelector(`script[src="${url}"]`)) {
        resolve()
        return
      }
      const script = document.createElement('script')
      script.src = url
      script.onload = () => resolve()
      script.onerror = () => reject(new Error(`Failed to load ${url}`))
      document.head.appendChild(script)
    }))
  }, Promise.resolve()).then(() => {
    _scriptsLoaded = true
  })

  return _scriptsPromise
}

// How many world units the viewport shows horizontally
const VIEW_WIDTH = 1920

// Spring config — same as bestclient.fun
const SPRING_CONFIG = { stiffness: 120, damping: 30, mass: 0.5, bounce: 0, restDelta: 0.0001 }

export function MapCanvas({
  mapName,
  path,
  scrollMultiplier = 6,
  children,
  onLoaded,
  placeholderUrl,
  debugStops,
}: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const uiLayerRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const twRef = useRef<any>(null)

  const [mapLoaded, setMapLoaded] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('Loading renderer...')

  // Debug: free-pan state
  const freePanRef = useRef(false)
  const freePanPosRef = useRef({ x: 0, y: 0 })
  const zoomOverrideRef = useRef<number | null>(null)
  const [debugApi, setDebugApi] = useState<MapDebugApi | null>(null)
  const showDebug = process.env.NODE_ENV === 'development' && !!debugStops

  // Extract scroll keyframes from camera path
  const { inputKeys, xValues, yValues } = useMemo(() => {
    const inputKeys = path.map((p) => p.progress)
    const xValues = path.map((p) => p.x)
    const yValues = path.map((p) => p.y)
    return { inputKeys, xValues, yValues }
  }, [path])

  // Step 1: scrollYProgress (0→1 based on scroll position)
  const { scrollYProgress } = useScroll()

  // Step 2: useTransform maps scroll → camera coords (linear interpolation between keyframes)
  const rawCameraX = useTransform(scrollYProgress, inputKeys, xValues)
  const rawCameraY = useTransform(scrollYProgress, inputKeys, yValues)

  // Step 3: useSpring adds physical smoothing (inertia, no jitter at breakpoints)
  const cameraX = useSpring(rawCameraX, SPRING_CONFIG)
  const cameraY = useSpring(rawCameraY, SPRING_CONFIG)

  // Mouse parallax
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 768) return
    const handle = (e: MouseEvent) => {
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      mouseRef.current = { x: (e.clientX - cx) / 40, y: (e.clientY - cy) / 40 }
    }
    window.addEventListener('mousemove', handle, { passive: true })
    return () => window.removeEventListener('mousemove', handle)
  }, [])

  // Initialize WebGL renderer
  const initRenderer = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const tw = (window as any).tw
    if (!tw) return

    // Prevent re-init
    if (twRef.current) return
    twRef.current = tw

    tw.screenResize = function () {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      tw.aspect = canvas.width / canvas.height
    }

    tw.mousePressed = false
    tw.moveCamera = false
    tw.mouseDownInc = [0, 0]

    // Override mainLoop: lock zoom every frame and prevent default camera movement
    tw.mainLoop = function () {
      // Reset any mouse-driven camera movement
      tw.mouseDownInc[0] = 0
      tw.mouseDownInc[1] = 0
      tw.zoomed = false

      // Zoom: use override if set (debug), otherwise lock to VIEW_WIDTH
      const baseZoom = (tw.worldView[0] * tw.aspect) / VIEW_WIDTH
      tw.cameraZoom = zoomOverrideRef.current !== null
        ? baseZoom * zoomOverrideRef.current
        : baseZoom

      // In free-pan mode, apply position directly
      if (freePanRef.current) {
        tw.cameraPos[0] = freePanPosRef.current.x
        tw.cameraPos[1] = freePanPosRef.current.y
      }

      // Render (with guard)
      if (tw.map) {
        tw.render()
      }

      requestAnimationFrame(tw.mainLoop)
    }

    setLoadingMsg('Loading map...')

    tw.init({ mapUrl: `/mappreview/${encodeURIComponent(mapName)}` })

    const check = setInterval(() => {
      if (tw.map && tw.map.groups && tw.map.groups.length > 0) {
        clearInterval(check)

        // Jump camera to initial position immediately (no spring animation on load)
        const startX = path[0]?.x || 0
        const startY = path[0]?.y || 0
        cameraX.jump(startX)
        cameraY.jump(startY)
        tw.cameraPos[0] = startX
        tw.cameraPos[1] = startY

        setMapLoaded(true)
        setLoadingMsg('')
        onLoaded?.()
      }
    }, 200)

    return () => clearInterval(check)
  }, [mapName, onLoaded, cameraX, cameraY, path])

  // Load scripts, then init
  useEffect(() => {
    loadScriptsSequentially(SCRIPTS)
      .then(() => initRenderer())
      .catch((err) => {
        console.error('[MapCanvas] Script loading failed:', err)
        setLoadingMsg('Failed to load renderer')
      })
  }, [initRenderer])

  // Sync cameraX/cameraY spring values → WebGL camera + UI overlay
  useEffect(() => {
    if (!mapLoaded) return
    const tw = twRef.current
    if (!tw) return

    // Update WebGL camera + UI overlay on spring changes
    const updateCamera = () => {
      // In free-pan mode, mainLoop sets tw.cameraPos directly
      if (freePanRef.current) return

      const x = cameraX.get()
      const y = cameraY.get()
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      tw.cameraPos[0] = x + mx
      tw.cameraPos[1] = y + my

      if (uiLayerRef.current) {
        const vw = window.innerWidth
        const vh = window.innerHeight
        const scale = vw / VIEW_WIDTH
        const tx = -x * scale + vw / 2 - mx * scale
        const ty = -y * scale + vh / 2 - my * scale
        uiLayerRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`
      }
    }

    const unsubX = cameraX.on('change', updateCamera)
    const unsubY = cameraY.on('change', updateCamera)

    return () => { unsubX(); unsubY() }
  }, [mapLoaded, cameraX, cameraY])

  // Debug: update UI layer in free-pan mode
  useEffect(() => {
    if (!showDebug || !mapLoaded) return
    let raf = 0
    const tick = () => {
      if (freePanRef.current && uiLayerRef.current) {
        const x = freePanPosRef.current.x
        const y = freePanPosRef.current.y
        const vw = window.innerWidth
        const vh = window.innerHeight
        const zoomMul = zoomOverrideRef.current ?? 1
        const scale = (vw / VIEW_WIDTH) * zoomMul
        const tx = -x * scale + vw / 2
        const ty = -y * scale + vh / 2
        uiLayerRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [showDebug, mapLoaded])

  // Debug: free-pan mouse drag + wheel zoom
  useEffect(() => {
    if (!showDebug || !mapLoaded) return
    const canvas = canvasRef.current
    if (!canvas) return

    let dragging = false
    let lastX = 0
    let lastY = 0

    const onMouseDown = (e: MouseEvent) => {
      if (!freePanRef.current) return
      if (e.button !== 0) return
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      e.preventDefault()
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return
      const zoomMul = zoomOverrideRef.current ?? 1
      const scale = (window.innerWidth / VIEW_WIDTH) * zoomMul
      const dx = (e.clientX - lastX) / scale
      const dy = (e.clientY - lastY) / scale
      freePanPosRef.current.x -= dx
      freePanPosRef.current.y -= dy
      lastX = e.clientX
      lastY = e.clientY
    }

    const onMouseUp = () => { dragging = false }

    const onWheel = (e: WheelEvent) => {
      if (!freePanRef.current) return
      e.preventDefault()
      const current = zoomOverrideRef.current ?? 1
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      zoomOverrideRef.current = Math.max(0.05, Math.min(5, current + delta * current))
    }

    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [showDebug, mapLoaded])

  // Debug: expose API once map is loaded
  useEffect(() => {
    if (!showDebug || !mapLoaded) return

    const api: MapDebugApi = {
      getPos: () => {
        if (freePanRef.current) return { ...freePanPosRef.current }
        return { x: cameraX.get(), y: cameraY.get() }
      },
      jumpTo: (x, y) => {
        freePanPosRef.current = { x, y }
        if (!freePanRef.current) {
          // Also update springs so scroll camera matches
          cameraX.jump(x)
          cameraY.jump(y)
        }
      },
      getZoom: () => zoomOverrideRef.current ?? 1,
      setZoom: (z) => {
        zoomOverrideRef.current = Math.max(0.05, Math.min(5, z))
      },
      setFreePan: (enabled) => {
        freePanRef.current = enabled
        if (enabled) {
          // Capture current camera position as starting point
          freePanPosRef.current = { x: cameraX.get(), y: cameraY.get() }
          if (zoomOverrideRef.current === null) zoomOverrideRef.current = 1
        } else {
          zoomOverrideRef.current = null
        }
      },
      get isFreePan() { return freePanRef.current },
    }

    setDebugApi(api)
    return () => setDebugApi(null)
  }, [showDebug, mapLoaded, cameraX, cameraY])

  // Resize
  useEffect(() => {
    const handle = () => {
      const tw = twRef.current
      if (tw && canvasRef.current) {
        canvasRef.current.width = window.innerWidth
        canvasRef.current.height = window.innerHeight
        tw.gl.viewportWidth = window.innerWidth
        tw.gl.viewportHeight = window.innerHeight
        tw.aspect = window.innerWidth / window.innerHeight
      }
    }
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  return (
    <>
      <div style={{ height: `${scrollMultiplier * 100}vh` }} />

      <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        {/* Placeholder background — visible immediately, fades out when WebGL ready */}
        <div
          className="absolute inset-0 z-1 transition-opacity duration-1000"
          style={{ opacity: mapLoaded ? 0 : 1, pointerEvents: 'none' }}
        >
          <div className="absolute inset-0 bg-linear-to-b from-[#2a1f4e] via-[#1a1040] to-[#0a0f14]" />
          {placeholderUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center blur-lg scale-110 opacity-40"
              style={{ backgroundImage: `url(${placeholderUrl})` }}
            />
          )}
        </div>

        <canvas
          ref={canvasRef}
          id="cnvs"
          className="block w-screen h-screen transition-opacity duration-1000"
          style={{ touchAction: 'none', cursor: freePanRef.current ? 'grab' : undefined, opacity: mapLoaded ? 1 : 0 }}
        />

        <div
          ref={uiLayerRef}
          className="absolute top-0 left-0 will-change-transform pointer-events-none"
          style={{
            width: 60000,
            height: 20000,
            transformOrigin: '0 0',
            zIndex: 10,
            // Initial transform so sections are visible before map loads / first scroll
            transform: (() => {
              const sx = path[0]?.x || 0
              const sy = path[0]?.y || 0
              const vw = typeof window !== 'undefined' ? window.innerWidth : 1920
              const vh = typeof window !== 'undefined' ? window.innerHeight : 1080
              const scale = vw / VIEW_WIDTH
              return `translate3d(${-sx * scale + vw / 2}px, ${-sy * scale + vh / 2}px, 0) scale(${scale})`
            })(),
          }}
        >
          {children}
        </div>
      </div>

      {showDebug && <MapDebugPanel api={debugApi} stops={debugStops!} />}
    </>
  )
}
