const SIZE_TOLERANCE_PX = 1
const DEFAULT_SHELF_HEIGHT_PX = 240

/**
 * The most a shelf opens to: the height the user last dragged it to, or until then half the
 * panel. A full-height shelf (Review, whose form is the point) opens to all of its content and
 * keeps growing with it until the user drags it.
 */
export function preferredShelfHeight({
  stored,
  groupHeight,
  fullHeightByDefault = false
}: {
  stored: number | null
  groupHeight: number
  fullHeightByDefault?: boolean
}): number {
  if (stored !== null) {
    return stored
  }
  return fullHeightByDefault
    ? Number.POSITIVE_INFINITY
    : Math.max(DEFAULT_SHELF_HEIGHT_PX, groupHeight / 2)
}

// Why only on content changes: a shelf the user dragged smaller than its list must keep that
// height, while one that showed its whole list follows it open (expand) and closed (collapse).
export function shelfResizeTarget({
  size,
  natural,
  previousNatural,
  preferred
}: {
  size: number
  natural: number
  previousNatural: number
  preferred: number
}): number | null {
  if (natural < size - SIZE_TOLERANCE_PX) {
    return natural
  }
  if (
    natural > previousNatural + SIZE_TOLERANCE_PX &&
    size >= previousNatural - SIZE_TOLERANCE_PX
  ) {
    return Math.min(natural, preferred)
  }
  return null
}
