import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import type { User } from '@/payload-types'

export interface AuthSession {
  user: User | null
  token: string | null
}

/**
 * Get current user session from Payload auth
 * Uses cookies to get the payload-token
 */
export async function auth(): Promise<AuthSession> {
  try {
    const payload = await getPayload({ config: payloadConfig })
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')?.value

    if (!token) {
      return { user: null, token: null }
    }

    // Verify the token and get user
    const { user } = await payload.auth({
      headers: await headers(),
    })

    return { user: user as User | null, token }
  } catch {
    return { user: null, token: null }
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await auth()
  return session.user !== null
}

/**
 * Get current user or throw if not authenticated
 */
export async function requireAuth(): Promise<User> {
  const session = await auth()
  if (!session.user) {
    throw new Error('Unauthorized')
  }
  return session.user
}
