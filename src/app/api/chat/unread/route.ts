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

    // Find all conversations the user is part of
    const { docs: conversations } = await payload.find({
      collection: 'conversations',
      where: {
        'participants.user': { equals: user.id },
      },
      depth: 0,
      limit: 200,
    })

    if (conversations.length === 0) {
      return NextResponse.json({ unreadCount: 0 })
    }

    const conversationIds = conversations.map((c) => c.id)

    const { totalDocs: unreadCount } = await payload.find({
      collection: 'messages',
      where: {
        conversation: { in: conversationIds },
        sender: { not_equals: user.id },
        isRead: { equals: false },
      },
      limit: 0,
    })

    return NextResponse.json({ unreadCount })
  } catch (error) {
    console.error('[API] Chat unread count error:', error)
    return NextResponse.json({ error: 'Failed to fetch unread count' }, { status: 500 })
  }
}
