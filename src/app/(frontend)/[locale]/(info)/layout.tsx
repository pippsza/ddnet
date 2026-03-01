import { InfoHeader } from '@/components/layout/InfoHeader'

export default function InfoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <InfoHeader />
      <main className="flex-1">{children}</main>
    </div>
  )
}
