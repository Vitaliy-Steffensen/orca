import React from 'react'
import { GitHubUserAvatar } from '@/components/github/github-user-avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import {
  useGitHubViewer,
  useGitHubViewerLookupSettled
} from '../pending-review/use-github-viewer'
import { usePullRequestAuthor } from '../workspace-status-rules/pr-author-store'

/**
 * The face to show for a pull request opened by someone else.
 * Returns null for the signed-in user, and until that login is known, so a
 * person's own workspaces never wear their face.
 */
export function otherPullRequestAuthor(
  author: string | null | undefined,
  viewerLogin: string | null | undefined,
  viewerSettled: boolean
): string | null {
  const login = author?.trim() ?? ''
  const viewer = viewerLogin?.trim() ?? ''
  if (!login || !viewerSettled || !viewer || login.toLowerCase() === viewer.toLowerCase()) {
    return null
  }
  return login
}

export function displayedPullRequestAuthor(
  prDisplay: { author?: string | null } | null | undefined
): string | null {
  const login = prDisplay?.author?.trim()
  return login ? login : null
}

export function WorktreeCardPrAuthor({
  worktreeId,
  enabled,
  authorLogin,
  className
}: {
  worktreeId: string
  enabled: boolean
  authorLogin?: string | null
  className?: string
}): React.JSX.Element | null {
  const storedAuthor = usePullRequestAuthor(worktreeId)
  const viewer = useGitHubViewer()
  const viewerSettled = useGitHubViewerLookupSettled()
  const login = otherPullRequestAuthor(authorLogin ?? storedAuthor, viewer?.login, viewerSettled)
  if (!enabled || !login) {
    return null
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex shrink-0', className)} data-worktree-card-pr-author="">
          <GitHubUserAvatar login={login} className="size-4" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {translate('auto.components.sidebar.WorktreeCard.prAuthor', 'Pull request by {{login}}', {
          login
        })}
      </TooltipContent>
    </Tooltip>
  )
}
