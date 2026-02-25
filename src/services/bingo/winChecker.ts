type WinCondition = 'line' | 'cross' | 'full_house'
type GridSize = '3x3' | '5x5' | '7x7'

interface WinCheckResult {
  hasWinner: boolean
  winningTeamIndex?: number
  winningCells?: number[]
  condition?: WinCondition
}

interface TeamCells {
  teamIndex: number
  completedCells: number[]
}

/**
 * Universal win checker for bingo
 * @param gridSize - Size of the grid (3x3, 5x5, 7x7)
 * @param winCondition - Type of win condition
 * @param teams - Array of team completed cells
 * @returns Win check result
 */
export function checkWinner(
  gridSize: GridSize,
  winCondition: WinCondition,
  teams: TeamCells[],
): WinCheckResult {
  const size = parseInt(gridSize.split('x')[0])

  for (const team of teams) {
    const cells = new Set(team.completedCells)

    switch (winCondition) {
      case 'line':
        const lineResult = checkLine(size, cells)
        if (lineResult.won) {
          return {
            hasWinner: true,
            winningTeamIndex: team.teamIndex,
            winningCells: lineResult.cells,
            condition: 'line',
          }
        }
        break

      case 'cross':
        const crossResult = checkCross(size, cells)
        if (crossResult.won) {
          return {
            hasWinner: true,
            winningTeamIndex: team.teamIndex,
            winningCells: crossResult.cells,
            condition: 'cross',
          }
        }
        break

      case 'full_house':
        const totalCells = size * size
        if (cells.size === totalCells) {
          return {
            hasWinner: true,
            winningTeamIndex: team.teamIndex,
            winningCells: Array.from(cells),
            condition: 'full_house',
          }
        }
        break
    }
  }

  return { hasWinner: false }
}

/**
 * Check for horizontal, vertical, or diagonal lines
 */
function checkLine(size: number, cells: Set<number>): { won: boolean; cells?: number[] } {
  // Check horizontal lines
  for (let row = 0; row < size; row++) {
    const rowCells: number[] = []
    let complete = true
    for (let col = 0; col < size; col++) {
      const pos = row * size + col
      rowCells.push(pos)
      if (!cells.has(pos)) {
        complete = false
        break
      }
    }
    if (complete) return { won: true, cells: rowCells }
  }

  // Check vertical lines
  for (let col = 0; col < size; col++) {
    const colCells: number[] = []
    let complete = true
    for (let row = 0; row < size; row++) {
      const pos = row * size + col
      colCells.push(pos)
      if (!cells.has(pos)) {
        complete = false
        break
      }
    }
    if (complete) return { won: true, cells: colCells }
  }

  // Check diagonal (top-left to bottom-right)
  const diag1: number[] = []
  let diag1Complete = true
  for (let i = 0; i < size; i++) {
    const pos = i * size + i
    diag1.push(pos)
    if (!cells.has(pos)) {
      diag1Complete = false
      break
    }
  }
  if (diag1Complete) return { won: true, cells: diag1 }

  // Check diagonal (top-right to bottom-left)
  const diag2: number[] = []
  let diag2Complete = true
  for (let i = 0; i < size; i++) {
    const pos = i * size + (size - 1 - i)
    diag2.push(pos)
    if (!cells.has(pos)) {
      diag2Complete = false
      break
    }
  }
  if (diag2Complete) return { won: true, cells: diag2 }

  return { won: false }
}

/**
 * Check for cross pattern — two independent win conditions:
 * 1. + cross: any complete row + any complete column
 * 2. X cross: both diagonals complete
 */
function checkCross(size: number, cells: Set<number>): { won: boolean; cells?: number[] } {
  // Check + pattern: any full row + any full column
  let winRow = -1
  for (let row = 0; row < size; row++) {
    let complete = true
    for (let col = 0; col < size; col++) {
      if (!cells.has(row * size + col)) { complete = false; break }
    }
    if (complete) { winRow = row; break }
  }

  if (winRow >= 0) {
    let winCol = -1
    for (let col = 0; col < size; col++) {
      let complete = true
      for (let row = 0; row < size; row++) {
        if (!cells.has(row * size + col)) { complete = false; break }
      }
      if (complete) { winCol = col; break }
    }

    if (winCol >= 0) {
      const winCells = new Set<number>()
      for (let col = 0; col < size; col++) winCells.add(winRow * size + col)
      for (let row = 0; row < size; row++) winCells.add(row * size + winCol)
      return { won: true, cells: Array.from(winCells).sort((a, b) => a - b) }
    }
  }

  // Check X pattern: both diagonals
  let diag1Ok = true
  let diag2Ok = true
  const xCells = new Set<number>()
  for (let i = 0; i < size; i++) {
    const p1 = i * size + i
    const p2 = i * size + (size - 1 - i)
    xCells.add(p1)
    xCells.add(p2)
    if (!cells.has(p1)) diag1Ok = false
    if (!cells.has(p2)) diag2Ok = false
  }

  if (diag1Ok && diag2Ok) {
    return { won: true, cells: Array.from(xCells).sort((a, b) => a - b) }
  }

  return { won: false }
}

/** Returns cells for a + pattern: given row + given column */
export function getPlusCrossCells(size: number, row: number, col: number): number[] {
  const cellSet = new Set<number>()
  for (let c = 0; c < size; c++) cellSet.add(row * size + c)
  for (let r = 0; r < size; r++) cellSet.add(r * size + col)
  return Array.from(cellSet).sort((a, b) => a - b)
}

/** Returns cells for the X pattern (both diagonals) */
export function getXCells(size: number): number[] {
  const cellSet = new Set<number>()
  for (let i = 0; i < size; i++) {
    cellSet.add(i * size + i)
    cellSet.add(i * size + (size - 1 - i))
  }
  return Array.from(cellSet).sort((a, b) => a - b)
}

/**
 * Helper to visualize grid for debugging
 */
export function visualizeGrid(
  size: number,
  team1Cells: number[],
  team2Cells: number[] = [],
): string {
  const team1Set = new Set(team1Cells)
  const team2Set = new Set(team2Cells)

  let grid = ''
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const pos = row * size + col
      if (team1Set.has(pos) && team2Set.has(pos)) {
        grid += '[X] ' // Both teams
      } else if (team1Set.has(pos)) {
        grid += '[1] '
      } else if (team2Set.has(pos)) {
        grid += '[2] '
      } else {
        grid += '[ ] '
      }
    }
    grid += '\n'
  }
  return grid
}

/**
 * Get all possible winning patterns for a given grid size and condition
 */
export function getWinningPatterns(gridSize: GridSize, winCondition: WinCondition): number[][] {
  const size = parseInt(gridSize.split('x')[0])
  const patterns: number[][] = []

  switch (winCondition) {
    case 'line':
      // Horizontal lines
      for (let row = 0; row < size; row++) {
        const line: number[] = []
        for (let col = 0; col < size; col++) {
          line.push(row * size + col)
        }
        patterns.push(line)
      }

      // Vertical lines
      for (let col = 0; col < size; col++) {
        const line: number[] = []
        for (let row = 0; row < size; row++) {
          line.push(row * size + col)
        }
        patterns.push(line)
      }

      // Diagonals
      const diag1: number[] = []
      const diag2: number[] = []
      for (let i = 0; i < size; i++) {
        diag1.push(i * size + i)
        diag2.push(i * size + (size - 1 - i))
      }
      patterns.push(diag1, diag2)
      break

    case 'cross':
      // + patterns: a few representative row+col combos
      patterns.push(getPlusCrossCells(size, 0, 0))
      if (size >= 3) {
        const center = Math.floor(size / 2)
        patterns.push(getPlusCrossCells(size, center, center))
        patterns.push(getPlusCrossCells(size, size - 1, 0))
      }
      // X pattern: both diagonals
      patterns.push(getXCells(size))
      break

    case 'full_house':
      const allCells: number[] = []
      for (let i = 0; i < size * size; i++) {
        allCells.push(i)
      }
      patterns.push(allCells)
      break
  }

  return patterns
}
