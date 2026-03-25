/**
 * Render a Teeworlds .map via DDNet mappreview WebGL renderer.
 * Auto-detects map dimensions, exports canvas via toDataURL().
 *
 * Usage: node scripts/render-map.mjs [mapName] [outputDir] [scale]
 */

import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const MAP_NAME = process.argv[2] || 'Lavender Forest'
const OUTPUT_DIR = process.argv[3] || 'public/map-tiles/lavender-forest'
const RENDER_SCALE = parseFloat(process.argv[4] || '1.0')
const TILE_SIZE = 512
const MAX_CHUNK = 2048  // lower to reduce RAM usage (~500MB vs ~2GB)

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const chunksDir = path.join(OUTPUT_DIR, 'chunks')
  fs.mkdirSync(chunksDir, { recursive: true })

  // Clean old files
  for (const f of fs.readdirSync(OUTPUT_DIR)) {
    if (f.startsWith('tile-') || f === 'full.png' || f === 'manifest.json' || f === 'placeholder.webp') {
      fs.unlinkSync(path.join(OUTPUT_DIR, f))
    }
  }

  const browser = await chromium.launch({
    headless: false,
    args: ['--enable-webgl', '--no-sandbox', '--disable-gpu-sandbox'],
  })

  const page = await browser.newPage({
    viewport: { width: MAX_CHUNK, height: MAX_CHUNK },
    deviceScaleFactor: 1,
  })

  await page.addInitScript(() => {
    const origGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, attrs) {
      if (type === 'webgl' || type === 'experimental-webgl') {
        attrs = { ...(attrs || {}), preserveDrawingBuffer: true, antialias: true }
      }
      return origGetContext.call(this, type, attrs)
    }
  })

  const url = `https://ddnet.org/mappreview/?map=${encodeURIComponent(MAP_NAME)}`
  console.log(`Loading: ${url}`)
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })

  console.log('Waiting for map...')
  await page.waitForFunction(() => {
    return typeof tw !== 'undefined' && tw.map && tw.map.groups && tw.map.groups.length > 0
  }, { timeout: 30000 })
  await page.waitForTimeout(3000) // wait for textures

  // Auto-detect map dimensions from tile layers
  const mapInfo = await page.evaluate(() => {
    let maxW = 0, maxH = 0
    for (const g of tw.map.groups) {
      if (g.paraX !== 100 || g.paraY !== 100) continue // skip parallax layers
      for (const l of g.layers) {
        if (l.type === 2 && l.width && l.height) { // tile layer
          maxW = Math.max(maxW, l.width)
          maxH = Math.max(maxH, l.height)
        }
      }
    }
    return {
      tileW: maxW,
      tileH: maxH,
      worldW: maxW * 32,
      worldH: maxH * 32,
      groups: tw.map.groups.length,
      layers: tw.map.groups.reduce((n, g) => n + g.layers.length, 0),
    }
  })

  const MAP_W = mapInfo.worldW
  const MAP_H = mapInfo.worldH
  console.log(`Map: ${MAP_NAME}`)
  console.log(`  ${mapInfo.groups} groups, ${mapInfo.layers} layers`)
  console.log(`  ${mapInfo.tileW}×${mapInfo.tileH} tiles = ${MAP_W}×${MAP_H} world units`)

  const RENDER_W = Math.ceil(MAP_W * RENDER_SCALE)
  const RENDER_H = Math.ceil(MAP_H * RENDER_SCALE)
  const CHUNK_W = Math.min(MAX_CHUNK, RENDER_W)
  const CHUNK_H = Math.min(MAX_CHUNK, RENDER_H)
  const WORLD_CHUNK_W = CHUNK_W / RENDER_SCALE
  const WORLD_CHUNK_H = CHUNK_H / RENDER_SCALE
  const COLS = Math.ceil(RENDER_W / CHUNK_W)
  const ROWS = Math.ceil(RENDER_H / CHUNK_H)
  const FULL_W = COLS * CHUNK_W
  const FULL_H = ROWS * CHUNK_H

  console.log(`  Render: ${RENDER_W}×${RENDER_H} px (scale ${RENDER_SCALE}x)`)
  console.log(`  Chunks: ${COLS}×${ROWS} = ${COLS * ROWS} at ${CHUNK_W}×${CHUNK_H}\n`)

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const worldCX = (col * WORLD_CHUNK_W) + WORLD_CHUNK_W / 2
      const worldCY = (row * WORLD_CHUNK_H) + WORLD_CHUNK_H / 2

      const dataUrl = await page.evaluate(({ worldCX, worldCY, chunkW, chunkH, worldChunkW }) => {
        const canvas = document.getElementById('cnvs')
        canvas.width = chunkW
        canvas.height = chunkH
        canvas.style.width = chunkW + 'px'
        canvas.style.height = chunkH + 'px'
        tw.gl.viewport(0, 0, chunkW, chunkH)
        tw.gl.viewportWidth = chunkW
        tw.gl.viewportHeight = chunkH
        tw.aspect = chunkW / chunkH
        tw.cameraPos[0] = worldCX
        tw.cameraPos[1] = worldCY
        tw.cameraZoom = (tw.worldView[0] * tw.aspect) / worldChunkW
        tw.render()
        return canvas.toDataURL('image/png')
      }, { worldCX, worldCY, chunkW: CHUNK_W, chunkH: CHUNK_H, worldChunkW: WORLD_CHUNK_W })

      const chunkPath = path.join(chunksDir, `chunk-${row}-${col}.png`)
      fs.writeFileSync(chunkPath, Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'))
      const size = fs.statSync(chunkPath).size
      console.log(`  chunk-${row}-${col}.png → ${(size / 1024).toFixed(0)}KB`)
    }
  }

  await browser.close()
  console.log('\nStitching...')

  const chunkFiles = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      chunkFiles.push(path.join(chunksDir, `chunk-${row}-${col}.png`))
    }
  }

  const fullPngPath = path.join(OUTPUT_DIR, 'full.png')
  const montageArgs = `${chunkFiles.join(' ')} -tile ${COLS}x${ROWS} -geometry ${CHUNK_W}x${CHUNK_H}+0+0 ${fullPngPath}`
  try {
    execSync(`montage ${montageArgs}`, { stdio: 'pipe', timeout: 180000 })
  } catch {
    execSync(`magick montage ${montageArgs}`, { stdio: 'pipe', timeout: 180000 })
  }

  const dims = execSync(`identify -format '%wx%h' ${fullPngPath}`, { encoding: 'utf-8' }).trim()
  console.log(`Full image: ${dims} (${(fs.statSync(fullPngPath).size / 1048576).toFixed(1)}MB)`)

  // Slice into tiles
  console.log(`\nSlicing into ${TILE_SIZE}×${TILE_SIZE} WebP tiles...`)
  const cropCmd = `${fullPngPath} -crop ${TILE_SIZE}x${TILE_SIZE} +repage -quality 92 ${path.join(OUTPUT_DIR, 'tile_%d.webp')}`
  try { execSync(`magick ${cropCmd}`, { stdio: 'pipe', timeout: 300000 }) }
  catch { execSync(`convert ${cropCmd}`, { stdio: 'pipe', timeout: 300000 }) }

  // Rename to row-col
  const tilesX = Math.ceil(FULL_W / TILE_SIZE)
  const tilesY = Math.ceil(FULL_H / TILE_SIZE)
  const tileFiles = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.startsWith('tile_'))
    .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]))

  for (let i = 0; i < tileFiles.length; i++) {
    const r = Math.floor(i / tilesX)
    const c = i % tilesX
    fs.renameSync(path.join(OUTPUT_DIR, tileFiles[i]), path.join(OUTPUT_DIR, `tile-${r}-${c}.webp`))
  }

  // Placeholder
  const placeholderCmd = `${fullPngPath} -resize 480x -gaussian-blur 0x3 -quality 50 ${path.join(OUTPUT_DIR, 'placeholder.webp')}`
  try { execSync(`magick ${placeholderCmd}`, { stdio: 'pipe' }) }
  catch { execSync(`convert ${placeholderCmd}`, { stdio: 'pipe' }) }

  // Manifest
  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify({
    mapName: MAP_NAME,
    fullWidth: FULL_W,
    fullHeight: FULL_H,
    tileSize: TILE_SIZE,
    tilesX,
    tilesY,
    renderScale: RENDER_SCALE,
    originalWidth: MAP_W,
    originalHeight: MAP_H,
  }, null, 2))

  // Stats
  const allTiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith('tile-'))
  const sizes = allTiles.map(f => fs.statSync(path.join(OUTPUT_DIR, f)).size)
  const nonEmpty = sizes.filter(s => s > 2000)
  console.log(`\n✓ Done!`)
  console.log(`  ${allTiles.length} tiles (${tilesX}×${tilesY})`)
  console.log(`  ${nonEmpty.length} with content`)
  console.log(`  Total: ${(sizes.reduce((a, b) => a + b, 0) / 1048576).toFixed(1)}MB`)

  fs.rmSync(chunksDir, { recursive: true, force: true })
}

main().catch(err => { console.error('Error:', err); process.exit(1) })
