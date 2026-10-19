import { createElement } from 'react'
import { GitMerge } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getReviewStateIcon } from '@/components/github/review-state-presentation'
import { PullRequestIcon } from './WorktreeCardHelpers'
import type { WorktreeCardPrDisplay } from './worktree-card-pr-display'

export function getReviewLabel(review: WorktreeCardPrDisplay): 'MR' | 'PR' {
  return review.provider === 'gitlab' ? 'MR' : 'PR'
}

export function getProviderName(review: WorktreeCardPrDisplay): string {
  if (review.provider === 'gitlab') {
    return 'GitLab'
  }
  if (review.provider === 'bitbucket') {
    return 'Bitbucket'
  }
  if (review.provider === 'azure-devops') {
    return 'Azure DevOps'
  }
  if (review.provider === 'gitea') {
    return 'Gitea'
  }
  return 'GitHub'
}

// Why: checks only gate a review that is actually open; draft/closed/merged keep
// their state tone so the glyph agrees with its tooltip. Only a failure earns a
// hue — passing and pending checks are news the glyph already carries.
export function getReviewChecksTone(status: WorktreeCardPrDisplay['status']): string | null {
  if (status === 'failure') {
    return 'text-destructive'
  }
  // Why stronger ink, not a hue: a pending run (a manual gate, say) may be waiting on you,
  // and it has to stay distinguishable from a passing one, which inherits the quiet row.
  if (status === 'pending') {
    return 'text-foreground'
  }
  // Why success gets nothing: a passing run is the expected case, so it inherits the row.
  return null
}

function getCheckTone(review: WorktreeCardPrDisplay): string | null {
  if ((review.state && review.state !== 'open') || (!review.state && review.status === 'success')) {
    return null
  }
  return getReviewChecksTone(review.status)
}

// Why no hue: the lucide glyph already distinguishes open / merged / closed / draft,
// so review state rides on shape and weight instead of five competing colours.
function getStateTone(state: WorktreeCardPrDisplay['state']): string {
  if (state === 'open' || state === 'merged') {
    return 'text-muted-foreground'
  }
  if (state === 'closed' || state === 'draft') {
    return 'text-muted-foreground/60'
  }
  return 'text-muted-foreground opacity-70'
}

export function ReviewIcon({
  review,
  className,
  variant = 'provider'
}: {
  review: WorktreeCardPrDisplay
  className?: string
  variant?: 'provider' | 'generic'
}): React.JSX.Element {
  const providerIcon =
    variant === 'provider' && review.provider === 'gitlab' ? GitMerge : PullRequestIcon
  const Icon = getReviewStateIcon(review.state) ?? providerIcon
  return createElement(Icon, {
    className: cn(className, getCheckTone(review) ?? getStateTone(review.state))
  })
}
