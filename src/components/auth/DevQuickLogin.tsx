'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'

export function DevQuickLogin() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (process.env.NODE_ENV !== 'development') return null

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'pippsza', password: '123' }),
      })
      if (res.ok) {
        router.push('/app')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="fixed bottom-4 right-4 z-50 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
    >
      <Zap className="size-4" />
      {loading ? 'Logging in...' : 'Dev Login'}
    </button>
  )
}
