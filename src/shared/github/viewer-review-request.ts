import type { ReviewSnapshotPullRequest } from './review-status-snapshot-types'

export type ViewerReviewRequest = {
  /** Epoch milliseconds of the newest request aimed at the viewer. */
  requestedAt: number
  /** The viewer had been asked on this pull request before, so the clock restarted. */
  isReRequest: boolean
}

/**
 * When the viewer was last asked to review `pr`, or null when nothing in the
 * timeline says they were asked.
 */
export function readViewerReviewRequest(
  pr: ReviewSnapshotPullRequest,
  viewerLogin: string | null
): ViewerReviewRequest | null {
  const viewer = viewerLogin?.toLowerCase() ?? null
  const events = pr.reviewRequestEvents ?? []
  if (!viewer || events.length === 0 || pr.author?.toLowerCase() === viewer) {
    return null
  }
  const mine = events.filter(
    (event) => event.reviewer.kind === 'user' && event.reviewer.login.toLowerCase() === viewer
  )
  // Why the team fallback: a request aimed at a team names the team, never the
  // member it reaches, so a viewer asked only through one has no event of their own.
  const asked = mine.length > 0 ? mine : events.filter((event) => event.reviewer.kind === 'team')
  if (asked.length === 0) {
    return null
  }
  return {
    requestedAt: Math.max(...asked.map((event) => event.requestedAt)),
    // Why the count and not the viewer's past reviews: reviewing uninvited and
    // being asked afterwards is a first request, not a second one.
    isReRequest: asked.length > 1
  }
}
