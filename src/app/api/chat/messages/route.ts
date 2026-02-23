import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { conversationId, content } = body

    if (!conversationId || !content?.trim()) {
      return NextResponse.json({ error: 'conversationId and content are required' }, { status: 400 })
    }

    // Verify user is participant
    const conversation = await payload.findByID({
      collection: 'conversations',
      id: conversationId,
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

    // Create message
    const message = await payload.create({
      collection: 'messages',
      data: {
        conversation: conversationId,
        sender: user.id,
        content: content.trim(),
        isRead: false,
      },
    })

    // Update conversation with last message info
    const preview = content.trim().length > 100
      ? content.trim().slice(0, 100) + '...'
      : content.trim()

    await payload.update({
      collection: 'conversations',
      id: conversationId,
      data: {
        lastMessage: preview,
        lastMessageAt: new Date().toISOString(),
        lastMessageBy: user.id,
      },
      overrideAccess: true,
    })

    // Create notification for the other participant
    const otherParticipant = (conversation.participants || []).find(
      (p: any) => {
        const uid = typeof p.user === 'object' ? p.user.id : p.user
        return uid !== user.id
      },
    )

    if (otherParticipant) {
      const recipientId = typeof otherParticipant.user === 'object'
        ? otherParticipant.user.id
        : otherParticipant.user

      try {
        await payload.create({
          collection: 'notifications',
          data: {
            recipient: recipientId,
            type: 'info',
            title: `New message from ${user.ingameNick || 'someone'}`,
            message: preview,
          } as any,
          overrideAccess: true,
        })
      } catch {
        // Non-critical, ignore notification errors
      }
    }

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        sender: {
          id: user.id,
          ingameNick: user.ingameNick,
        },
        isRead: false,
        createdAt: message.createdAt,
      },
    })
  } catch (error) {
    console.error('[API] Chat send message error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
