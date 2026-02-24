import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT = 'ddnet-login-token' // static salt — key derivation uses PAYLOAD_SECRET

function deriveKey(): Buffer {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) throw new Error('PAYLOAD_SECRET is not set')
  return pbkdf2Sync(secret, SALT, 100_000, 32, 'sha256')
}

/** Encrypt a plaintext string. Returns hex-encoded `iv:authTag:ciphertext`. */
export function encrypt(plaintext: string): string {
  const key = deriveKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

/** Decrypt an `iv:authTag:ciphertext` hex string back to plaintext. */
export function decrypt(token: string): string {
  const [ivHex, authTagHex, encryptedHex] = token.split(':')
  if (!ivHex || !authTagHex || !encryptedHex) throw new Error('Invalid encrypted token format')
  const key = deriveKey()
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()])
  return decrypted.toString('utf8')
}
