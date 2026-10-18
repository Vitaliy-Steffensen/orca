import type { WorktreeCardProperty } from '../ui-chrome-types'

const FIXED_WORKTREE_CARD_PROPERTIES: WorktreeCardProperty[] = ['status', 'unread']

export const TASK_WORKTREE_CARD_PROPERTIES: WorktreeCardProperty[] = [
  'issue',
  'linear-issue',
  'jira-issue'
]

export const DEFAULT_WORKTREE_CARD_PROPERTIES: WorktreeCardProperty[] = [
  ...FIXED_WORKTREE_CARD_PROPERTIES,
  'blocker',
  'conflict',
  ...TASK_WORKTREE_CARD_PROPERTIES,
  'pr',
  'pr-author',
  'diff',
  'diff-mix',
  'linear-priority',
  'stack',
  'unresolved-comments',
  'pr-open-age',
  'automation',
  'cli',
  'comment',
  'ports',
  'run',
  // Why: agent activity is the primary reason users opt into the feature, so it
  // stays inline on each card by default.
  'inline-agents',
  'host'
]

// Why: the retired Compact layout defaulted to this near-empty preset. A profile
// still sitting on it is migrated to the defaults rather than left with a card
// that shows nothing; an explicitly chosen property set is preserved as-is.
const RETIRED_COMPACT_PRESETS: readonly WorktreeCardProperty[][] = [
  ['status'],
  ['status', 'unread'],
  ['status', 'automation'],
  ['status', 'unread', 'automation']
]

/** Every card property, in canonical render order. Client schemas derive their
 *  accepted value domain from this so a new property cannot drift out of them.
 *  The chip rail also resolves its priority from this order. */
export const WORKTREE_CARD_PROPERTIES = [
  'status',
  'unread',
  'blocker',
  'conflict',
  'ci',
  'branch',
  'issue',
  'linear-issue',
  'linear-title',
  'jira-issue',
  'pr',
  'pr-author',
  'diff',
  'diff-mix',
  'linear-priority',
  'stack',
  'unresolved-comments',
  'pr-open-age',
  'automation',
  'cli',
  'comment',
  'ports',
  'run',
  'inline-agents',
  'host'
] as const satisfies readonly WorktreeCardProperty[]

export function normalizeWorktreeCardProperties(
  properties: readonly unknown[] | null | undefined
): WorktreeCardProperty[] {
  const normalized: WorktreeCardProperty[] = [...FIXED_WORKTREE_CARD_PROPERTIES]
  const source = properties ?? DEFAULT_WORKTREE_CARD_PROPERTIES
  for (const property of WORKTREE_CARD_PROPERTIES) {
    if (source.includes(property) && !normalized.includes(property)) {
      normalized.push(property)
    }
  }
  return normalized
}

export function isRetiredCompactWorktreeCardProperties(
  properties: readonly unknown[] | null | undefined
): boolean {
  return RETIRED_COMPACT_PRESETS.some(
    (preset) =>
      properties?.length === preset.length &&
      preset.every((property, index) => properties[index] === property)
  )
}
