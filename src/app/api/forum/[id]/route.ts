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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    const post = await payload.findByID({
      collection: 'forum-posts',
      id,
      depth: 2,
      user: user || undefined,
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Increment views
    await payload.update({
      collection: 'forum-posts',
      id,
      data: { views: (post.views || 0) + 1 },
      overrideAccess: true,
    })

    return NextResponse.json({ post })
  } catch (error) {
    console.error('[API] Forum detail error:', error)
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
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

    const post = await payload.findByID({
      collection: 'forum-posts',
      id,
      depth: 0,
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post.status === 'locked') {
      return NextResponse.json({ error: 'This post is locked' }, { status: 403 })
    }

    const body = await req.json()
    const { content } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Reply content is required' }, { status: 400 })
    }

    const replies = post.replies || []
    replies.push({
      author: user.id,
      content: textToLexical(content.trim()),
      createdAt: new Date().toISOString(),
      likes: 0,
    })

    const updated = await payload.update({
      collection: 'forum-posts',
      id,
      data: { replies },
      overrideAccess: true,
    })

    return NextResponse.json({ post: updated })
  } catch (error) {
    console.error('[API] Forum reply error:', error)
    return NextResponse.json({ error: 'Failed to add reply' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user || (user.roles !== 'admin' && user.roles !== 'moderator')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const data: any = {}

    if (body.status) data.status = body.status
    if (body.isPinned !== undefined) data.isPinned = body.isPinned

    const updated = await payload.update({
      collection: 'forum-posts',
      id,
      data,
      overrideAccess: true,
    })

    return NextResponse.json({ post: updated })
  } catch (error) {
    console.error('[API] Forum moderate error:', error)
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
  }
}
