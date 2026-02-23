import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getAllDDNetMaps } from '@/services/bingo/gridGenerator'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user || (user.roles !== 'admin' && user.roles !== 'moderator')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const mapNames: string[] = body.maps

    if (!Array.isArray(mapNames) || mapNames.length === 0) {
      return NextResponse.json({ error: 'maps must be a non-empty array of strings' }, { status: 400 })
    }

    const allMaps = await getAllDDNetMaps()

    // Build case-insensitive lookup
    const mapLookup = new Map<string, { name: string; difficulty: number; points: number; type: string }>()
    for (const m of allMaps) {
      mapLookup.set(m.name.toLowerCase(), {
        name: m.name,
        difficulty: m.difficulty || 0,
        points: m.points || 0,
        type: m.type || '',
      })
    }

    const results = mapNames.map((name) => {
      const trimmed = name.trim()
      const found = mapLookup.get(trimmed.toLowerCase())
      if (found) {
        return {
          name: found.name,
          valid: true,
          difficulty: found.difficulty,
          points: found.points,
          type: found.type,
        }
      }
      return { name: trimmed, valid: false }
    })

    return NextResponse.json({ results })
  } catch (error) {
    console.error('[API] Error validating maps:', error)
    return NextResponse.json({ error: 'Failed to validate maps' }, { status: 500 })
  }
}
