import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/api-auth'

function textToLexical(text: string) {
  return {
    root: {
      type: 'root',
      children: text.split('\n').map((line) => ({
        type: 'paragraph',
        children: [{ type: 'text', text: line, version: 1 }],
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
        version: 1,
      })),
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
    },
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const result = await requirePermission(req, 'support', 'reply')
    if (result instanceof NextResponse) return result
    const { user, payload } = result

    const body = await req.json()
    const { message, images } = body
    const hasImages = Array.isArray(images) && images.length > 0

    if (!message?.trim() && !hasImages) {
      return NextResponse.json({ error: 'Message or images required' }, { status: 400 })
    }

    const ticket = await payload.findByID({
      collection: 'support',
      id,
      depth: 1,
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const isStaff = true // User passed requirePermission('support', 'reply')
    const imageData = hasImages
      ? images.map((id: string) => ({ image: id }))
      : undefined

    const responses = ticket.responses || []
    responses.push({
      message: message?.trim() ? textToLexical(message.trim()) : textToLexical(' '),
      author: user.id,
      isStaffResponse: isStaff,
      timestamp: new Date().toISOString(),
      ...(imageData && { images: imageData }),
    })

    const updated = await payload.update({
      collection: 'support',
      id,
      data: {
        responses,
        status: isStaff ? 'waiting_for_user' : 'in_progress',
      },
    })

    // Notify ticket creator when staff replies
    const ticketCreatorId = typeof ticket.createdBy === 'string'
      ? ticket.createdBy
      : (ticket.createdBy as any)?.id

    if (ticketCreatorId && ticketCreatorId !== user.id) {
      try {
        const ticketUrl = `/support/${id}`
        const { totalDocs } = await payload.find({
          collection: 'notifications',
          where: {
            and: [
              { recipient: { equals: ticketCreatorId } },
              { type: { equals: 'support_reply' } },
              { isRead: { equals: false } },
              { actionUrl: { equals: ticketUrl } },
            ],
          },
          limit: 0,
          overrideAccess: true,
        })

        if (totalDocs === 0) {
          await payload.create({
            collection: 'notifications',
            data: {
              recipient: ticketCreatorId,
              type: 'support_reply',
              title: 'New reply in your ticket',
              message: `Staff replied to "${ticket.subject}"`,
              actionUrl: ticketUrl,
              relatedUser: user.id,
            },
            overrideAccess: true,
          })
        }
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json({ ticket: updated })
  } catch (error) {
    console.error('[API] Support reply error:', error)
    return NextResponse.json({ error: 'Failed to add response' }, { status: 500 })
  }
}
