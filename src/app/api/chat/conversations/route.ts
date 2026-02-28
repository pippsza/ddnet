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

    const { docs: conversations } = await payload.find({
      collection: 'conversations',
      where: {
        and: [
          { 'participants.user': { equals: user.id } },
          { 'deletedBy': { not_in: [user.id] } },
        ],
      },
      sort: '-lastMessageAt',
      depth: 1,
      limit: 50,
    })

    // Get unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const { totalDocs: unreadCount } = await payload.find({
          collection: 'messages',
          where: {
            conversation: { equals: conv.id },
            sender: { not_equals: user.id },
            isRead: { equals: false },
          },
          limit: 0,
        })

        const participants = (conv.participants || []).map((p: any) => {
          const u = typeof p.user === 'object' ? p.user : null
          if (!u) return null
          const rawSkin = u.ingameStats?.skin
          return {
            id: u.id,
            ingameNick: u.ingameNick,
            roles: u.roles || 'player',
            primaryRole: (u as any).primaryRole || null,
            lastSeenAt: u.lastSeenAt || null,
            skin: rawSkin?.name
              ? {
                  name: rawSkin.name,
                  colorBody: rawSkin.color_body || 0,
                  colorFeet: rawSkin.color_feet || 0,
                }
              : null,
          }
        })

        const otherUser = participants.find((p: any) => p?.id !== user.id)

        return {
          id: conv.id,
          participants,
          otherUser,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          lastMessageBy: conv.lastMessageBy,
          unreadCount,
        }
      }),
    )

    return NextResponse.json({ conversations: conversationsWithUnread })
  } catch (error) {
    console.error('[API] Chat conversations list error:', error)
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot start a conversation with yourself' }, { status: 400 })
    }

    // Check if conversation already exists between these users
    const { docs: existing } = await payload.find({
      collection: 'conversations',
      where: {
        and: [
          { 'participants.user': { equals: user.id } },
          { 'participants.user': { equals: userId } },
        ],
      },
      limit: 1,
      depth: 1,
    })

    if (existing.length > 0) {
      // Clear deletedBy so the conversation resurfaces for the user who "deleted" it
      const conv = existing[0]
      const deletedBy = ((conv as any).deletedBy || []).map((u: any) =>
        typeof u === 'object' ? u.id : u,
      )
      if (deletedBy.includes(user.id)) {
        await payload.update({
          collection: 'conversations',
          id: conv.id,
          data: { deletedBy: deletedBy.filter((id: string) => id !== user.id) },
          overrideAccess: true,
        })
      }
      return NextResponse.json({ conversation: { id: conv.id } })
    }

    // Create new conversation
    const conversation = await payload.create({
      collection: 'conversations',
      data: {
        participants: [{ user: user.id }, { user: userId }],
        lastMessageAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({ conversation: { id: conversation.id } })
  } catch (error) {
    console.error('[API] Chat create conversation error:', error)
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
  }
}
