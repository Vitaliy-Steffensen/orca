import { parseGitHubIssueOrPRLink, type GitHubIssueOrPRLink } from '../../../shared/github/links'
import {
  linearIssueIntentFromReview,
  parseLinearIssueUrlIntent,
  parseLinearReviewUrlIntent,
  type LinearIssueUrlIntent,
  type LinearReviewUrlIntent
} from '../../../shared/linear/links'
import type { Repo } from '../../../shared/repo-types'
import { getWorkspaceAttachments } from '../../../shared/workspace-attachments'
import type { Worktree } from '../../../shared/worktree/types'
import {
  matchWorktreePaletteTaskUrl,
  type CmdJTaskSourceUrl
} from './worktree-palette-task-url-match'

const URL_IN_TEXT = /https?:\/\/[^\s<>"'`]+/gi

export type WorkspacePromptTaskLink =
  | { kind: 'github'; url: string; link: GitHubIssueOrPRLink }
  | { kind: 'linear'; url: string; intent: LinearIssueUrlIntent }
  | {
      kind: 'linear-review'
      url: string
      intent: LinearReviewUrlIntent
      /** Present when the review slug embeds a Linear issue key such as ENG-123. */
      issue: LinearIssueUrlIntent | null
    }

function trimTrailingUrlPunctuation(value: string): string {
  return value.replace(/[),.;!?]+$/g, '')
}

/** The first GitHub issue/PR, Linear issue, or Linear review URL in a prompt. */
export function extractWorkspacePromptTaskLink(prompt: string): WorkspacePromptTaskLink | null {
  const matches = prompt.match(URL_IN_TEXT)
  if (!matches) {
    return null
  }
  for (const raw of matches) {
    const url = trimTrailingUrlPunctuation(raw)
    const linear = parseLinearIssueUrlIntent(url)
    if (linear) {
      return { kind: 'linear', url, intent: linear }
    }
    const review = parseLinearReviewUrlIntent(url)
    if (review) {
      return {
        kind: 'linear-review',
        url,
        intent: review,
        issue: linearIssueIntentFromReview(review)
      }
    }
    const github = parseGitHubIssueOrPRLink(url)
    if (github) {
      return { kind: 'github', url, link: github }
    }
  }
  return null
}

export function workspacePromptTaskLinkKey(link: WorkspacePromptTaskLink): string {
  if (link.kind === 'github') {
    return `github:${link.link.slug.host ?? 'github.com'}/${link.link.slug.owner}/${link.link.slug.repo}#${link.link.number}`
  }
  if (link.kind === 'linear') {
    return `linear:${link.intent.organizationUrlKey}/${link.intent.identifier}`
  }
  return `linear-review:${link.intent.organizationUrlKey}/${link.intent.reviewId}`
}

function promptLinkIntent(link: WorkspacePromptTaskLink): CmdJTaskSourceUrl | null {
  if (link.kind === 'github') {
    return { provider: 'github', link: link.link }
  }
  if (link.kind === 'linear') {
    return { provider: 'linear', intent: link.intent }
  }
  if (link.issue) {
    return { provider: 'linear', intent: link.issue }
  }
  return null
}

function worktreeMatchesReviewUrl(worktree: Worktree, url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  const review = parseLinearReviewUrlIntent(parsed.toString())
  if (!review) {
    return false
  }
  const candidates = [
    ...getWorkspaceAttachments(worktree).map((item) => item.url),
    worktree.linkedWorkItem?.url
  ]
  return candidates.some((candidate) => {
    if (!candidate) {
      return false
    }
    const linked = parseLinearReviewUrlIntent(candidate)
    return (
      linked?.organizationUrlKey.toLowerCase() === review.organizationUrlKey.toLowerCase() &&
      linked.reviewId.toLowerCase() === review.reviewId.toLowerCase()
    )
  })
}

function preferWorkspace(matches: readonly Worktree[]): Worktree | null {
  if (matches.length === 0) {
    return null
  }
  const live = matches.filter((worktree) => !worktree.isArchived)
  const pool = live.length > 0 ? live : matches
  return pool.reduce((best, worktree) =>
    worktree.lastActivityAt > best.lastActivityAt ? worktree : best
  )
}

/**
 * A pasted task link opens the workspace that already carries it, including one
 * that was archived, instead of creating another checkout for the same task.
 */
export function findWorkspaceForPromptTaskLink(args: {
  link: WorkspacePromptTaskLink
  worktrees: readonly Worktree[]
  reposById: ReadonlyMap<string, Repo>
}): Worktree | null {
  const intent = promptLinkIntent(args.link)
  const matches = args.worktrees.filter((worktree) => {
    if (args.link.kind === 'linear-review' && worktreeMatchesReviewUrl(worktree, args.link.url)) {
      return true
    }
    if (!intent) {
      return false
    }
    return (
      matchWorktreePaletteTaskUrl({
        worktree,
        intent,
        repo: args.reposById.get(worktree.repoId)
      }) !== null
    )
  })
  return preferWorkspace(matches)
}
