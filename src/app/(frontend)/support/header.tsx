'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { ThemeToggleButton } from '@/components/theme/theme-toggle'
import { LifeBuoy, Home, LogIn } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function SupportHeader() {
  const { data: meData } = useSWR('/api/users/me', fetcher)
  const isLoggedIn = !!meData?.user

  return (
    <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur sticky top-0 z-10">
      <Link href="/support" className="flex items-center gap-2 font-semibold">
        <LifeBuoy className="h-5 w-5" />
        Support
      </Link>
      <div className="flex items-center gap-3">
        {isLoggedIn ? (
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Home"
          >
            <Home className="h-5 w-5" />
          </Link>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Log in
          </Link>
        )}
        <ThemeToggleButton />
      </div>
    </header>
  )
}
