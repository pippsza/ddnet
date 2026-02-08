import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

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

    const notification = await payload.findByID({
      collection: 'notifications',
      id,
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    const recipientId =
      typeof notification.recipient === 'string'
        ? notification.recipient
        : notification.recipient.id

    if (recipientId !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const body = await req.json()

    await payload.update({
      collection: 'notifications',
      id,
      data: { isRead: body.isRead ?? true },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[API] Error updating notification:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update notification' },
      { status: 500 },
    )
  }
}
