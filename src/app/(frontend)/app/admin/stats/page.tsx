'use client'

import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import {
  Users,
  Gamepad2,
  FileText,
  MessageSquare,
  LifeBuoy,
  Activity,
  BarChart3,
  Eye,
  Heart,
  Shield,
  Bell,
  HardDrive,
  UserCheck,
  Send,
} from 'lucide-react'
import type { ReactNode } from 'react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#ec4899',
]

function ChartTooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: entry.color || entry.payload?.fill }}
          />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="font-mono font-medium text-foreground ml-auto">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  description,
}: {
  label: string
  value: number | string
  icon: ReactNode
  description?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary">{icon}</div>
          <div className="min-w-0">
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            {description && <p className="text-[10px] text-muted-foreground/70">{description}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MiniPieChart({ data, title }: { data: { name: string; value: number }[]; title: string }) {
  const filtered = data.filter((d) => d.value > 0)
  if (filtered.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">No data</p>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={filtered}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
            >
              {filtered.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-3 mt-2 justify-center">
          {filtered.map((entry, i) => (
            <div key={entry.name} className="flex items-center gap-1.5 text-xs">
              <span
                className="h-2.5 w-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-muted-foreground">
                {entry.name} ({entry.value})
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function MiniBarChart({ data, title }: { data: { name: string; value: number }[]; title: string }) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">No data</p>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ── Tab Components ──

function OverviewTab({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Users" value={data.users.total} icon={<Users className="h-5 w-5" />} />
        <StatCard
          label="Games"
          value={data.games.bingo.total + data.games.races.total}
          icon={<Gamepad2 className="h-5 w-5" />}
        />
        <StatCard
          label="Articles"
          value={data.content.articles.total}
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          label="Forum Posts"
          value={data.content.forumPosts.total}
          icon={<MessageSquare className="h-5 w-5" />}
        />
        <StatCard
          label="Support Tickets"
          value={data.support.total}
          icon={<LifeBuoy className="h-5 w-5" />}
        />
        <StatCard
          label="Messages"
          value={data.social.messages}
          icon={<Send className="h-5 w-5" />}
        />
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Activity (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.games.timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => v.slice(5)}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="users"
                name="Registrations"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="bingo"
                name="Bingo Games"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="races"
                name="Races"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MiniPieChart
          title="Bingo by Status"
          data={Object.entries(data.games.bingo.byStatus).map(([name, value]) => ({
            name,
            value: value as number,
          }))}
        />
        <MiniPieChart
          title="Races by Status"
          data={Object.entries(data.games.races.byStatus).map(([name, value]) => ({
            name,
            value: value as number,
          }))}
        />
      </div>
    </div>
  )
}

function UsersTab({ data }: { data: any }) {
  const u = data.users
  const verifiedPct = u.total > 0 ? Math.round((u.verified / u.total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Users" value={u.total} icon={<Users className="h-5 w-5" />} />
        <StatCard
          label="Verified"
          value={`${u.verified} (${verifiedPct}%)`}
          icon={<Shield className="h-5 w-5" />}
        />
        <StatCard
          label="Unverified"
          value={u.unverified}
          icon={<UserCheck className="h-5 w-5" />}
        />
        <StatCard
          label="Recent (30d)"
          value={u.recentRegistrations.reduce((s: number, r: any) => s + r.count, 0)}
          icon={<Activity className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MiniPieChart
          title="By Role"
          data={Object.entries(u.byRole).map(([name, value]) => ({
            name,
            value: value as number,
          }))}
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Registrations (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={u.recentRegistrations}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v) => v.slice(8)}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" name="Registrations" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function GamesTab({ data }: { data: any }) {
  const g = data.games
  const activeGames =
    (g.bingo.byStatus.waiting || 0) +
    (g.bingo.byStatus.in_progress || 0) +
    (g.races.byStatus.in_progress || 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Bingo Games"
          value={g.bingo.total}
          icon={<Gamepad2 className="h-5 w-5" />}
        />
        <StatCard label="Races" value={g.races.total} icon={<Gamepad2 className="h-5 w-5" />} />
        <StatCard label="Active Now" value={activeGames} icon={<Activity className="h-5 w-5" />} />
        <StatCard
          label="Completed"
          value={(g.bingo.byStatus.completed || 0) + (g.races.byStatus.completed || 0)}
          icon={<Shield className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MiniPieChart
          title="Bingo by Status"
          data={Object.entries(g.bingo.byStatus).map(([name, value]) => ({
            name,
            value: value as number,
          }))}
        />
        <MiniPieChart
          title="Bingo by Mode"
          data={Object.entries(g.bingo.byMode).map(([name, value]) => ({
            name,
            value: value as number,
          }))}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Games Timeline (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={g.timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => v.slice(5)}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="bingo"
                name="Bingo"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="races"
                name="Races"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function ContentTab({ data }: { data: any }) {
  const a = data.content.articles
  const f = data.content.forumPosts

  return (
    <div className="space-y-6">
      {/* Articles */}
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Articles
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={a.total} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Published" value={a.published} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Total Views" value={a.totalViews} icon={<Eye className="h-5 w-5" />} />
        <StatCard label="Total Likes" value={a.totalLikes} icon={<Heart className="h-5 w-5" />} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MiniPieChart
          title="Articles: Published vs Draft"
          data={[
            { name: 'Published', value: a.published },
            { name: 'Draft', value: a.draft },
          ]}
        />
        <MiniBarChart
          title="Articles by Category"
          data={Object.entries(a.byCategory).map(([name, value]) => ({
            name,
            value: value as number,
          }))}
        />
      </div>

      {/* Forum */}
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Forum</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          label="Total Posts"
          value={f.total}
          icon={<MessageSquare className="h-5 w-5" />}
        />
        <StatCard label="Total Views" value={f.totalViews} icon={<Eye className="h-5 w-5" />} />
        <StatCard
          label="Total Replies"
          value={f.totalReplies}
          icon={<MessageSquare className="h-5 w-5" />}
        />
      </div>
      <MiniBarChart
        title="Forum by Category"
        data={Object.entries(f.byCategory).map(([name, value]) => ({
          name,
          value: value as number,
        }))}
      />
    </div>
  )
}

function SocialTab({ data }: { data: any }) {
  const s = data.social

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Friendships"
          value={s.friendRequests.accepted}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Pending Requests"
          value={s.friendRequests.pending}
          icon={<UserCheck className="h-5 w-5" />}
        />
        <StatCard
          label="Conversations"
          value={s.conversations}
          icon={<MessageSquare className="h-5 w-5" />}
        />
        <StatCard label="Messages" value={s.messages} icon={<Send className="h-5 w-5" />} />
      </div>

      <MiniPieChart
        title="Friend Requests by Status"
        data={[
          { name: 'Pending', value: s.friendRequests.pending },
          { name: 'Accepted', value: s.friendRequests.accepted },
          { name: 'Rejected', value: s.friendRequests.rejected },
        ]}
      />
    </div>
  )
}

function SupportSystemTab({ data }: { data: any }) {
  const s = data.support
  const sys = data.system

  return (
    <div className="space-y-6">
      {/* Support */}
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Support
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Tickets" value={s.total} icon={<LifeBuoy className="h-5 w-5" />} />
        <StatCard label="Open" value={s.byStatus.open} icon={<LifeBuoy className="h-5 w-5" />} />
        <StatCard
          label="In Progress"
          value={s.byStatus.in_progress}
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          label="Resolved"
          value={s.byStatus.resolved}
          icon={<Shield className="h-5 w-5" />}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MiniPieChart
          title="Tickets by Status"
          data={Object.entries(s.byStatus).map(([name, value]) => ({
            name,
            value: value as number,
          }))}
        />
        <MiniBarChart
          title="Tickets by Priority"
          data={Object.entries(s.byPriority).map(([name, value]) => ({
            name,
            value: value as number,
          }))}
        />
      </div>

      {/* System */}
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        System
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Notifications"
          value={sys.notifications.total}
          icon={<Bell className="h-5 w-5" />}
        />
        <StatCard
          label="Unread"
          value={sys.notifications.unread}
          icon={<Bell className="h-5 w-5" />}
        />
        <StatCard
          label="Push Subs"
          value={sys.pushSubscriptions}
          icon={<Send className="h-5 w-5" />}
        />
        <StatCard
          label="Verifications"
          value={sys.verificationRequests.total}
          icon={<Shield className="h-5 w-5" />}
        />
        <StatCard label="Media Files" value={sys.media} icon={<HardDrive className="h-5 w-5" />} />
        <StatCard
          label="Bots Running"
          value={sys.bots.running}
          icon={<Activity className="h-5 w-5" />}
        />
      </div>

      <MiniPieChart
        title="Verification Requests"
        data={[
          { name: 'Pending', value: sys.verificationRequests.pending },
          { name: 'Success', value: sys.verificationRequests.success },
          { name: 'Failed', value: sys.verificationRequests.failed },
        ]}
      />
    </div>
  )
}

// ── Main Page ──

export default function AnalyticsPage() {
  const { data, isLoading } = useSWR('/api/admin/analytics', fetcher, {
    refreshInterval: 30000,
  })

  if (isLoading || !data || data.error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <Tabs defaultValue="overview">
        <TabsList className="w-full h-fit gap-1 flex-wrap">
          <TabsTrigger value="overview" className="flex-1">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="flex-1">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Users
          </TabsTrigger>
          <TabsTrigger value="games" className="flex-1">
            <Gamepad2 className="h-3.5 w-3.5 mr-1.5" />
            Games
          </TabsTrigger>
          <TabsTrigger value="content" className="flex-1">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Content
          </TabsTrigger>
          <TabsTrigger value="social" className="flex-1">
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            Social
          </TabsTrigger>
          <TabsTrigger value="support" className="flex-1">
            <LifeBuoy className="h-3.5 w-3.5 mr-1.5" />
            Support
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab data={data} />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab data={data} />
        </TabsContent>
        <TabsContent value="games">
          <GamesTab data={data} />
        </TabsContent>
        <TabsContent value="content">
          <ContentTab data={data} />
        </TabsContent>
        <TabsContent value="social">
          <SocialTab data={data} />
        </TabsContent>
        <TabsContent value="support">
          <SupportSystemTab data={data} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
