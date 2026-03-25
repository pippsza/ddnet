'use client'

import { HeroSection, FeaturesSection, DDNetModesSection, BingoPreviewSection, KoGModesSection, RacePreviewSection, DownloadSection, CommunitySection, TeamSection, FooterSection } from './LandingSections'

interface MobileLandingProps {
  locale: string
}

export function MobileLanding({ locale }: MobileLandingProps) {
  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: 'url(/map-tiles/quantum/placeholder.webp)',
        backgroundColor: '#0a0f14',
      }}
    >
      <div className="min-h-screen bg-black/70 backdrop-blur-sm">
        <div className="flex flex-col gap-16 px-5 py-24 max-w-lg mx-auto">
          <HeroSection locale={locale} />
          <FeaturesSection />
          <DDNetModesSection />
          <BingoPreviewSection />
          <KoGModesSection />
          <RacePreviewSection />
          <DownloadSection />
          <CommunitySection />
          <TeamSection locale={locale} />
          <FooterSection locale={locale} />
        </div>
      </div>
    </div>
  )
}
