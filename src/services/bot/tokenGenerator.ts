import { randomInt } from 'crypto'
import { TOKEN_LENGTH } from '@/lib/verification-constants'

/**
 * Generates a cryptographically secure verification token
 * @returns A 6-digit numeric string
 */
export function generateVerificationToken(): string {
  const min = Math.pow(10, TOKEN_LENGTH - 1)
  const max = Math.pow(10, TOKEN_LENGTH) - 1
  return randomInt(min, max + 1).toString()
}
