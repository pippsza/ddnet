import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is participant
    const conversation = await payload.findByID({
      collection: 'conversations',
      id,
      depth: 1,
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const isParticipant = (conversation.participants || []).some(
      (p: any) => {
        const uid = typeof p.user === 'object' ? p.user.id : p.user
        return uid === user.id
      },
    )

    if (!isParticipant && user.roles !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)

    const { docs: messages, totalPages, totalDocs } = await payload.find({
      collection: 'messages',
      where: {
        conversation: { equals: id },
      },
      sort: '-createdAt',
      page,
      limit,
      depth: 1,
    })

    // Mark unread messages from other user as read
    const unreadMessages = messages.filter((msg: any) => {
      const senderId = typeof msg.sender === 'object' ? msg.sender.id : msg.sender
      return senderId !== user.id && !msg.isRead
    })

    if (unreadMessages.length > 0) {
      await Promise.all(
        unreadMessages.map((msg: any) =>
          payload.update({
            collection: 'messages',
            id: msg.id,
            data: { isRead: true },
            overrideAccess: true,
          }),
        ),
      )
    }

    // Format messages for response
    const formattedMessages = messages.map((msg: any) => {
      const sender = typeof msg.sender === 'object' ? msg.sender : null
      return {
        id: msg.id,
        content: msg.content,
        images: msg.images,
        sender: sender
          ? {
              id: sender.id,
              ingameNick: sender.ingameNick,
              skin: sender.ingameStats?.skin,
            }
          : null,
        isRead: msg.isRead,
        createdAt: msg.createdAt,
      }
    })

    // Get participant info
    const participants = (conversation.participants || []).map((p: any) => {
      const u = typeof p.user === 'object' ? p.user : null
      return u
        ? {
            id: u.id,
            ingameNick: u.ingameNick,
            skin: u.ingameStats?.skin,
          }
        : null
    })

    return NextResponse.json({
      messages: formattedMessages,
      participants,
      totalPages,
      totalDocs,
      page,
    })
  } catch (error) {
    console.error('[API] Chat messages error:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conversation = await payload.findByID({
      collection: 'conversations',
      id,
      depth: 0,
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const isParticipant = (conversation.participants || []).some(
      (p: any) => {
        const uid = typeof p.user === 'object' ? p.user.id : p.user
        return uid === user.id
      },
    )

    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Soft delete: add current user to deletedBy array
    const currentDeletedBy = (conversation.deletedBy || []).map((u: any) =>
      typeof u === 'object' ? u.id : u,
    )
    if (!currentDeletedBy.includes(user.id)) {
      currentDeletedBy.push(user.id)
    }

    await payload.update({
      collection: 'conversations',
      id,
      data: { deletedBy: currentDeletedBy },
      overrideAccess: true,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Chat delete conversation error:', error)
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
  }
}
