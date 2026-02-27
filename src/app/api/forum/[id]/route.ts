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

    // Deduplicated view counting via cookie
    const viewedCookie = req.cookies.get('forum_views')?.value
    const viewedIds: string[] = viewedCookie ? JSON.parse(viewedCookie) : []
    let shouldIncrement = !viewedIds.includes(id)

    // Also skip if logged-in user is the author
    if (user && typeof post.author === 'object' && post.author?.id === user.id) {
      shouldIncrement = false
    }

    if (shouldIncrement) {
      await payload.update({
        collection: 'forum-posts',
        id,
        data: { views: (post.views || 0) + 1 },
        overrideAccess: true,
      })
      viewedIds.push(id)
      // Keep only last 200 IDs to prevent cookie bloat
      const trimmed = viewedIds.slice(-200)
      const response = NextResponse.json({ post: { ...post, views: (post.views || 0) + 1 } })
      response.cookies.set('forum_views', JSON.stringify(trimmed), {
        maxAge: 60 * 60 * 24, // 24 hours
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      })
      return response
    }

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
    const { content, images } = body
    const hasImages = Array.isArray(images) && images.length > 0

    if (!content && !hasImages) {
      return NextResponse.json({ error: 'Reply content is required' }, { status: 400 })
    }

    // Accept both Lexical JSON and plain text string
    const lexicalContent = content
      ? (typeof content === 'string' ? textToLexical(content.trim()) : content)
      : undefined

    const imageData = hasImages
      ? images.map((id: string) => ({ image: id }))
      : undefined

    const replies = post.replies || []
    replies.push({
      author: user.id,
      ...(lexicalContent && { content: lexicalContent }),
      ...(imageData && { images: imageData }),
      createdAt: new Date().toISOString(),
      likes: 0,
    })

    const updated = await payload.update({
      collection: 'forum-posts',
      id,
      data: { replies },
      overrideAccess: true,
    })

    // Notify thread participants (author + previous repliers, excluding sender)
    const participantIds = new Set<string>()
    const postAuthorId = typeof post.author === 'string' ? post.author : (post.author as any)?.id
    if (postAuthorId) participantIds.add(postAuthorId)

    for (const reply of (post.replies || [])) {
      const replyAuthorId = typeof reply.author === 'string' ? reply.author : (reply.author as any)?.id
      if (replyAuthorId) participantIds.add(replyAuthorId)
    }
    participantIds.delete(user.id)

    const actionUrl = `/app/forum/${id}`
    for (const recipientId of participantIds) {
      try {
        const { totalDocs } = await payload.find({
          collection: 'notifications',
          where: {
            and: [
              { recipient: { equals: recipientId } },
              { type: { equals: 'forum_reply' } },
              { isRead: { equals: false } },
              { actionUrl: { equals: actionUrl } },
            ],
          },
          limit: 0,
          overrideAccess: true,
        })

        if (totalDocs === 0) {
          await payload.create({
            collection: 'notifications',
            data: {
              recipient: recipientId,
              type: 'forum_reply',
              title: 'New reply in forum thread',
              message: `New reply in "${post.title}"`,
              actionUrl,
              relatedUser: user.id,
            },
            overrideAccess: true,
          })
        }
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json({ post: updated })
  } catch (error) {
    console.error('[API] Forum reply error:', error)
    return NextResponse.json({ error: 'Failed to add reply' }, { status: 500 })
  }
}

