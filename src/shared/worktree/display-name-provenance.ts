/** A rename with text pins the label; empty text returns it to automatic (branch-derived). */
export function displayNameUpdatePinsLabel(displayName: string | undefined): boolean {
  return Boolean(displayName?.trim())
}

/**
 * True when the label on a workspace is the user's own, so Orca must not re-title it.
 * Hosts that predate the provenance projection left the mode absent: there, a label the
 * CLI stamped or one that no longer matches the branch-derived label is the user's.
 */
export function workspaceDisplayNameIsUserOwned(args: {
  displayName: string
  displayNameMode?: 'fixed' | 'automatic'
  automaticDisplayName: string
  createdByCli?: boolean
}): boolean {
  if (args.displayNameMode !== undefined) {
    return args.displayNameMode === 'fixed'
  }
  return args.createdByCli === true || args.displayName.trim() !== args.automaticDisplayName.trim()
}
