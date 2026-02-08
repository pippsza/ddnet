import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { docs } = await payload.find({
      collection: 'notifications',
      where: {
        recipient: { equals: user.id },
      },
      sort: '-createdAt',
      depth: 1,
      limit: 50,
    })

    return NextResponse.json({ docs })
  } catch (error: unknown) {
    console.error('[API] Error fetching notifications:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch notifications' },
      { status: 500 },
    )
  }
}
