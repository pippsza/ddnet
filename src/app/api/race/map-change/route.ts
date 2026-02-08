import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: NextRequest) {
  try {
    // Verify bot secret
    const botSecret = req.headers.get('X-Bot-Secret')
    if (botSecret !== process.env.BACKEND_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { raceId, mapName } = await req.json()

    if (!raceId || !mapName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    await payload.update({
      collection: 'races',
      id: raceId,
      data: { currentMap: mapName },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[API] Error updating map:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update map' },
      { status: 500 },
    )
  }
}
