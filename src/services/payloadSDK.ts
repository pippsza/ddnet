'use client'
import { PayloadSDK } from '@payloadcms/sdk'

/**
 * Payload SDK instance for making API requests
 * @experimental marked as experimental while the SDK is in beta
 * Note: Using generic type due to loginWithUsername auth configuration
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sdk = new PayloadSDK<any>({
  baseURL: '/api', //Relative URL (same origin)
  baseInit: { credentials: 'include' },
  fetch: typeof window !== 'undefined' ? window.fetch.bind(window) : globalThis.fetch,
})
