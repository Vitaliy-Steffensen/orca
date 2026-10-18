import { useEffect, useMemo, useRef } from 'react'
import { lookupCmdJGitHubUrlWorkItem } from '@/lib/cmd-j-github-url-lookup'
import { lookupLinearIssueUrl } from '@/lib/linear-issue-url-lookup'
import {
  extractWorkspacePromptTaskLink,
  findWorkspaceForPromptTaskLink,
  workspacePromptTaskLinkKey,
  type WorkspacePromptTaskLink
} from '@/lib/workspace-prompt-task-link'
import { useAppStore } from '@/store'
import { getIndexedAllWorktrees } from '@/store/worktree-repo-index'
import type { GitHubWorkItem } from '../../../../shared/github/work-item-types'
import type { LinearIssue } from '../../../../shared/linear/issue-types'
import type { Repo } from '../../../../shared/repo-types'
import type { Worktree } from '../../../../shared/worktree/types'

const EMPTY_WORKTREES: readonly Worktree[] = []

/**
 * Watches the prompt for a GitHub, Linear issue, or Linear review URL. A workspace
 * that already has that link (including an archived one) is the open target;
 * otherwise the link is attached to the workspace about to be created.
 */
export function useWorkspacePromptTaskLink(args: {
  prompt: string
  repoId: string
  onGitHubItem: (item: GitHubWorkItem) => void
  onLinearIssue: (issue: LinearIssue) => void
  onClearLinkedSelection: () => void
}): { link: WorkspacePromptTaskLink | null; match: Worktree | null } {
  const worktrees = useAppStore((state) =>
    state.worktreesByRepo ? getIndexedAllWorktrees(state.worktreesByRepo) : EMPTY_WORKTREES
  )
  const repos = useAppStore((state) => state.repos)
  const link = useMemo(() => extractWorkspacePromptTaskLink(args.prompt), [args.prompt])
  const reposById = useMemo(() => {
    const map = new Map<string, Repo>()
    for (const repo of repos) {
      map.set(repo.id, repo)
    }
    return map
  }, [repos])
  const match = useMemo(
    () => (link ? findWorkspaceForPromptTaskLink({ link, worktrees, reposById }) : null),
    [link, reposById, worktrees]
  )
  const appliedKeyRef = useRef<string | null>(null)
  const { onClearLinkedSelection, onGitHubItem, onLinearIssue, repoId } = args

  useEffect(() => {
    if (!link) {
      if (appliedKeyRef.current) {
        appliedKeyRef.current = null
        onClearLinkedSelection()
      }
      return
    }
    if (match) {
      return
    }
    const key = workspacePromptTaskLinkKey(link)
    if (appliedKeyRef.current === key) {
      return
    }
    let cancelled = false
    const apply = (): void => {
      if (!cancelled) {
        appliedKeyRef.current = key
      }
    }
    if (link.kind === 'github') {
      const repo = reposById.get(repoId) ?? null
      void lookupCmdJGitHubUrlWorkItem({ link: link.link, repo, sourceContext: null })
        .then((item) => {
          if (cancelled || !item) {
            return
          }
          apply()
          onGitHubItem(item)
        })
        .catch(() => {})
      return () => {
        cancelled = true
      }
    }
    const intent = link.kind === 'linear' ? link.intent : link.issue
    if (!intent) {
      return
    }
    const state = useAppStore.getState()
    void lookupLinearIssueUrl({
      intent,
      knownStatus: state.linearStatus,
      sourceContext: null,
      fetchLinearIssue: state.fetchLinearIssue
    })
      .then((issue) => {
        if (cancelled || !issue) {
          return
        }
        apply()
        onLinearIssue(issue)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [link, match, onClearLinkedSelection, onGitHubItem, onLinearIssue, repoId, reposById])

  return { link, match }
}
