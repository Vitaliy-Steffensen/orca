import { useAppStore } from '@/store'
import { detectLanguage } from '@/lib/language-detect'
import { getRuntimeGitBranchCompare } from '@/runtime/runtime-git-diff-client'
import { getWorktreeGitOwnerTarget } from '@/components/right-sidebar/worktree-git-owner-target'
import { compareFileNames } from '../../../../shared/file-name-sort'
import type { AppState } from '@/store'

type LayoutState = Pick<
  AppState,
  | 'unifiedTabsByWorktree'
  | 'ensureWorktreeRootGroup'
  | 'createEmptySplitGroup'
  | 'beginGitBranchCompareRequest'
  | 'setGitBranchCompareResult'
  | 'openBranchWorktreeDiff'
  | 'activateTab'
>

type LayoutTarget = {
  worktreeId: string
  worktreePath: string
  agentTabId: string
  baseRef: string
}

type LayoutDeps = {
  getState: () => LayoutState
  resolveTarget: typeof getWorktreeGitOwnerTarget
  branchCompare: typeof getRuntimeGitBranchCompare
}

const defaultDeps: LayoutDeps = {
  getState: (): LayoutState => useAppStore.getState(),
  resolveTarget: getWorktreeGitOwnerTarget,
  branchCompare: getRuntimeGitBranchCompare
}

// Fork: a review workspace opens as the review agent with the PR's first changed file beside it,
// split to the right, so the review and the code it is about are both on screen.
export async function openReviewWorkspaceLayout(
  target: LayoutTarget,
  deps: LayoutDeps = defaultDeps
): Promise<void> {
  try {
    await openFirstFileBesideAgent(target, deps)
  } finally {
    // Why: the setup and default tabs open in the agent's group alongside it, so whichever of
    // them landed last would otherwise be the one shown there. Scoped, so it never steals focus.
    deps
      .getState()
      .activateTab(target.agentTabId, { worktreeId: target.worktreeId, recordFocus: false })
  }
}

async function openFirstFileBesideAgent(
  { worktreeId, worktreePath, agentTabId, baseRef }: LayoutTarget,
  deps: LayoutDeps
): Promise<void> {
  const ownerTarget = deps.resolveTarget(worktreeId)
  if (!ownerTarget) {
    return
  }
  let result: Awaited<ReturnType<typeof getRuntimeGitBranchCompare>>
  try {
    result = await deps.branchCompare(
      { target: ownerTarget, worktreeId, worktreePath },
      baseRef,
      'background'
    )
  } catch (error) {
    console.warn('[workspace-status-rules] review layout could not read the PR diff:', error)
    return
  }
  const [first] = [...result.entries].sort((a, b) => compareFileNames(a.path, b.path))
  if (result.summary.status !== 'ready' || !first) {
    return
  }
  const state = deps.getState()
  // Why seed the store: the Source Control panel only fetches the compare for the active
  // worktree, and the opened diff and file stepping read it from here.
  const requestKey = `review-layout:${worktreeId}`
  state.beginGitBranchCompareRequest(worktreeId, requestKey, baseRef)
  state.setGitBranchCompareResult(worktreeId, requestKey, result)
  const agentGroupId =
    state.unifiedTabsByWorktree[worktreeId]?.find((tab) => tab.id === agentTabId)?.groupId ??
    state.ensureWorktreeRootGroup(worktreeId)
  const diffGroupId = state.createEmptySplitGroup(worktreeId, agentGroupId, 'right', {
    activate: false
  })
  if (!diffGroupId) {
    return
  }
  state.openBranchWorktreeDiff(
    worktreeId,
    worktreePath,
    first,
    result.summary,
    detectLanguage(first.path),
    { targetGroupId: diffGroupId, preview: false }
  )
}
