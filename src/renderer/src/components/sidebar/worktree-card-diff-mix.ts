import type { DiffAreaTotals } from '../../../../shared/diff-area'

// Why an opacity ramp and not four hues: these are four slices of one quantity, and the
// git-decoration tokens they used to borrow mean git status, not categories (STYLEGUIDE.md).
const AREA_COLOR: Record<keyof DiffAreaTotals, string> = {
  fe: 'color-mix(in srgb, var(--foreground) 70%, var(--background))',
  be: 'color-mix(in srgb, var(--foreground) 50%, var(--background))',
  e2e: 'color-mix(in srgb, var(--foreground) 32%, var(--background))',
  ci: 'color-mix(in srgb, var(--foreground) 16%, var(--background))'
}

const AREA_ORDER: (keyof DiffAreaTotals)[] = ['fe', 'be', 'e2e', 'ci']

export function diffAreaTotal(areas: DiffAreaTotals): number {
  return areas.fe + areas.be + areas.e2e + areas.ci
}

/** A pie built from the four area colors. A single area paints the whole circle. */
export function diffMixConicGradient(areas: DiffAreaTotals): string {
  const total = diffAreaTotal(areas)
  if (total <= 0) {
    return 'transparent'
  }
  let cursor = 0
  const stops: string[] = []
  for (const area of AREA_ORDER) {
    const value = areas[area]
    if (value <= 0) {
      continue
    }
    const start = (cursor / total) * 100
    cursor += value
    const end = (cursor / total) * 100
    stops.push(`${AREA_COLOR[area]} ${start}% ${end}%`)
  }
  return `conic-gradient(${stops.join(', ')})`
}
