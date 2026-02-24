'use client'

import { useState, useEffect } from 'react'
import { TeeAvatar, TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'

const TEST_SKINS = [
  'default',
  'bluekitty',
  'brownbear',
  'cammo',
  'cammostripes',
  'coala',
  'limekitty',
  'pinky',
  'redbopp',
  'redstripe',
  'saddo',
  'toptri',
  'twintri',
  'warpaint',
]

export default function DevTestPage() {
  const [customSkin, setCustomSkin] = useState('default')
  const [bodyColor, setBodyColor] = useState(0)
  const [feetColor, setFeetColor] = useState(0)
  const [useCustomColors, setUseCustomColors] = useState(false)
  const [diagnostics, setDiagnostics] = useState<string[]>([])

  // Seed state
  const [seedStatus, setSeedStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [seedLog, setSeedLog] = useState<string[]>([])
  const [seedError, setSeedError] = useState('')

  const runSeed = async () => {
    setSeedStatus('running')
    setSeedLog([])
    setSeedError('')
    try {
      const res = await fetch('/api/dev/seed', { method: 'POST' })
      const data = await res.json()
      if (data.log) setSeedLog(data.log)
      if (!res.ok) {
        setSeedStatus('error')
        setSeedError(data.error || 'Seed failed')
      } else {
        setSeedStatus('done')
      }
    } catch (err) {
      setSeedStatus('error')
      setSeedError(err instanceof Error ? err.message : 'Network error')
    }
  }

  useEffect(() => {
    const logs: string[] = []

    // 1. Check if TeeAssembler script loaded
    const scriptEl = document.querySelector('script[src="/js/teeassembler.min.js"]')
    logs.push(`Script tag exists: ${!!scriptEl}`)
    logs.push(`window.TeeAssembler: ${typeof window.TeeAssembler}`)
    if (window.TeeAssembler) {
      logs.push(`TeeAssembler.Tee: ${typeof window.TeeAssembler.Tee}`)
    }

    // 2. Check CSS is applied
    const teeEl = document.querySelector('.teeassembler-tee')
    if (teeEl) {
      const styles = window.getComputedStyle(teeEl)
      logs.push(`CSS .teeassembler-tee position: ${styles.position}`)
      logs.push(`CSS .teeassembler-tee width: ${styles.width}`)
      logs.push(`CSS .teeassembler-tee height: ${styles.height}`)
      logs.push(`CSS .teeassembler-tee fontSize: ${styles.fontSize}`)
      logs.push(`Children count: ${teeEl.children.length}`)

      // Check if any body part divs exist
      const bodyParts = teeEl.querySelectorAll('[data-teeassembler-body_part]')
      logs.push(`Body part divs: ${bodyParts.length}`)

      // Check if background-image is set
      bodyParts.forEach((el, i) => {
        const s = window.getComputedStyle(el)
        logs.push(`  part[${i}] class=${el.className} bg=${s.backgroundImage.slice(0, 60)}...`)
      })

      // Check style tag
      const styleTag = teeEl.querySelector('style')
      logs.push(`Style tag inside tee: ${!!styleTag}`)
      if (styleTag) {
        logs.push(`  Style content: ${styleTag.textContent?.slice(0, 100)}...`)
      }
    } else {
      logs.push('No .teeassembler-tee element found in DOM')
    }

    // 3. Test CORS on skin image
    const img = new Image()
    img.crossOrigin = ''
    img.onload = () => {
      logs.push(`CORS image load: OK (${img.width}x${img.height})`)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        ctx.getImageData(0, 0, 1, 1) // This fails if CORS blocked
        logs.push('CORS canvas getImageData: OK')
      } catch (e) {
        logs.push(`CORS canvas getImageData: FAILED - ${e}`)
      }
      setDiagnostics([...logs])
    }
    img.onerror = () => {
      logs.push('CORS image load: FAILED')
      setDiagnostics([...logs])
    }
    img.src = getDDNetSkinUrl('default')

    // Show initial logs after a delay (for TeeAssembler to init)
    const timer = setTimeout(() => setDiagnostics([...logs]), 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      <h1 className="text-2xl font-bold">Dev Test Page</h1>

      {/* Database Seed */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Database Seed</h2>
        <p className="text-sm text-muted-foreground">
          Populate the database with 100 users, 100 bingo games, 100 races, 100 articles,
          100 forum posts, 100 notifications, 100 support tickets, 100 conversations, and friend data.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={runSeed}
            disabled={seedStatus === 'running'}
            className="px-4 py-2 rounded bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {seedStatus === 'running' ? 'Seeding...' : 'Run Seed'}
          </button>
          {seedStatus === 'done' && (
            <span className="text-sm text-green-500 font-medium">Done!</span>
          )}
          {seedStatus === 'error' && (
            <span className="text-sm text-red-500 font-medium">{seedError}</span>
          )}
        </div>
        {seedLog.length > 0 && (
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
            {seedLog.join('\n')}
          </pre>
        )}
      </section>

      {/* Diagnostics */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Diagnostics</h2>
        <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap">
          {diagnostics.length ? diagnostics.join('\n') : 'Running diagnostics...'}
        </pre>
      </section>

      {/* TeeAssembler Test */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">TeeAssembler Test</h2>

        {/* Custom skin input */}
        <div className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-sm mb-1">Skin name</label>
            <input
              type="text"
              value={customSkin}
              onChange={(e) => setCustomSkin(e.target.value)}
              className="border rounded px-3 py-1.5 bg-background"
              placeholder="e.g. default"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Body color (tw code)</label>
            <input
              type="number"
              value={bodyColor}
              onChange={(e) => setBodyColor(Number(e.target.value))}
              className="border rounded px-3 py-1.5 bg-background w-32"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Feet color (tw code)</label>
            <input
              type="number"
              value={feetColor}
              onChange={(e) => setFeetColor(Number(e.target.value))}
              className="border rounded px-3 py-1.5 bg-background w-32"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useCustomColors}
              onChange={(e) => setUseCustomColors(e.target.checked)}
            />
            Custom colors
          </label>
        </div>

        {/* Custom skin result */}
        <div className="border rounded p-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            URL: <code className="text-xs">{getDDNetSkinUrl(customSkin)}</code>
          </p>
          <div className="flex items-center gap-4">
            {(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).map((s) => (
              <div key={s} className="text-center">
                <TeeAvatar
                  skinUrl={getDDNetSkinUrl(customSkin)}
                  bodyColor={bodyColor}
                  feetColor={feetColor}
                  size={s}
                  useCustomColors={useCustomColors}
                />
                <span className="text-xs text-muted-foreground">{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Preset skins gallery */}
        <h3 className="text-lg font-medium">Preset Skins</h3>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-4">
          {TEST_SKINS.map((skin) => (
            <div
              key={skin}
              className="text-center cursor-pointer hover:bg-muted rounded p-2 transition-colors"
              onClick={() => setCustomSkin(skin)}
            >
              <TeeAvatarWithFallback
                skinUrl={getDDNetSkinUrl(skin)}
                size="lg"
              />
              <span className="text-xs text-muted-foreground block mt-1">{skin}</span>
            </div>
          ))}
        </div>

        {/* Direct image test */}
        <h3 className="text-lg font-medium">Direct Image Load Test</h3>
        <p className="text-sm text-muted-foreground">
          If the image below loads but TeeAssembler doesn&apos;t render, the issue is in TeeAssembler:
        </p>
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getDDNetSkinUrl(customSkin)}
            alt={`Skin: ${customSkin}`}
            className="border rounded"
            style={{ imageRendering: 'pixelated', width: 256, height: 128 }}
            onError={(e) => {
              (e.target as HTMLImageElement).alt = `FAILED to load: ${customSkin}`
            }}
          />
          <div className="text-sm">
            <p>Raw skin spritesheet for &quot;{customSkin}&quot;</p>
            <p className="text-muted-foreground">
              If this shows a grid of body parts, the URL is correct.
            </p>
          </div>
        </div>

        {/* lookAtCursor test */}
        <h3 className="text-lg font-medium">lookAtCursor Test</h3>
        <div className="flex gap-4">
          <TeeAvatar
            skinUrl={getDDNetSkinUrl(customSkin)}
            size="2xl"
            lookAtCursor
          />
        </div>
      </section>
    </div>
  )
}
