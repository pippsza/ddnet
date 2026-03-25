'use client'

import { useState, type ReactNode } from 'react'
import { MapCanvas } from './MapCanvas'
import { MapSection } from './MapSection'
import { MapNavbar } from './MapNavbar'
import {
  HeroSection,
  FeaturesSection,
  DDNetModesSection,
  BingoPreviewSection,
  KoGModesSection,
  RacePreviewSection,
  DownloadSection,
  CommunitySection,
  TeamSection,
  FooterSection,
} from './LandingSections'
import { getPreset, getCameraPath, getSections, getNavItems, getAllPresetIds, DEFAULT_PRESET } from './map-presets'

interface DesktopLandingProps {
  isLoggedIn: boolean
  locale: string
}

export function DesktopLanding({ isLoggedIn, locale }: DesktopLandingProps) {
  const [presetId, setPresetId] = useState(DEFAULT_PRESET)
  const preset = getPreset(presetId)
  const s = getSections(preset)
  const cameraPath = getCameraPath(preset)
  const navItems = getNavItems(preset)

  const sections: ReactNode = (
    <>
      <MapSection x={s.hero.x} y={s.hero.y} width={550}>
        <HeroSection locale={locale} />
      </MapSection>

      <MapSection x={s.features.x} y={s.features.y} width={850} animateFrom="left" delay={0.1}>
        <FeaturesSection />
      </MapSection>

      <MapSection x={s.ddnet.x} y={s.ddnet.y} width={550} animateFrom="right" delay={0.1}>
        <DDNetModesSection />
      </MapSection>

      <MapSection x={s.bingo.x} y={s.bingo.y} width={680} animateFrom="bottom" delay={0.15}>
        <BingoPreviewSection />
      </MapSection>

      <MapSection x={s.kog.x} y={s.kog.y} width={600} animateFrom="left" delay={0.1}>
        <KoGModesSection />
      </MapSection>

      <MapSection x={s.race.x} y={s.race.y} width={580} animateFrom="bottom" delay={0.15}>
        <RacePreviewSection />
      </MapSection>

      <MapSection x={s.download.x} y={s.download.y} width={620} animateFrom="right" delay={0.1}>
        <DownloadSection />
      </MapSection>

      <MapSection x={s.community.x} y={s.community.y} width={580} animateFrom="left" delay={0.1}>
        <CommunitySection />
      </MapSection>

      <MapSection x={s.team.x} y={s.team.y} width={580} animateFrom="right" delay={0.1}>
        <TeamSection locale={locale} />
      </MapSection>

      <MapSection x={s.footer.x} y={s.footer.y} width={680} animateFrom="bottom" delay={0.1}>
        <FooterSection locale={locale} />
      </MapSection>
    </>
  )

  return (
    <>
      <MapNavbar
        items={navItems}
        scrollMultiplier={preset.scrollMultiplier}
        isLoggedIn={isLoggedIn}
        locale={locale}
      />

      <PresetSwitcher current={presetId} onChange={setPresetId} />

      <MapCanvas
        key={presetId}
        mapName={preset.mapFile}
        path={cameraPath}
        scrollMultiplier={preset.scrollMultiplier}
        debugStops={preset.stops}
      >
        {sections}
      </MapCanvas>
    </>
  )
}

// ─── Preset Switcher ─────────────────────────────────────────────────────────

function PresetSwitcher({ current, onChange }: { current: string; onChange: (id: string) => void }) {
  const ids = getAllPresetIds()
  if (ids.length <= 1) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex gap-1.5 bg-black/60 backdrop-blur-md rounded-full p-1.5 border border-white/10">
      {ids.map((id) => {
        const preset = getPreset(id)
        const active = id === current
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              active
                ? 'bg-primary text-black'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            {preset.label}
          </button>
        )
      })}
    </div>
  )
}
