'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/animations'
import { useLocale } from 'next-intl'
import {
  ArrowLeft,
  Heart,
  Code2,
  MessageCircle,
  Github,
  Send,
  Twitter,
  Globe,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const PLATFORM_ICONS: Record<string, typeof Github> = {
  discord: MessageCircle,
  telegram: Send,
  github: Github,
  twitter: Twitter,
  ddnet: Globe,
  email: Globe,
}

function getLinkHref(platform: string, value: string): string {
  if (value.startsWith('http')) return value
  switch (platform) {
    case 'github':
      return `https://github.com/${value.replace('@', '')}`
    case 'telegram':
      return `https://t.me/${value.replace('@', '')}`
    case 'twitter':
      return `https://x.com/${value.replace('@', '')}`
    case 'email':
      return `mailto:${value}`
    default:
      return '#'
  }
}

/* ─── Hero Preset ─── */

function HeroMember({ member }: { member: any }) {
  return (
    <FadeIn className="w-full">
      <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-primary/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
        <CardContent className="relative flex flex-col items-center text-center p-4 sm:p-8 gap-4">
          <div className="relative">
            <div className="absolute -inset-3 rounded-full bg-primary/20 blur-xl" />
            <TeeAvatarWithFallback
              skinUrl={member.skinName ? getDDNetSkinUrl(member.skinName) : undefined}
              bodyColor={member.skinColorBody}
              feetColor={member.skinColorFeet}
              useCustomColors={!!(member.skinColorBody || member.skinColorFeet)}
              size="2xl"
              lookAtCursor
            />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-bold">{member.name}</h3>
            {member.title && (
              <Badge
                style={{ backgroundColor: `${member.titleColor || '#6b7280'}20`, color: member.titleColor || '#6b7280' }}
                className="text-sm px-3 py-1"
              >
                {member.title}
              </Badge>
            )}
          </div>
          {member.description && (
            <p className="text-muted-foreground max-w-lg leading-relaxed">{member.description}</p>
          )}
          {member.links?.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-2">
              {member.links.map((link: any, i: number) => {
                const Icon = PLATFORM_ICONS[link.platform] || Globe
                return (
                  <a
                    key={i}
                    href={getLinkHref(link.platform, link.value)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
                    title={`${link.platform}: ${link.value}`}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  )
}

/* ─── Spotlight Preset ─── */

function SpotlightMember({ member }: { member: any }) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-all">
      <CardContent className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 p-4 sm:p-5">
        <div className="shrink-0">
          <TeeAvatarWithFallback
            skinUrl={member.skinName ? getDDNetSkinUrl(member.skinName) : undefined}
            bodyColor={member.skinColorBody}
            feetColor={member.skinColorFeet}
            useCustomColors={!!(member.skinColorBody || member.skinColorFeet)}
            size="lg"
          />
        </div>
        <div className="flex-1 min-w-0 space-y-1.5 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <h4 className="font-semibold text-base sm:text-lg">{member.name}</h4>
            {member.title && (
              <Badge
                style={{ backgroundColor: `${member.titleColor || '#6b7280'}20`, color: member.titleColor || '#6b7280' }}
                className="text-xs"
              >
                {member.title}
              </Badge>
            )}
          </div>
          {member.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{member.description}</p>
          )}
          {member.links?.length > 0 && (
            <div className="flex justify-center sm:justify-start gap-2 pt-1">
              {member.links.map((link: any, i: number) => {
                const Icon = PLATFORM_ICONS[link.platform] || Globe
                return (
                  <a
                    key={i}
                    href={getLinkHref(link.platform, link.value)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title={`${link.platform}: ${link.value}`}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/* ─── Card Preset ─── */

function CardMember({ member }: { member: any }) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-all h-full">
      <CardContent className="flex flex-col items-center text-center p-5 gap-3">
        <TeeAvatarWithFallback
          skinUrl={member.skinName ? getDDNetSkinUrl(member.skinName) : undefined}
          bodyColor={member.skinColorBody}
          feetColor={member.skinColorFeet}
          useCustomColors={!!(member.skinColorBody || member.skinColorFeet)}
          size="lg"
        />
        <div className="space-y-1">
          <h4 className="font-semibold">{member.name}</h4>
          {member.title && (
            <Badge
              style={{ backgroundColor: `${member.titleColor || '#6b7280'}20`, color: member.titleColor || '#6b7280' }}
              className="text-xs"
            >
              {member.title}
            </Badge>
          )}
        </div>
        {member.description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{member.description}</p>
        )}
      </CardContent>
    </Card>
  )
}

/* ─── Minimal Preset ─── */

function MinimalMember({ member }: { member: any }) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <TeeAvatarWithFallback
        skinUrl={member.skinName ? getDDNetSkinUrl(member.skinName) : undefined}
        bodyColor={member.skinColorBody}
        feetColor={member.skinColorFeet}
        useCustomColors={!!(member.skinColorBody || member.skinColorFeet)}
        size="sm"
      />
      <span className="font-medium text-sm">{member.name}</span>
      {member.title && (
        <Badge
          variant="outline"
          style={{ borderColor: `${member.titleColor || '#6b7280'}40`, color: member.titleColor || '#6b7280' }}
          className="text-[10px]"
        >
          {member.title}
        </Badge>
      )}
    </div>
  )
}

/* ─── Section Renderer ─── */

function TeamSection({ section }: { section: any }) {
  const members = section.members || []
  if (members.length === 0) return null

  return (
    <FadeIn className="space-y-4">
      <h2 className="text-xl font-bold">{section.sectionTitle}</h2>

      {section.preset === 'hero' && (
        <div className="space-y-6">
          {members.map((m: any, i: number) => (
            <HeroMember key={i} member={m} />
          ))}
        </div>
      )}

      {section.preset === 'spotlight' && (
        <StaggerContainer className="space-y-3">
          {members.map((m: any, i: number) => (
            <StaggerItem key={i}>
              <SpotlightMember member={m} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      {section.preset === 'card' && (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m: any, i: number) => (
            <StaggerItem key={i}>
              <CardMember member={m} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      {section.preset === 'minimal' && (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {members.map((m: any, i: number) => (
            <StaggerItem key={i}>
              <MinimalMember member={m} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </FadeIn>
  )
}

/* ─── Main Page ─── */

export default function AboutPage() {
  const t = useTranslations('about')
  const locale = useLocale()
  const { data, isLoading } = useSWR(`/api/globals/about-page?depth=0&locale=${locale}`, fetcher)

  return (
    <PageTransition className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8 sm:space-y-12">
      {/* Back link */}
      <Link
        href="/"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> {t('backToHome')}
      </Link>

      {/* Page Header */}
      <FadeIn className="text-center space-y-3">
        <h1 className="text-2xl sm:text-4xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {data?.projectDescription || t('defaultDescription')}
        </p>
      </FadeIn>

      {/* Free & Open */}
      <FadeIn delay={0.1}>
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="flex items-start gap-3 sm:gap-4 p-4 sm:p-6">
            <div className="p-2 sm:p-2.5 rounded-lg bg-green-500/10 text-green-500 shrink-0">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base sm:text-lg">{t('freeProject.title')}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t('freeProject.description')}</p>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Team Sections (from Payload) */}
      {!isLoading && data?.teamSections?.map((section: any, i: number) => (
        <TeamSection key={i} section={section} />
      ))}

      {/* Loading placeholder */}
      {isLoading && (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-6 w-40 bg-muted animate-pulse rounded" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-48 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Special Thanks */}
      {data?.specialThanks?.length > 0 && (
        <FadeIn className="space-y-4">
          <h2 className="text-xl font-bold">{t('specialThanks')}</h2>
          <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {data.specialThanks.map((person: any, i: number) => (
              <StaggerItem
                key={i}
                className="flex flex-col items-center gap-2 py-3"
              >
                <TeeAvatarWithFallback
                  skinUrl={person.skinName ? getDDNetSkinUrl(person.skinName) : undefined}
                  bodyColor={person.skinColorBody}
                  feetColor={person.skinColorFeet}
                  useCustomColors={!!(person.skinColorBody || person.skinColorFeet)}
                  size="md"
                />
                <span className="text-sm font-medium text-center">{person.name}</span>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </FadeIn>
      )}

      {/* Support Section */}
      {data?.supportSection?.enabled && (
        <FadeIn>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-start gap-3 sm:gap-4 p-4 sm:p-6">
              <div className="p-2 sm:p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                <Code2 className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-base sm:text-lg">
                  {data.supportSection.title || t('support.title')}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {data.supportSection.description || t('support.description')}
                </p>
                {data.supportSection.donationUrl && (
                  <a
                    href={data.supportSection.donationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-1"
                  >
                    <Heart className="h-3.5 w-3.5" /> {t('support.donate')}
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Contact */}
      {data?.contact?.enabled && (
        <FadeIn>
          <Card>
            <CardContent className="flex items-start gap-3 sm:gap-4 p-4 sm:p-6">
              <div className="p-2 sm:p-2.5 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-base sm:text-lg">
                  {data.contact.title || t('contact.title')}
                </h3>
                {data.contact.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground">{data.contact.description}</p>
                )}
                {data.contact.links?.length > 0 && (
                  <div className="flex flex-wrap gap-2 sm:gap-3 pt-1">
                    {data.contact.links.map((link: any, i: number) => {
                      const Icon = PLATFORM_ICONS[link.platform] || Globe
                      const platformLabel = link.platform.charAt(0).toUpperCase() + link.platform.slice(1)
                      return (
                        <a
                          key={i}
                          href={getLinkHref(link.platform, link.value)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-xs sm:text-sm"
                        >
                          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{platformLabel}:</span>
                          <span className="font-medium">{link.value}</span>
                        </a>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Footer nav */}
      <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground pt-4">
        <Link href="/terms" className="hover:text-foreground transition-colors">{t('links.terms')}</Link>
        <Link href="/privacy" className="hover:text-foreground transition-colors">{t('links.privacy')}</Link>
        <Link href="/rules" className="hover:text-foreground transition-colors">{t('links.rules')}</Link>
      </div>
    </PageTransition>
  )
}
