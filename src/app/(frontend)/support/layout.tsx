import { SupportHeader } from './header'

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SupportHeader />
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">{children}</main>
    </div>
  )
}
