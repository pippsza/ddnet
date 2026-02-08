import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getVapidPublicKey } from '@/lib/push-notifications'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { endpoint, keys } = await req.json()

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 })
    }

    // Check if already subscribed with this endpoint
    const { docs: existing } = await payload.find({
      collection: 'push-subscriptions',
      where: {
        and: [
          { user: { equals: user.id } },
          { endpoint: { equals: endpoint } },
        ],
      },
      limit: 1,
    })

    if (existing.length > 0) {
      // Update existing subscription
      await payload.update({
        collection: 'push-subscriptions',
        id: existing[0].id,
        data: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
      })
    } else {
      await payload.create({
        collection: 'push-subscriptions',
        data: {
          user: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[API] Error saving push subscription:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save subscription' },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({ vapidPublicKey: getVapidPublicKey() })
}
