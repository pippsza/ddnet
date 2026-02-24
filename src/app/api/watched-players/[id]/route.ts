import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export const dynamic = 'force-dynamic'

/** PATCH — toggle notifyOnline */
export async function PATCH(
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
    const doc = await payload.update({
      collection: 'watched-players',
      id,
      data: { notifyOnline: !!body.notifyOnline },
      overrideAccess: false,
      user,
    })

    return NextResponse.json({ doc })
  } catch (error) {
    console.error('[API] Error updating watched player:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update' },
      { status: 500 },
    )
  }
}

/** DELETE — remove from watchlist */
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

    await payload.delete({
      collection: 'watched-players',
      id,
      overrideAccess: false,
      user,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error deleting watched player:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete' },
      { status: 500 },
    )
  }
}
