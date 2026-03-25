export interface CameraPoint {
  progress: number
  x: number
  y: number
}

export interface MapStop {
  id: string
  progress: number
  camera: { x: number; y: number }
  /** Section position (absolute). Omit if this stop is a scenic waypoint only. */
  section?: { x: number; y: number; width?: number }
  /** Navbar label. Omit to exclude from navbar. */
  navLabel?: string
}
