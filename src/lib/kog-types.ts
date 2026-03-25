export interface KoGSkin {
  name: string
  colorBody: number
  colorFeet: number
}

export interface KoGTeammate {
  name: string
  mapsCount: number
}

export interface KoGCategoryProgress {
  category: string
  mapsFinished: number
  mapsTotal: number
}

export interface KoGFinishedMap {
  name: string
  bestTime: string
  finishes: number
  lastFinishDate: string
}

export interface KoGPlayerData {
  name: string
  rank: number | null
  totalPoints: number
  fixedPoints: number
  seasonPoints: number
  skin: KoGSkin | null
  wastedTimeSeconds: number
  teammates: KoGTeammate[]
  categoryProgress: KoGCategoryProgress[]
  finishedMaps: KoGFinishedMap[]
  unfinishedMaps: string[]
}
