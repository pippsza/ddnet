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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    const url = new URL(req.url)
    const category = url.searchParams.get('category')
    const q = url.searchParams.get('q')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50)

    const where: any = {}

    // Non-admin/mod users only see published posts (handled by collection access)
    if (category) {
      where.category = { equals: category }
    }
    if (q) {
      where.title = { contains: q }
    }

    const { docs, totalPages, totalDocs } = await payload.find({
      collection: 'forum-posts',
      where,
      sort: '-isPinned,-createdAt',
      page,
      limit,
      depth: 1,
      user: user || undefined,
    })

    const posts = docs.map((post) => {
      const author = typeof post.author === 'object' ? post.author : null
      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        category: post.category,
        status: post.status,
        isPinned: post.isPinned,
        views: post.views || 0,
        likes: post.likes || 0,
        replyCount: post.replies?.length || 0,
        author: author
          ? {
              id: author.id,
              ingameNick: (author as any).ingameNick,
              roles: (author as any).roles || 'player',
              skin: (author as any).ingameStats?.skin?.name || null,
              lastSeenAt: (author as any).lastSeenAt || null,
            }
          : null,
        createdAt: post.createdAt,
      }
    })

    return NextResponse.json({ posts, totalPages, totalDocs, page })
  } catch (error) {
    console.error('[API] Forum list error:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
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
    const { title, category, content } = body

    if (!title?.trim() || !category || !content) {
      return NextResponse.json({ error: 'Title, category, and content are required' }, { status: 400 })
    }

    // Accept both Lexical JSON and plain text string
    const lexicalContent = typeof content === 'string' ? textToLexical(content.trim()) : content

    const baseSlug = slugify(title.trim())
    const slug = `${baseSlug}-${Date.now().toString(36)}`

    const post = await payload.create({
      collection: 'forum-posts',
      data: {
        title: title.trim(),
        slug,
        content: lexicalContent,
        author: user.id,
        category,
        status: 'published',
        isPinned: false,
        views: 0,
        likes: 0,
        replies: [],
      },
    })

    return NextResponse.json({ post: { id: post.id, slug: post.slug } })
  } catch (error) {
    console.error('[API] Forum create error:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}
