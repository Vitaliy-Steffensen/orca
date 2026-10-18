import type { PendingReviewDraftChange } from '../../shared/github/pending-review-comment'

/**
 * The device-local review queue, as reachable from code that must not import Electron.
 *
 * Why a registration rather than a direct read: the queue is a file under `userData` and the
 * renderer that shows it is the one holding it in memory, both of which only the desktop main
 * process knows about. The runtime's RPC methods boot on plain Node and cannot ask Electron for
 * either, so the desktop registers this on startup and a host without a reviewer registers nothing.
 */
export type PendingReviewDraftSurface = {
  /** The queue file on this device. */
  file: () => string
  /** Tells the renderer holding the queue that it changed on disk, so the shelf shows it at once. */
  announceChange: (change: PendingReviewDraftChange) => void
}

let current: PendingReviewDraftSurface | null = null

export function setPendingReviewDraftSurface(surface: PendingReviewDraftSurface | null): void {
  current = surface
}

export function getPendingReviewDraftSurface(): PendingReviewDraftSurface | null {
  return current
}
