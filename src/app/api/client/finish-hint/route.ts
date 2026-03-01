import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { checkBingoProgress, checkRaceProgress } from '@/jobs/gameProgressJob'
import type { User } from '@/payload-types'

/**
 * POST /api/client/finish-hint — Client sends a hint that a player finished a map.
 * This triggers an immediate DDNet API verification (bypasses the 5-second poll interval).
 *
 * Header: Authorization: Bearer <clientToken>
 * Body: { mapName: "Kobra", serverAddress: "135.125.236.72:8319", playerName: "EmpaTee" }
 *
 * The hint is NOT trusted — the backend always verifies via DDNet API before scoring.
 */
export async function POST(req: NextRequest) {
  try {
    // Extract bearer token
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 })
    }
    const token = authHeader.slice(7)

    const body = await req.json()
    const { mapName, serverAddress, playerName } = body as {
      mapName?: string
      serverAddress?: string
      playerName?: string
    }

    if (!mapName || !playerName) {
      return NextResponse.json(
        { error: 'Missing required fields: mapName, playerName' },
        { status: 400 },
      )
    }

    const payload = await getPayload({ config })

    // Authenticate by token
    const { docs: users } = await payload.find({
      collection: 'users',
      where: { clientToken: { equals: token } },
      overrideAccess: true,
      limit: 1,
      depth: 0,
    })

    if (users.length === 0) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const user = users[0] as User

    // Verify the player name matches the token owner
    if (
      !user.ingameNick ||
      user.ingameNick.toLowerCase() !== playerName.toLowerCase()
    ) {
      return NextResponse.json(
        { accepted: false, reason: 'Player name mismatch' },
        { status: 400 },
      )
    }

    // Check if user has an active game
    if (!user.activeGame) {
      return NextResponse.json({ accepted: false, reason: 'No active game' })
    }

    const ref = user.activeGame as { relationTo: string; value: string | { id: string } }
    if (!ref.relationTo || !ref.value) {
      return NextResponse.json({ accepted: false, reason: 'No active game' })
    }

    const gameId = typeof ref.value === 'string' ? ref.value : ref.value.id
    const collection = ref.relationTo as 'bingo' | 'races'

    console.log(
      `[FinishHint] ${playerName} finished ${mapName} on ${serverAddress || 'unknown'} — triggering immediate check for ${collection}/${gameId}`,
    )

    // Trigger immediate verification using the existing game progress logic
    // This reuses all DDNet API verification, timestamp checks, and win detection
    try {
      if (collection === 'bingo') {
        await checkBingoProgress(gameId)
      } else {
        await checkRaceProgress(gameId)
      }
    } catch (checkError) {
      console.error(`[FinishHint] Error during immediate check:`, checkError)
      // Don't fail the request — the regular poll job will catch it
    }

    return NextResponse.json({ accepted: true })
  } catch (error: any) {
    console.error('[API] Finish hint error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal error' },
      { status: 500 },
    )
  }
}
