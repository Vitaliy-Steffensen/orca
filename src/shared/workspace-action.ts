import type { PRState } from './github/pull-request-types'

export type WorkspaceActionKind =
  | 'resolve-conflicts'
  | 'create-pull-request'
  | 'create-draft-pull-request'
  | 'commit-and-push'
  | 'ready-for-review'
  | 'review'
  | 're-review'

export type WorkspaceActionInput = {
  hasUncommittedChanges: boolean
  hasUpstream: boolean
  unpushedCommits: number
  hasLocalConflicts: boolean
  isDefaultBranch: boolean
  pullRequest: { state: PRState; conflicting: boolean } | null
  // Why: an unanswered lookup is not "no pull request", and must not offer Create PR.
  pullRequestKnown: boolean
  hasDiffFromBase: boolean
  // Why: an unloaded line total is not "no diff" either, and must not retract Review.
  branchDiffKnown: boolean
}

// Why this order: a merge stopped on conflicts cannot be committed, so it outranks everything. A
// branch with no pull request goes straight to Create PR, whose prompt commits and pushes the work
// too. Otherwise unfinished local work comes first, then what blocks the pull request, then its
// next step, and reading the pull request comes last because it is never the thing holding it up.
export function resolveWorkspaceActions(input: WorkspaceActionInput): WorkspaceActionKind[] {
  const pr = input.pullRequest
  const prOpen = pr !== null && (pr.state === 'open' || pr.state === 'draft')
  const canCreatePr = pr === null && input.pullRequestKnown && !input.isDefaultBranch
  const actions: WorkspaceActionKind[] = []
  if (input.hasLocalConflicts || (prOpen && pr.conflicting)) {
    actions.push('resolve-conflicts')
  }
  if (canCreatePr) {
    actions.push('create-pull-request', 'create-draft-pull-request')
  }
  if (input.hasUncommittedChanges || (input.hasUpstream && input.unpushedCommits > 0)) {
    actions.push('commit-and-push')
  }
  if (prOpen && pr.state === 'draft') {
    actions.push('ready-for-review')
  }
  if (prOpen && (input.hasDiffFromBase || !input.branchDiffKnown)) {
    actions.push('review', 're-review')
  }
  return actions
}
