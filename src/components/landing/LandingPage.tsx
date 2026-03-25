'use client'

import { useEffect, useState } from 'react'
import { DesktopLanding } from './DesktopLanding'
import { MobileLanding } from './MobileLanding'
import { MapNavbar } from './MapNavbar'

interface LandingPageProps {
  isLoggedIn: boolean
  locale: string
}

export function LandingPage({ isLoggedIn, locale }: LandingPageProps) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Avoid hydration mismatch: show gradient matching map palette while detecting
  if (isMobile === null) {
    return (
      <div className="fixed inset-0 bg-linear-to-b from-[#2a1f4e] via-[#1a1040] to-[#0a0f14]" />
    )
  }

  if (isMobile) {
    return (
      <>
        <MapNavbar
          items={[
            { label: 'Home', scrollTarget: 0 },
            { label: 'Features', scrollTarget: 0.15 },
            { label: 'Download', scrollTarget: 0.65 },
          ]}
          scrollMultiplier={1}
          isLoggedIn={isLoggedIn}
          locale={locale}
        />
        <MobileLanding locale={locale} />
      </>
    )
  }

  return <DesktopLanding isLoggedIn={isLoggedIn} locale={locale} />
}
