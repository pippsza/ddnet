import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user || (user.roles !== 'admin' && user.roles !== 'moderator')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { title, message, actionUrl, target, userIds } = await req.json()

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
    }

    let recipientIds: string[] = []

    if (target === 'all') {
      // Fetch all user IDs in batches
      let page = 1
      let hasMore = true
      while (hasMore) {
        const { docs, hasNextPage } = await payload.find({
          collection: 'users',
          limit: 100,
          page,
          select: { username: true },
          overrideAccess: true,
        })
        recipientIds.push(...docs.map((u) => u.id))
        hasMore = hasNextPage
        page++
      }
    } else if (target === 'selected' && Array.isArray(userIds) && userIds.length > 0) {
      recipientIds = userIds
    } else {
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
    }

    // Create notifications in batches (afterChange hook handles push)
    let sent = 0
    const batchSize = 50
    for (let i = 0; i < recipientIds.length; i += batchSize) {
      const batch = recipientIds.slice(i, i + batchSize)
      const results = await Promise.allSettled(
        batch.map((recipientId) =>
          payload.create({
            collection: 'notifications',
            data: {
              recipient: recipientId,
              type: 'system',
              title: title.trim(),
              message: message.trim(),
              actionUrl: actionUrl?.trim() || undefined,
            },
            overrideAccess: true,
          }),
        ),
      )
      sent += results.filter((r) => r.status === 'fulfilled').length
    }

    return NextResponse.json({ sent, total: recipientIds.length })
  } catch (error: unknown) {
    console.error('[API] Error sending notifications:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send notifications' },
      { status: 500 },
    )
  }
}
