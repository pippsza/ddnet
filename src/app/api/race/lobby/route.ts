import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET() {
  try {
    const payload = await getPayload({ config })

    const { docs: races } = await payload.find({
      collection: 'races',
      where: {
        and: [
          { isPublic: { equals: true } },
          { status: { in: ['waiting', 'ready'] } },
        ],
      },
      sort: '-createdAt',
      depth: 1,
      limit: 20,
    })

    return NextResponse.json({ races })
  } catch (error: unknown) {
    console.error('[API] Error fetching race lobby:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch lobby' },
      { status: 500 },
    )
  }
}
