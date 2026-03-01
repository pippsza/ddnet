import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import React from 'react'
import {
  Trophy,
  Zap,
  Grid3x3,
  Target,
  Swords,
  Clock,
  ChevronRight,
  Route,
  Eye,
  LayoutDashboard,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import config from '@/payload.config'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { getUserLocale } from '@/services/locale'
import './globals.css'
import { ThemeToggleButton } from '@/components/theme/theme-toggle'
import { DevQuickLogin } from '@/components/auth/DevQuickLogin'
import Link from 'next/link'
import { BingoDemo } from '@/components/bingo/BingoDemo'
import { RaceDemo } from '@/components/race/RaceDemo'
import { PeekingTee } from '@/components/tee/PeekingTee'
import { FadeIn, ScaleIn } from '@/components/ui/animations'

export async function generateMetadata() {
  const t = await getTranslations('home')
  return {
    title: t('hero.title'),
    description: t('hero.description'),
  }
}

export default async function HomePage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })
  const t = await getTranslations('home')
  const locale = await getUserLocale()

  return (
    <div className="min-h-screen text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Grid3x3 className="size-7 sm:size-8 text-primary" />
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              {t('navigation.title')}
            </span>
          </div>
          <div className="flex gap-2 sm:gap-3 items-center">
            <LocaleSwitcher currentLocale={locale} />
            <ThemeToggleButton start="top-right" variant="circle-blur" />
            {user ? (
              <Button asChild size="icon">
                <Link href="/app/dashboard">
                  <LayoutDashboard className="size-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/login">{t('navigation.login')}</Link>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 overflow-hidden">
        <PeekingTee skinName="default" side="left" verticalPosition="45%" size="xl" />
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto mb-12 sm:mb-16">
            <FadeIn delay={0.1}>
              <Badge className="mb-4 sm:mb-6 text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-1.5" variant="secondary">
                <Zap className="size-4" />
                {t('hero.badge')}
              </Badge>
            </FadeIn>
            <FadeIn delay={0.2}>
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-primary via-chart-2 to-chart-3 bg-clip-text text-transparent">
                {t('hero.title')}
              </h1>
            </FadeIn>
            <FadeIn delay={0.3}>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-6 sm:mb-8">
                {t('hero.subtitle')}
              </p>
            </FadeIn>
            <FadeIn delay={0.4}>
              <p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-12 max-w-2xl mx-auto">
                {t('hero.description')}
              </p>
            </FadeIn>
            <FadeIn delay={0.5}>
              <div className="flex gap-3 sm:gap-4 justify-center flex-wrap">
                <Button size="lg" asChild className="group">
                  <a href="#bingo">
                    {t('hero.learnMore')}
                    <ChevronRight className="ml-1 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/login">{t('hero.startPlaying')}</Link>
                </Button>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Bingo Demo Section */}
      <section id="bingo" className="py-16 sm:py-20 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-10 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
                {t('howItWorks.title')}
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground">{t('howItWorks.subtitle')}</p>
            </div>
          </FadeIn>

          {/* How It Works Steps */}
          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-12">
            <FadeIn delay={0.1}>
              <Card className="border-primary/20 hover:border-primary/40 transition-colors h-full">
                <CardHeader>
                  <div className="size-10 sm:size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                    <Grid3x3 className="size-5 sm:size-6 text-primary" />
                  </div>
                  <CardTitle className="text-base sm:text-lg">{t('howItWorks.steps.chooseMode.title')}</CardTitle>
                  <CardDescription>{t('howItWorks.steps.chooseMode.description')}</CardDescription>
                </CardHeader>
              </Card>
            </FadeIn>

            <FadeIn delay={0.2}>
              <Card className="border-chart-2/20 hover:border-chart-2/40 transition-colors h-full">
                <CardHeader>
                  <div className="size-10 sm:size-12 rounded-lg bg-chart-2/10 flex items-center justify-center mb-3 sm:mb-4">
                    <Target className="size-5 sm:size-6 text-chart-2" />
                  </div>
                  <CardTitle className="text-base sm:text-lg">{t('howItWorks.steps.completeMaps.title')}</CardTitle>
                  <CardDescription>{t('howItWorks.steps.completeMaps.description')}</CardDescription>
                </CardHeader>
              </Card>
            </FadeIn>

            <FadeIn delay={0.3}>
              <Card className="border-chart-4/20 hover:border-chart-4/40 transition-colors h-full">
                <CardHeader>
                  <div className="size-10 sm:size-12 rounded-lg bg-chart-4/10 flex items-center justify-center mb-3 sm:mb-4">
                    <Trophy className="size-5 sm:size-6 text-chart-4" />
                  </div>
                  <CardTitle className="text-base sm:text-lg">{t('howItWorks.steps.getCombination.title')}</CardTitle>
                  <CardDescription>{t('howItWorks.steps.getCombination.description')}</CardDescription>
                </CardHeader>
              </Card>
            </FadeIn>
          </div>

          {/* Bingo Demo */}
          <ScaleIn>
            <div className="max-w-sm sm:max-w-md mx-auto">
              <Card className="overflow-hidden border-primary/20 shadow-lg">
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <BingoDemo />
                  <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4">
                    <Target className="size-3.5 sm:size-4" />
                    <span>{t('preview.caption')}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScaleIn>

          {/* Bingo Types */}
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8 mt-10 sm:mt-12">
            <FadeIn direction="left" delay={0.1}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="size-5 text-primary" />
                    {t('modes.solo.title')}
                  </CardTitle>
                  <CardDescription>{t('modes.solo.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 sm:space-y-3">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="size-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm sm:text-base">{t('modes.solo.features.ownPace')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="size-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm sm:text-base">{t('modes.solo.features.trackStats')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="size-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm sm:text-base">{t('modes.solo.features.improveAchievements')}</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </FadeIn>

            <FadeIn direction="right" delay={0.2}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Swords className="size-5 text-chart-2" />
                    {t('modes.competitive.title')}
                  </CardTitle>
                  <CardDescription>{t('modes.competitive.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 sm:space-y-3">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="size-5 text-chart-2 shrink-0 mt-0.5" />
                      <span className="text-sm sm:text-base">{t('modes.competitive.features.competeWithPlayers')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="size-5 text-chart-2 shrink-0 mt-0.5" />
                      <span className="text-sm sm:text-base">{t('modes.competitive.features.onlineProgress')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="size-5 text-chart-2 shrink-0 mt-0.5" />
                      <span className="text-sm sm:text-base">{t('modes.competitive.features.ratingSystem')}</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Race Demo Section */}
      <section className="relative py-16 sm:py-20 px-4 sm:px-6 overflow-hidden">
        <PeekingTee skinName="brownbear" side="right" verticalPosition="35%" size="xl" />
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
                {t('raceMode.title')}
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground">{t('raceMode.subtitle')}</p>
            </div>
          </FadeIn>

          <ScaleIn>
            <div className="max-w-2xl mx-auto">
              <Card className="overflow-hidden border-chart-2/20 shadow-lg">
                <CardContent className="p-4 sm:p-6">
                  <RaceDemo />
                </CardContent>
              </Card>
            </div>
          </ScaleIn>

          <FadeIn delay={0.2}>
            <p className="text-center text-base sm:text-lg text-muted-foreground mt-6 sm:mt-8 max-w-2xl mx-auto">
              {t('raceMode.description')}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Game Modes Overview */}
      <section className="relative py-16 sm:py-20 px-4 sm:px-6 bg-muted/30 overflow-hidden">
        <PeekingTee skinName="coala" side="left" verticalPosition="40%" />
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-10 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
                {t('features.title')}
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground">{t('features.subtitle')}</p>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 max-w-3xl mx-auto">
            <FadeIn direction="left" delay={0.1}>
              <Card className="border-primary/20 hover:border-primary/40 transition-colors h-full">
                <CardHeader>
                  <div className="size-10 sm:size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                    <Grid3x3 className="size-5 sm:size-6 text-primary" />
                  </div>
                  <CardTitle className="text-base sm:text-lg">{t('features.bingo.title')}</CardTitle>
                  <CardDescription>{t('features.bingo.description')}</CardDescription>
                </CardHeader>
              </Card>
            </FadeIn>

            <FadeIn direction="right" delay={0.2}>
              <Card className="border-chart-2/20 hover:border-chart-2/40 transition-colors h-full">
                <CardHeader>
                  <div className="size-10 sm:size-12 rounded-lg bg-chart-2/10 flex items-center justify-center mb-3 sm:mb-4">
                    <Route className="size-5 sm:size-6 text-chart-2" />
                  </div>
                  <CardTitle className="text-base sm:text-lg">{t('features.race.title')}</CardTitle>
                  <CardDescription>{t('features.race.description')}</CardDescription>
                </CardHeader>
              </Card>
            </FadeIn>
          </div>

          {/* Friends Monitoring */}
          <FadeIn delay={0.3}>
            <div className="max-w-3xl mx-auto mt-8 sm:mt-10">
              <Card className="border-chart-4/20 hover:border-chart-4/40 transition-colors">
                <CardHeader className="flex flex-row items-start gap-4">
                  <div className="size-10 sm:size-12 rounded-lg bg-chart-4/10 flex items-center justify-center shrink-0">
                    <Eye className="size-5 sm:size-6 text-chart-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg">{t('features.friends.title')}</CardTitle>
                    <CardDescription className="mt-1">{t('features.friends.description')}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-b from-muted/30 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <FadeIn>
            <Badge className="mb-4 sm:mb-6 text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-1.5" variant="default">
              <Trophy className="size-4" />
              {t('cta.badge')}
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">{t('cta.title')}</h2>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 sm:mb-10">{t('cta.description')}</p>
          </FadeIn>
          <ScaleIn>
            <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8" asChild>
              <Link href="/login">
                {t('cta.createAccount')}
                <ChevronRight className="ml-1" />
              </Link>
            </Button>
          </ScaleIn>
        </div>
      </section>

      {/* Footer */}
      <FadeIn>
      <footer className="py-8 sm:py-12 px-4 sm:px-6 border-t bg-background/60">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <Grid3x3 className="size-6 text-primary" />
              <span className="font-bold text-lg">{t('navigation.title')}</span>
            </div>
            <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
              <a href="/about" className="hover:text-foreground transition-colors">
                {t('footer.about')}
              </a>
              <a href="/rules" className="hover:text-foreground transition-colors">
                {t('footer.rules')}
              </a>
              <a href="/support" className="hover:text-foreground transition-colors">
                {t('footer.support')}
              </a>
              <a
                href="https://ddnet.org"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                DDNet.org
              </a>
            </div>
          </div>
          <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-4 sm:mt-6">
            <a href="/terms" className="hover:text-foreground transition-colors">
              {t('footer.terms')}
            </a>
            <span>&middot;</span>
            <a href="/privacy" className="hover:text-foreground transition-colors">
              {t('footer.privacy')}
            </a>
          </div>
          <div className="text-center text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4">
            {t('footer.copyright')}
          </div>
        </div>
      </footer>
      </FadeIn>
      <DevQuickLogin />
    </div>
  )
}
