import Link from 'next/link'
import { ThemeToggleButton } from '@/components/theme/theme-toggle'
import { LifeBuoy } from 'lucide-react'

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <Link href="/support" className="flex items-center gap-2 font-semibold">
          <LifeBuoy className="h-5 w-5" />
          Support
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Log in
          </Link>
          <ThemeToggleButton />
        </div>
      </header>
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">{children}</main>
    </div>
  )
}
