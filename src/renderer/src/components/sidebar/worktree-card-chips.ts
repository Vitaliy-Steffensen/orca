import { GitMerge, GitPullRequestArrow, ShieldAlert, XCircle } from 'lucide-react'
import type React from 'react'

import { translate } from '@/i18n/i18n'
import type { WorktreeCardProperty } from '../../../../shared/ui-chrome-types'
import { WORKTREE_CARD_PROPERTIES } from '../../../../shared/worktree/card-properties'
import type { WorktreeCardController } from './use-worktree-card-controller'

export type WorktreeCardChipTone = 'destructive' | 'warning' | 'muted'

export type WorktreeCardChip = {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  tooltip: string
  tone: WorktreeCardChipTone
}

type WorktreeCardChipSpec = {
  property: WorktreeCardProperty
  /** Returns null whenever the value is unremarkable; the rail renders exceptions only. */
  resolve: (card: WorktreeCardController) => WorktreeCardChip | null
}

/** Every chip the rail can show, in resolution order. */
const CHIP_SPECS: WorktreeCardChipSpec[] = [
  { property: 'blocker', resolve: resolveBlockerChip },
  { property: 'conflict', resolve: resolveConflictChip }
]

// Why: the canonical property order already encodes "most worth acting on first",
// so the rail reuses it instead of keeping a second ranking that can drift.
const PROPERTY_RANK = new Map<WorktreeCardProperty, number>(
  WORKTREE_CARD_PROPERTIES.map((property, index) => [property, index])
)

/** Chips that fit on the card; the rest are reachable from the details hover. */
export const WORKTREE_CARD_CHIP_LIMIT = 3

export function resolveWorktreeCardChips(card: WorktreeCardController): WorktreeCardChip[] {
  const resolved: { rank: number; chip: WorktreeCardChip }[] = []
  for (const spec of CHIP_SPECS) {
    if (!card.cardProps.includes(spec.property)) {
      continue
    }
    const chip = spec.resolve(card)
    if (chip) {
      resolved.push({ rank: PROPERTY_RANK.get(spec.property) ?? Number.MAX_SAFE_INTEGER, chip })
    }
  }
  return resolved.sort((a, b) => a.rank - b.rank).map((entry) => entry.chip)
}

function isConflicting(card: WorktreeCardController): boolean {
  // Why rebase is excluded: it is a transient local state source control already owns.
  const hasLocalConflict =
    !!card.conflictOperation &&
    card.conflictOperation !== 'unknown' &&
    card.conflictOperation !== 'rebase'
  const review = card.prDisplay
  const conflictingReview = !!review && 'mergeable' in review && review.mergeable === 'CONFLICTING'
  return hasLocalConflict || conflictingReview
}

function resolveConflictChip(card: WorktreeCardController): WorktreeCardChip | null {
  if (!isConflicting(card)) {
    return null
  }
  const label = translate('auto.components.sidebar.worktreeCardChips.conflict', 'Conflict')
  return {
    id: 'conflict',
    icon: GitMerge,
    label,
    tooltip: translate(
      'auto.components.sidebar.worktreeCardChips.conflictTooltip',
      'This branch conflicts with its base'
    ),
    tone: 'warning'
  }
}

function resolveBlockerChip(card: WorktreeCardController): WorktreeCardChip | null {
  const review = card.prDisplay
  if (review?.status === 'failure') {
    return {
      id: 'ci-failing',
      icon: XCircle,
      label: translate('auto.components.sidebar.worktreeCardChips.ciFailing', 'CI'),
      tooltip: translate(
        'auto.components.sidebar.worktreeCardChips.ciFailingTooltip',
        'Checks are failing'
      ),
      tone: 'destructive'
    }
  }
  if (isConflicting(card)) {
    // Why nothing here: the conflict chip says it better, and one card should not say it twice.
    return null
  }
  const commitsBehind =
    review && 'conflictSummary' in review ? (review.conflictSummary?.commitsBehind ?? 0) : 0
  if (commitsBehind > 0) {
    return {
      id: 'stale',
      icon: ShieldAlert,
      label: translate('auto.components.sidebar.worktreeCardChips.stale', '{{value0}} behind', {
        value0: String(commitsBehind)
      }),
      tooltip: translate(
        'auto.components.sidebar.worktreeCardChips.staleTooltip',
        'This branch is behind its base'
      ),
      tone: 'warning'
    }
  }
  if (review?.state === 'open') {
    return {
      id: 'awaiting-review',
      icon: GitPullRequestArrow,
      label: translate('auto.components.sidebar.worktreeCardChips.awaitingReview', 'In review'),
      tooltip: translate(
        'auto.components.sidebar.worktreeCardChips.awaitingReviewTooltip',
        'Open and waiting on reviewers'
      ),
      tone: 'muted'
    }
  }
  return null
}
