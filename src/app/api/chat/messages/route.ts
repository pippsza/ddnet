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
    const { conversationId, content, images } = body
    const hasImages = Array.isArray(images) && images.length > 0

    if (!conversationId || (!content?.trim() && !hasImages)) {
      return NextResponse.json({ error: 'conversationId and content or images are required' }, { status: 400 })
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
    const messageText = (content || '').trim()
    const imageData = hasImages
      ? images.map((id: string) => ({ image: id }))
      : undefined

    const message = await payload.create({
      collection: 'messages',
      data: {
        conversation: conversationId,
        sender: user.id,
        content: messageText || (hasImages ? '[image]' : ''),
        isRead: false,
        ...(imageData && { images: imageData }),
      },
    })

    // Update conversation with last message info
    const previewText = messageText || (hasImages ? '[image]' : '')
    const preview = previewText.length > 100
      ? previewText.slice(0, 100) + '...'
      : previewText

    await payload.update({
      collection: 'conversations',
      id: conversationId,
      data: {
        lastMessage: preview,
        lastMessageAt: new Date().toISOString(),
        lastMessageBy: user.id,
        deletedBy: [], // Clear soft-deletes so the conversation resurfaces for all participants
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

      void (async () => {
        try {
          const { totalDocs: existing } = await payload.find({
            collection: 'notifications',
            where: {
              and: [
                { recipient: { equals: recipientId } },
                { type: { equals: 'direct_message' } },
                { isRead: { equals: false } },
                { relatedUser: { equals: user.id } },
              ],
            },
            limit: 0,
            overrideAccess: true,
          })

          if (existing === 0) {
            await payload.create({
              collection: 'notifications',
              data: {
                recipient: recipientId,
                type: 'direct_message',
                title: `Message from ${user.ingameNick || 'someone'}`,
                message: preview,
                actionUrl: '/app/chat',
                relatedUser: user.id,
              },
              overrideAccess: true,
            })
          }
        } catch {
          // Non-critical
        }
      })()
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
