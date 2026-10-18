export type WorkspaceArchiveMenuAction<T> = {
  /** Workspaces the item acts on; empty disables it. */
  targets: readonly T[]
  /** True when the verb is Unarchive. */
  isRestore: boolean
  label: string
}

/**
 * Which way the Archive item points for a given right-click.
 *
 * Why the right-clicked row decides rather than the selection: a mixed
 * selection still needs one verb, and that row is the one the user is
 * thinking about. The other direction's rows are simply left alone.
 */
export function resolveWorkspaceArchiveMenuAction<T extends { isArchived: boolean }>(
  worktree: { isArchived: boolean },
  activeContextWorktrees: readonly T[],
  isMultiContext: boolean
): WorkspaceArchiveMenuAction<T> {
  const isRestore = worktree.isArchived
  const targets = activeContextWorktrees.filter((item) => item.isArchived === isRestore)
  const verb = isRestore ? 'Unarchive' : 'Archive'
  return {
    targets,
    isRestore,
    label:
      isMultiContext && targets.length > 0
        ? `${verb} ${targets.length} Workspace${targets.length === 1 ? '' : 's'}`
        : verb
  }
}
