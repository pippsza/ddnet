import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { encrypt, decrypt } from '@/lib/encryption'

export const dynamic = 'force-dynamic'

/** POST — save encrypted login token */
export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await req.json()
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const encrypted = encrypt(token.trim())

    await payload.update({
      collection: 'users',
      id: user.id,
      data: { savedLoginToken: encrypted },
      overrideAccess: true,
    })

    return NextResponse.json({ saved: true })
  } catch (error) {
    console.error('[API] Error saving login token:', error)
    return NextResponse.json({ error: 'Failed to save token' }, { status: 500 })
  }
}

/** GET — check if user has a saved token */
export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const fullUser = await payload.findByID({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
    })

    return NextResponse.json({ hasSavedToken: !!fullUser.savedLoginToken })
  } catch (error) {
    console.error('[API] Error checking token:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

/** DELETE — remove saved token */
export async function DELETE(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await payload.update({
      collection: 'users',
      id: user.id,
      data: { savedLoginToken: '' },
      overrideAccess: true,
    })

    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('[API] Error deleting token:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
