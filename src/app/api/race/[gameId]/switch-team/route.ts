import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { gameId } = await params
    const { targetTeamIndex } = await req.json()

    if (targetTeamIndex !== 0 && targetTeamIndex !== 1) {
      return NextResponse.json({ error: 'Invalid team index' }, { status: 400 })
    }

    const game = await payload.findByID({ collection: 'races', id: gameId, depth: 2 })

    if (!game) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    if (game.gameStatus !== 'waiting' && game.gameStatus !== 'ready') {
      return NextResponse.json({ error: 'Can only switch teams in the lobby' }, { status: 400 })
    }

    if (game.mode !== 'team') {
      return NextResponse.json({ error: 'Can only switch teams in team mode' }, { status: 400 })
    }

    let currentTeamIndex = -1
    for (let i = 0; i < game.teams.length; i++) {
      const found = game.teams[i].players?.some((p) => {
        const pid = typeof p.user === 'string' ? p.user : p.user.id
        return pid === user.id
      })
      if (found) {
        currentTeamIndex = i
        break
      }
    }

    if (currentTeamIndex === -1) {
      return NextResponse.json({ error: 'You are not in this race' }, { status: 400 })
    }

    if (currentTeamIndex === targetTeamIndex) {
      return NextResponse.json({ error: 'You are already on this team' }, { status: 400 })
    }

    const targetTeam = game.teams[targetTeamIndex]
    if ((targetTeam.players ?? []).length >= 2) {
      return NextResponse.json({ error: 'Target team is full' }, { status: 400 })
    }

    // Remove from current team
    game.teams[currentTeamIndex].players = (game.teams[currentTeamIndex].players ?? []).filter(
      (p) => {
        const pid = typeof p.user === 'string' ? p.user : p.user.id
        return pid !== user.id
      },
    )

    // Add to target team
    if (!targetTeam.players) targetTeam.players = []
    targetTeam.players.push({ user: user.id, isReady: false })

    // Remove from pendingInvites
    targetTeam.pendingInvites = (targetTeam.pendingInvites ?? []).filter((p) => {
      const pid = typeof p.user === 'string' ? p.user : p.user.id
      return pid !== user.id
    })

    const updateData: Record<string, any> = { teams: game.teams }
    if (game.gameStatus === 'ready') {
      updateData.gameStatus = 'waiting'
      for (const t of game.teams) {
        for (const p of t.players ?? []) {
          ;(p as any).isReady = false
        }
        ;(t as any).teamStatus = 'not_ready'
      }
    }

    await payload.update({ collection: 'races', id: gameId, data: updateData })

    return NextResponse.json({ success: true, teamIndex: targetTeamIndex })
  } catch (error: any) {
    console.error('[API] Error switching team:', error)
    return NextResponse.json({ error: error.message || 'Failed to switch team' }, { status: 500 })
  }
}
