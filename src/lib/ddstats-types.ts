export interface DDStatsProfile {
  name: string
  points: number
  clan: string
  country: number
  skin_name: string
  skin_color_body: number | null
  skin_color_feet: number | null
  most_played_location: string
}

export interface DDStatsMapInfo {
  map: string
  server: string
  points: number
  stars: number
  mapper: string
  timestamp: string
}

export interface DDStatsPlayerData {
  profile: DDStatsProfile
  is_mapper: boolean

  points: {
    weekly_points: { points: number; rank: number }
    monthly_points: { points: number; rank: number }
    yearly_points: { points: number; rank: number }
    points: Record<string, { points: number; rank: number }>
    rank_points: Record<string, { points: number; rank: number } | null>
    team_points: Record<string, { points: number; rank: number } | null>
  }

  points_graph: Array<{
    date: string
    points: number
    rank_points: number
    team_points: number
  }>

  completion_progress: Array<{
    category: string
    maps_finished: number
    maps_total: number
  }>

  general_activity: {
    total_seconds_played: number
    start_of_playtime: string
    average_seconds_played: number
  }

  most_played_maps: Array<{
    map_name: string
    seconds_played: number
    map: DDStatsMapInfo
  }>

  most_played_categories: Array<{
    key: string
    seconds_played: number
  }>

  most_played_gametypes: Array<{
    key: string
    seconds_played: number
  }>

  most_played_locations: Array<{
    key: string
    seconds_played: number
  }>

  playtime_per_month: Array<{
    year_month: string
    month: string
    seconds_played: number
  }>

  recent_activity: Array<{
    name: string
    date: string
    map_name: string
    map: DDStatsMapInfo
    seconds_played: number
  }>

  recent_finishes: Array<{
    map: DDStatsMapInfo
    name: string
    time: number
    timestamp: string
    server: string
    rank: { rank: number; timestamp: string; name: string; time: number; map: string; server: string } | null
    team_rank: { rank: number; timestamp: string; players: string[]; time: number; map: string; server: string } | null
  }>

  finishes: Array<{
    map: DDStatsMapInfo
    name: string
    time: number
    timestamp: string
    server: string
    rank: number
    team_rank: number | null
    seconds_played: number
  }>

  unfinished_maps: Array<{
    map: DDStatsMapInfo
    finishes: number
    finishes_rank: number
    median_time: number
  }>

  favourite_teammates: Array<{
    name: string
    ranks_together: number
  }>

  recent_player_info: Array<{
    name: string
    clan: string
    country: number
    skin_name: string
    skin_color_body: number | null
    skin_color_feet: number | null
    last_seen: string
    seconds_played: number
  }>

  all_top_10s: Array<unknown>
  recent_top_10s: Array<unknown>
  favourite_rank1s_teammates: Array<unknown>
}
