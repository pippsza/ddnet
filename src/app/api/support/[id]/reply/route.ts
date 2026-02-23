import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

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
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { message } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const ticket = await payload.findByID({
      collection: 'support',
      id,
      depth: 1,
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const ticketAuthor = typeof ticket.createdBy === 'string' ? ticket.createdBy : ticket.createdBy?.id
    if (ticketAuthor !== user.id && user.roles !== 'admin' && user.roles !== 'moderator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const isStaff = user.roles === 'admin' || user.roles === 'moderator'
    const responses = ticket.responses || []
    responses.push({
      message: textToLexical(message.trim()),
      author: user.id,
      isStaffResponse: isStaff,
      timestamp: new Date().toISOString(),
    })

    const updated = await payload.update({
      collection: 'support',
      id,
      data: {
        responses,
        status: isStaff ? 'waiting_for_user' : 'in_progress',
      },
    })

    return NextResponse.json({ ticket: updated })
  } catch (error) {
    console.error('[API] Support reply error:', error)
    return NextResponse.json({ error: 'Failed to add response' }, { status: 500 })
  }
}
