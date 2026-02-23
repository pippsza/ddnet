/**
 * Check if a user is "platform online" based on their lastSeenAt timestamp.
 * A user is considered online if they were seen within the last 2 minutes.
 */
export function isPlatformOnline(lastSeenAt?: string | null): boolean {
  if (!lastSeenAt) return false
  return Date.now() - new Date(lastSeenAt).getTime() < 2 * 60 * 1000
}
