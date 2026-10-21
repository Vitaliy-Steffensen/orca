import { branchName } from '@/lib/git-utils'
import { workspaceDisplayNameIsUserOwned } from '../../../../shared/worktree/display-name-provenance'
import type { Worktree } from '../../../../shared/worktree/types'

type RenameableWorkspace = Pick<Worktree, 'branch' | 'displayName' | 'path'> &
  Partial<Pick<Worktree, 'displayNameMode' | 'cliProvenance'>>

/**
 * Opening a review from a workspace is the moment the two get one name: the workspace
 * takes the review's title so the sidebar and the provider agree. A label the user wrote
 * themselves is theirs, and stays.
 */
export function resolveCreatedReviewWorkspaceRename(
  workspace: RenameableWorkspace | null | undefined,
  title: string | undefined
): { displayName: string } | null {
  const nextDisplayName = title?.trim()
  if (!workspace || !nextDisplayName || nextDisplayName === workspace.displayName) {
    return null
  }
  const shortBranch = branchName(workspace.branch)
  const automaticDisplayName = shortBranch || (workspace.path.split(/[\\/]/).pop() ?? '')
  if (
    workspaceDisplayNameIsUserOwned({
      displayName: workspace.displayName,
      displayNameMode: workspace.displayNameMode,
      automaticDisplayName,
      createdByCli: workspace.cliProvenance?.kind === 'created-by-cli'
    })
  ) {
    return null
  }
  return { displayName: nextDisplayName }
}
