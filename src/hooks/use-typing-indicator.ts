'use client'

import { useEffect, useRef, useCallback } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface TypingUser {
  userId: string
  userName: string
}

interface UseTypingIndicatorOptions {
  /** "conversation", "forum", or "support" */
  scope: string
  /** The ID of the conversation/post/ticket */
  scopeId: string | undefined | null
  /** Whether the current user is actively typing (call setIsTyping from input onChange) */
  enabled?: boolean
}

/**
 * Hook that handles both sending "I'm typing" signals and polling for other users' typing status.
 *
 * Returns:
 * - typingUsers: list of users currently typing
 * - notifyTyping: call this when the user types (debounced internally)
 */
export function useTypingIndicator({ scope, scopeId, enabled = true }: UseTypingIndicatorOptions) {
  const lastSentRef = useRef(0)

  // Poll for typing users every 2s
  const { data } = useSWR<{ typing: TypingUser[] }>(
    enabled && scopeId ? `/api/chat/typing?scope=${scope}&scopeId=${scopeId}` : null,
    fetcher,
    { refreshInterval: 2000, revalidateOnFocus: false },
  )

  const typingUsers: TypingUser[] = data?.typing || []

  // Send typing notification (debounced: max once per 2s)
  const notifyTyping = useCallback(() => {
    if (!scopeId || !enabled) return
    const now = Date.now()
    if (now - lastSentRef.current < 2000) return
    lastSentRef.current = now

    fetch('/api/chat/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope, scopeId }),
    }).catch(() => {})
  }, [scope, scopeId, enabled])

  // Cleanup: stop polling ref on unmount
  useEffect(() => {
    return () => {
      lastSentRef.current = 0
    }
  }, [])

  return { typingUsers, notifyTyping }
}
