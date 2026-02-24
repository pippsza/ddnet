import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'

const CLAIM_MAX_AGE_MS = 30 * 60 * 1000 // 30 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { claimId, username, password, ingameNick } = body as {
      claimId: string
      username: string
      password: string
      ingameNick: string
    }

    if (!claimId || !username || !password || !ingameNick) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const payload = await getPayload({ config: payloadConfig })

    // 1. Verify the claim request
    const claimRequest = await payload.findByID({
      collection: 'verification-requests',
      id: claimId,
      overrideAccess: true,
    })

    if (!claimRequest) {
      return NextResponse.json({ error: 'Claim request not found' }, { status: 404 })
    }

    if (claimRequest.mode !== 'claim' || claimRequest.status !== 'success') {
      return NextResponse.json({ error: 'Invalid or incomplete claim request' }, { status: 400 })
    }

    if (claimRequest.consumed) {
      return NextResponse.json({ error: 'This claim has already been used' }, { status: 400 })
    }

    // Verify nickname matches
    const claimNick = claimRequest.claimNick || claimRequest.nickname
    if (claimNick !== ingameNick) {
      return NextResponse.json({ error: 'Nickname does not match claim' }, { status: 400 })
    }

    // Check claim age
    const claimAge = Date.now() - new Date(claimRequest.updatedAt).getTime()
    if (claimAge > CLAIM_MAX_AGE_MS) {
      return NextResponse.json({ error: 'Claim has expired. Please start over.' }, { status: 400 })
    }

    // 2. Create the user
    const newUser = await payload.create({
      collection: 'users',
      data: {
        username,
        ingameNick,
        password,
        roles: 'player',
      },
      overrideAccess: true,
      draft: false,
    })

    // 3. Set as verified
    await payload.update({
      collection: 'users',
      id: newUser.id,
      data: { isSystemVerified: true },
      overrideAccess: true,
    })

    // 4. Mark claim as consumed
    await payload.update({
      collection: 'verification-requests',
      id: claimId,
      data: { consumed: true },
      overrideAccess: true,
    })

    // 5. Login the user
    const loginResult = await payload.login({
      collection: 'users',
      data: { username, password },
    })

    // 6. Set the auth cookie
    const response = NextResponse.json({
      user: loginResult.user,
      token: loginResult.token,
      message: 'Account created, verified, and logged in',
    })

    if (loginResult.token) {
      response.cookies.set('payload-token', loginResult.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
      })
    }

    return response
  } catch (error) {
    console.error('[register-after-claim] Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
