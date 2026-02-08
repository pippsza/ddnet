import webpush from 'web-push'
import { getPayload } from 'payload'
import config from '@/payload.config'

// Initialize VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@ddnet-bingo.com'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
}

/**
 * Send push notification to a specific user
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[Push] VAPID keys not configured, skipping push notification')
    return
  }

  try {
    const db = await getPayload({ config })

    const { docs: subscriptions } = await db.find({
      collection: 'push-subscriptions',
      where: { user: { equals: userId } },
    })

    if (subscriptions.length === 0) return

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      icon: payload.icon || '/icons/icon-192.png',
    })

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          pushPayload,
        ),
      ),
    )

    // Clean up expired subscriptions
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      if (result.status === 'rejected' && (result.reason as any)?.statusCode === 410) {
        // Subscription expired, remove it
        await db.delete({
          collection: 'push-subscriptions',
          id: subscriptions[i].id,
        })
      }
    }
  } catch (error) {
    console.error('[Push] Error sending notification:', error)
  }
}

/**
 * Get the public VAPID key for client-side subscription
 */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY
}
