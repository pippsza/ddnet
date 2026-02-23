export const VERIFICATION_STATUSES = [
  { label: 'Pending', value: 'pending' },
  { label: 'Success', value: 'success' },
  { label: 'Expired', value: 'expired' },
  { label: 'Failed', value: 'failed' },
] as const

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]['value']

export const VERIFICATION_TTL_MS = 10 * 60 * 1000 // 10 minutes
export const MAX_CONCURRENT_BOTS = 4
export const POLLING_INTERVAL_MS = 3000 // 3 seconds
