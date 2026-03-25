import { NextRequest, NextResponse } from 'next/server'
import { authenticateClientToken } from '@/lib/client-auth'
import { checkBingoProgress, checkRaceProgress, checkKoGBingoProgress, checkKoGRaceProgress } from '@/jobs/gameProgressJob'

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
    const auth = await authenticateClientToken(req)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

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
    const collection = ref.relationTo as 'bingo' | 'races' | 'kog-bingo' | 'kog-races'

    console.log(
      `[FinishHint] ${playerName} finished ${mapName} on ${serverAddress || 'unknown'} — triggering immediate check for ${collection}/${gameId}`,
    )

    // Trigger immediate verification using the existing game progress logic
    try {
      switch (collection) {
        case 'bingo':
          await checkBingoProgress(gameId)
          break
        case 'races':
          await checkRaceProgress(gameId)
          break
        case 'kog-bingo':
          await checkKoGBingoProgress(gameId)
          break
        case 'kog-races':
          await checkKoGRaceProgress(gameId)
          break
      }
    } catch (checkError) {
      console.error(`[FinishHint] Error during immediate check:`, checkError)
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
