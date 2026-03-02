import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const article = await payload.findByID({
    collection: 'articles',
    id,
    depth: 0,
  })

  const likedByIds = (article.likedBy || []).map((u: any) =>
    typeof u === 'string' ? u : u.id,
  )
  const alreadyLiked = likedByIds.includes(user.id)

  let updated
  if (alreadyLiked) {
    updated = await payload.update({
      collection: 'articles',
      id,
      data: {
        likes: Math.max(0, (article.likes || 0) - 1),
        likedBy: likedByIds.filter((uid: string) => uid !== user.id),
      },
      overrideAccess: true,
    })
  } else {
    updated = await payload.update({
      collection: 'articles',
      id,
      data: {
        likes: (article.likes || 0) + 1,
        likedBy: [...likedByIds, user.id],
      },
      overrideAccess: true,
    })
  }

  return NextResponse.json({ likes: updated.likes, liked: !alreadyLiked })
}
