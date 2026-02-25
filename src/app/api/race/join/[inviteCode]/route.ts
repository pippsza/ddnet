import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  try {
    const { inviteCode } = await params
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.isSystemVerified) {
      return NextResponse.json({ error: 'You must verify your nickname first' }, { status: 400 })
    }

    const { docs: races } = await payload.find({
      collection: 'races',
      where: { inviteCode: { equals: inviteCode } },
      depth: 1,
      limit: 1,
    })

    if (races.length === 0) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
    }

    const race = races[0]

    if (race.gameStatus !== 'waiting' && race.gameStatus !== 'ready') {
      return NextResponse.json({ error: 'Race is not accepting players' }, { status: 400 })
    }

    // Check if already in game
    for (const team of race.teams) {
      if (team.players?.some((p) => {
        const pid = typeof p.user === 'string' ? p.user : p.user.id
        return pid === user.id
      })) {
        return NextResponse.json({
          success: true,
          raceId: race.id,
          message: 'Already in this race',
        })
      }
    }

    // Find team with space (prefer empty teams first for team mode)
    let targetTeamIndex = -1
    if (race.mode === 'solo') {
      if ((race.teams[0].players ?? []).length < 2) targetTeamIndex = 0
    } else {
      // Prefer team with fewer players
      targetTeamIndex =
        (race.teams[0].players ?? []).length <= (race.teams[1].players ?? []).length ? 0 : 1
      if ((race.teams[targetTeamIndex].players ?? []).length >= 2) {
        targetTeamIndex = targetTeamIndex === 0 ? 1 : 0
      }
    }

    if (targetTeamIndex < 0 || (race.teams[targetTeamIndex].players ?? []).length >= 2) {
      return NextResponse.json({ error: 'Race is full' }, { status: 400 })
    }

    const teams = JSON.parse(JSON.stringify(race.teams))
    if (!teams[targetTeamIndex].players) teams[targetTeamIndex].players = []
    teams[targetTeamIndex].players.push({ user: user.id, isReady: false })

    // Remove from pendingInvites
    teams[targetTeamIndex].pendingInvites = (teams[targetTeamIndex].pendingInvites ?? []).filter(
      (p: any) => {
        const pid = typeof p.user === 'string' ? p.user : p.user.id
        return pid !== user.id
      },
    )

    // Reset to waiting if was ready
    const updateData: Record<string, any> = { teams }
    if (race.gameStatus === 'ready') {
      updateData.gameStatus = 'waiting'
      for (const t of teams) {
        for (const p of t.players ?? []) {
          p.isReady = false
        }
        t.teamStatus = 'not_ready'
      }
    }

    await payload.update({ collection: 'races', id: race.id, data: updateData })

    await payload.update({
      collection: 'users',
      id: user.id,
      data: { activeGame: { relationTo: 'races', value: race.id } },
    })

    return NextResponse.json({ success: true, raceId: race.id, message: 'Joined the race' })
  } catch (error: any) {
    console.error('[API] Error joining via invite:', error)
    return NextResponse.json({ error: error.message || 'Failed to join race' }, { status: 500 })
  }
}
