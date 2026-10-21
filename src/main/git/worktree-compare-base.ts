import { getBaseRefDefault, type LocalGitExecOptions } from './repo-default-base-ref'
import { listRemoteNames, resolveConfiguredRemoteBranchName } from './repo-base-ref-search'

function denotesBranchItself(
  effectiveBase: string,
  branch: string,
  remoteNames: readonly string[]
): boolean {
  if (effectiveBase === branch || effectiveBase === `refs/heads/${branch}`) {
    return true
  }
  return resolveConfiguredRemoteBranchName(effectiveBase, remoteNames) === branch
}

/**
 * The ref a new worktree should be compared against, which is not always the ref
 * it was created from. Opening an existing branch starts from that branch's own
 * (remote) ref, and recording it as the compare base makes the workspace diff
 * against itself — an empty diff. Fall back to the repo default base there.
 */
export async function resolveWorktreeCompareBase(
  repoPath: string,
  branch: string,
  effectiveBase: string,
  options: LocalGitExecOptions = {}
): Promise<string> {
  const remoteNames = await listRemoteNames(repoPath, options)
  // Why: longest-first so `origin/feat` isn't claimed by a remote named `orig`.
  const longestFirstRemoteNames = [...remoteNames].sort((a, b) => b.length - a.length)
  if (!denotesBranchItself(effectiveBase, branch, longestFirstRemoteNames)) {
    return effectiveBase
  }
  const defaultBaseRef = await getBaseRefDefault(repoPath, options)
  return defaultBaseRef && !denotesBranchItself(defaultBaseRef, branch, longestFirstRemoteNames)
    ? defaultBaseRef
    : effectiveBase
}
