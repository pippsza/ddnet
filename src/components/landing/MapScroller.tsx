/**
 * MapScroller — tile-based map rendering with viewport culling.
 *
 * DEPRECATED: Use MapCanvas (WebGL) instead for better quality and animations.
 * Kept as fallback for devices without WebGL support.
 *
 * To re-enable: uncomment this file and use it in DesktopLanding.tsx
 * with pre-rendered tiles from scripts/render-map.mjs.
 */

// 'use client'
//
// import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react'
// import { useScroll, useSpring } from 'framer-motion'
// import type { CameraPoint } from './types'
//
// interface MapScrollerProps {
//   mapWidth: number
//   mapHeight: number
//   tileSize: number
//   tilesX: number
//   tilesY: number
//   tileUrl: (row: number, col: number) => string
//   placeholderUrl?: string
//   path: CameraPoint[]
//   scrollMultiplier?: number
//   children?: ReactNode
// }
//
// function interpolatePath(path: CameraPoint[], progress: number): { x: number; y: number } {
//   if (path.length === 0) return { x: 0, y: 0 }
//   if (path.length === 1) return { x: path[0].x, y: path[0].y }
//   const p = Math.max(0, Math.min(1, progress))
//   let i = 0
//   while (i < path.length - 1 && path[i + 1].progress <= p) i++
//   if (i >= path.length - 1) return { x: path[path.length - 1].x, y: path[path.length - 1].y }
//   const a = path[i]
//   const b = path[i + 1]
//   const t = (p - a.progress) / (b.progress - a.progress)
//   const eased = t * t * (3 - 2 * t)
//   return { x: a.x + (b.x - a.x) * eased, y: a.y + (b.y - a.y) * eased }
// }
//
// export function MapScroller({
//   mapWidth, mapHeight, tileSize, tilesX, tilesY,
//   tileUrl, placeholderUrl, path, scrollMultiplier = 5, children,
// }: MapScrollerProps) {
//   const mapLayerRef = useRef<HTMLDivElement>(null)
//   const uiLayerRef = useRef<HTMLDivElement>(null)
//   const cameraRef = useRef({ x: path[0]?.x || 0, y: path[0]?.y || 0 })
//   const mouseRef = useRef({ x: 0, y: 0 })
//   const viewportRef = useRef({ w: 1920, h: 1080 })
//   const [visibleTileKeys, setVisibleTileKeys] = useState<string[]>([])
//   const { scrollYProgress } = useScroll()
//   const smoothProgress = useSpring(scrollYProgress, { stiffness: 80, damping: 25 })
//
//   useEffect(() => {
//     const update = () => { viewportRef.current = { w: window.innerWidth, h: window.innerHeight } }
//     update()
//     window.addEventListener('resize', update)
//     return () => window.removeEventListener('resize', update)
//   }, [])
//
//   useEffect(() => {
//     if (window.innerWidth < 768) return
//     const handle = (e: MouseEvent) => {
//       const cx = window.innerWidth / 2, cy = window.innerHeight / 2
//       mouseRef.current = { x: (e.clientX - cx) / 30, y: (e.clientY - cy) / 30 }
//     }
//     window.addEventListener('mousemove', handle, { passive: true })
//     return () => window.removeEventListener('mousemove', handle)
//   }, [])
//
//   const computeVisibleTiles = useCallback(() => {
//     const { x: cx, y: cy } = cameraRef.current
//     const vp = viewportRef.current
//     const scale = vp.w / 1920
//     const viewW = vp.w / scale + 400, viewH = vp.h / scale + 400
//     const left = cx - viewW / 2, top = cy - viewH / 2
//     const right = left + viewW, bottom = top + viewH
//     const keys: string[] = []
//     for (let row = 0; row < tilesY; row++) {
//       for (let col = 0; col < tilesX; col++) {
//         const tx = col * tileSize, ty = row * tileSize
//         if (tx + tileSize > left && tx < right && ty + tileSize > top && ty < bottom) {
//           keys.push(`${row}-${col}`)
//         }
//       }
//     }
//     return keys
//   }, [tileSize, tilesX, tilesY])
//
//   useEffect(() => {
//     let prevTileKey = ''
//     const unsubscribe = smoothProgress.on('change', (v) => {
//       const pos = interpolatePath(path, v)
//       cameraRef.current = pos
//       const vp = viewportRef.current
//       const scale = vp.w / 1920
//       const mx = mouseRef.current.x, my = mouseRef.current.y
//       const tx = -pos.x * scale + vp.w / 2 - mx
//       const ty = -pos.y * scale + vp.h / 2 - my
//       const transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`
//       if (mapLayerRef.current) mapLayerRef.current.style.transform = transform
//       if (uiLayerRef.current) uiLayerRef.current.style.transform = transform
//       const newKeys = computeVisibleTiles()
//       const newKeyStr = newKeys.join(',')
//       if (newKeyStr !== prevTileKey) { prevTileKey = newKeyStr; setVisibleTileKeys(newKeys) }
//     })
//     return unsubscribe
//   }, [smoothProgress, path, computeVisibleTiles])
//
//   useEffect(() => { setVisibleTileKeys(computeVisibleTiles()) }, [computeVisibleTiles])
//
//   return (
//     <>
//       <div style={{ height: `${scrollMultiplier * 100}vh` }} />
//       <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
//         <div className="absolute inset-0 bg-[#0a0f14]" />
//         {placeholderUrl && (
//           <div className="absolute inset-0 bg-cover bg-center blur-lg scale-110 opacity-30"
//             style={{ backgroundImage: `url(${placeholderUrl})` }} />
//         )}
//         <div ref={mapLayerRef} className="absolute will-change-transform"
//           style={{ width: mapWidth, height: mapHeight, transformOrigin: '0 0' }}>
//           {visibleTileKeys.map((key) => {
//             const [row, col] = key.split('-').map(Number)
//             return (
//               <img key={key} src={tileUrl(row, col)} alt="" loading="lazy" decoding="async"
//                 className="absolute block"
//                 style={{ left: col * tileSize, top: row * tileSize, width: tileSize, height: tileSize }} />
//             )
//           })}
//         </div>
//         <div ref={uiLayerRef} className="absolute will-change-transform pointer-events-none"
//           style={{ width: mapWidth, height: mapHeight, transformOrigin: '0 0', zIndex: 10 }}>
//           {children}
//         </div>
//       </div>
//     </>
//   )
// }
