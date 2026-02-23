import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user || user.roles !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await payload.update({
      collection: 'users',
      id: user.id,
      data: { isSystemVerified: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Debug unverify error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
