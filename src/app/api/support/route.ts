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

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { docs: tickets } = await payload.find({
      collection: 'support',
      where: { createdBy: { equals: user.id } },
      sort: '-createdAt',
      limit: 50,
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('[API] Support list error:', error)
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
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
    const { subject, category, priority, description } = body

    if (!subject || !category || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const ticket = await payload.create({
      collection: 'support',
      data: {
        subject,
        category,
        priority: priority || 'medium',
        description: textToLexical(description),
        status: 'open',
        createdBy: user.id,
        responses: [],
      },
    })

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('[API] Support create error:', error)
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
  }
}
