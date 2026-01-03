import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import React from 'react'
import {
  Trophy,
  Users,
  Zap,
  Grid3x3,
  Target,
  Swords,
  Clock,
  ChevronRight,
  UserPlus,
  Server,
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
import Link from 'next/link'

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
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Grid3x3 className="size-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              {t('navigation.title')}
            </span>
          </div>
          <div className="flex gap-3 items-center">
            <LocaleSwitcher currentLocale={locale} />
            <ThemeToggleButton start="top-right" variant="circle-blur" />
            {user ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
                <Button asChild>
                  <a href={payloadConfig.routes.admin}>{t('navigation.adminPanel')}</a>
                </Button>
              </>
            ) : (
              <Button asChild variant="outline">
                <Link href={'/login'}>{t('navigation.login')}</Link>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <Badge className="mb-6 text-base px-4 py-1.5" variant="secondary">
              <Zap className="size-4" />
              {t('hero.badge')}
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-chart-2 to-chart-3 bg-clip-text text-transparent">
              {t('hero.title')}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">{t('hero.subtitle')}</p>
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
              {t('hero.description')}
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" asChild className="group">
                <a href="#bingo">
                  {t('hero.learnMore')}
                  <ChevronRight className="ml-1 transition-transform group-hover:translate-x-1" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href={payloadConfig.routes.admin}>{t('hero.startPlaying')}</a>
              </Button>
            </div>
          </div>

          {/* Bingo Preview Grid */}
          <div className="max-w-2xl mx-auto">
            <Card className="overflow-hidden border-primary/20 shadow-lg">
              <CardContent className="p-8">
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {Array.from({ length: 25 }).map((_, i) => {
                    const completed = [0, 6, 12, 18, 24].includes(i)
                    return (
                      <div
                        key={i}
                        className={`aspect-square rounded-xl border-2 transition-all hover:scale-105 cursor-pointer flex items-center justify-center text-xs font-mono ${
                          completed
                            ? 'bg-primary/20 border-primary shadow-sm'
                            : 'bg-card border-border hover:border-primary/50'
                        }`}
                      >
                        {completed ? <Trophy className="size-4 text-primary" /> : i + 1}
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Target className="size-4" />
                  <span>{t('preview.caption')}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Bingo Section */}
      <section id="bingo" className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">{t('howItWorks.title')}</h2>
            <p className="text-xl text-muted-foreground">{t('howItWorks.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="border-primary/20 hover:border-primary/40 transition-colors">
              <CardHeader>
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Grid3x3 className="size-6 text-primary" />
                </div>
                <CardTitle>{t('howItWorks.steps.chooseMode.title')}</CardTitle>
                <CardDescription>{t('howItWorks.steps.chooseMode.description')}</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-chart-2/20 hover:border-chart-2/40 transition-colors">
              <CardHeader>
                <div className="size-12 rounded-lg bg-chart-2/10 flex items-center justify-center mb-4">
                  <Target className="size-6 text-chart-2" />
                </div>
                <CardTitle>{t('howItWorks.steps.completeMaps.title')}</CardTitle>
                <CardDescription>{t('howItWorks.steps.completeMaps.description')}</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-chart-4/20 hover:border-chart-4/40 transition-colors">
              <CardHeader>
                <div className="size-12 rounded-lg bg-chart-4/10 flex items-center justify-center mb-4">
                  <Trophy className="size-6 text-chart-4" />
                </div>
                <CardTitle>{t('howItWorks.steps.getCombination.title')}</CardTitle>
                <CardDescription>
                  {t('howItWorks.steps.getCombination.description')}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Bingo Types */}
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="size-5 text-primary" />
                  {t('modes.solo.title')}
                </CardTitle>
                <CardDescription>{t('modes.solo.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="size-5 text-primary shrink-0 mt-0.5" />
                    <span>{t('modes.solo.features.ownPace')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="size-5 text-primary shrink-0 mt-0.5" />
                    <span>{t('modes.solo.features.trackStats')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="size-5 text-primary shrink-0 mt-0.5" />
                    <span>{t('modes.solo.features.improveAchievements')}</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Swords className="size-5 text-chart-2" />
                  {t('modes.competitive.title')}
                </CardTitle>
                <CardDescription>{t('modes.competitive.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="size-5 text-chart-2 shrink-0 mt-0.5" />
                    <span>{t('modes.competitive.features.competeWithPlayers')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="size-5 text-chart-2 shrink-0 mt-0.5" />
                    <span>{t('modes.competitive.features.onlineProgress')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="size-5 text-chart-2 shrink-0 mt-0.5" />
                    <span>{t('modes.competitive.features.ratingSystem')}</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">{t('additionalFeatures.title')}</h2>
            <p className="text-xl text-muted-foreground">{t('additionalFeatures.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="border-primary/20">
              <CardHeader>
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="size-6 text-primary" />
                </div>
                <CardTitle>{t('additionalFeatures.onlineFriends.title')}</CardTitle>
                <CardDescription>
                  {t('additionalFeatures.onlineFriends.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-chart-2/20">
              <CardHeader>
                <div className="size-12 rounded-lg bg-chart-2/10 flex items-center justify-center mb-4">
                  <UserPlus className="size-6 text-chart-2" />
                </div>
                <CardTitle>{t('additionalFeatures.accountSystem.title')}</CardTitle>
                <CardDescription>
                  {t('additionalFeatures.accountSystem.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-chart-4/20 md:col-span-2">
              <CardHeader>
                <div className="size-12 rounded-lg bg-chart-4/10 flex items-center justify-center mb-4">
                  <Server className="size-6 text-chart-4" />
                </div>
                <CardTitle>{t('additionalFeatures.eventServers.title')}</CardTitle>
                <CardDescription>
                  {t('additionalFeatures.eventServers.description')}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-6 text-base px-4 py-1.5" variant="default">
            <Trophy className="size-4" />
            {t('cta.badge')}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">{t('cta.title')}</h2>
          <p className="text-xl text-muted-foreground mb-10">{t('cta.description')}</p>
          <Button size="lg" className="text-lg px-8" asChild>
            <a href={payloadConfig.routes.admin}>
              {t('cta.createAccount')}
              <ChevronRight className="ml-1" />
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Grid3x3 className="size-6 text-primary" />
              <span className="font-bold text-lg">{t('navigation.title')}</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                {t('footer.about')}
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                {t('footer.rules')}
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
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
          <div className="text-center text-sm text-muted-foreground mt-8">
            {t('footer.copyright')}
          </div>
        </div>
      </footer>
    </div>
  )
}
