import { InfoHeader } from '@/components/layout/InfoHeader'
import { MapBackground } from '@/components/landing/MapBackground'

export default function InfoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <MapBackground />
      <InfoHeader />
      <main className="flex-1 relative z-10">{children}</main>
    </div>
  )
}
