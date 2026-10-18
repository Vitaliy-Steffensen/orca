const DAY_MS = 24 * 60 * 60 * 1000

/** The sidebar only marks a pull request once it has been open longer than this. */
export const PR_OPEN_AGE_THRESHOLD_DAYS = 3

/**
 * Whole days a pull request has been open, once that is longer than
 * {@link PR_OPEN_AGE_THRESHOLD_DAYS}. Closed and merged reviews stay quiet.
 */
export function pullRequestOpenAgeDays(
  createdAt: string | undefined,
  state: string | undefined,
  now = Date.now()
): number | null {
  if (state !== 'open' && state !== 'draft') {
    return null
  }
  if (!createdAt) {
    return null
  }
  const created = Date.parse(createdAt)
  if (!Number.isFinite(created)) {
    return null
  }
  const elapsed = now - created
  if (elapsed <= PR_OPEN_AGE_THRESHOLD_DAYS * DAY_MS) {
    return null
  }
  return Math.floor(elapsed / DAY_MS)
}
