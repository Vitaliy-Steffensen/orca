import { parseChangedFileRowKey } from '@/store/slices/editor/actions/changed-file-order'

/** The section id that holds a row, given its `<area>::<path>` key. */
export function revealTargetSection(rowKey: string): string | null {
  const target = parseChangedFileRowKey(rowKey)
  if (!target) {
    return null
  }
  if (target.area === 'branch' || target.area === 'branch-worktree') {
    return 'all-changes'
  }
  // Untracked files render inside the Unstaged section.
  return target.area === 'untracked' ? 'unstaged' : target.area
}

/**
 * The collapsed directory keys hiding a row.
 *
 * Why prefix matching rather than an ancestor key list: the tree folds `a/b/c` into one row keyed
 * by the deepest node, so the ancestors of a path are not all present as keys.
 */
export function collapsedDirsHidingRow(
  collapsedTreeDirs: ReadonlySet<string>,
  rowKey: string
): string[] {
  const target = parseChangedFileRowKey(rowKey)
  if (!target) {
    return []
  }
  // Untracked rows keep untracked:: keys, but their folders are keyed under the unstaged tree.
  const areas = target.area === 'untracked' ? ['untracked', 'unstaged'] : [target.area]
  return Array.from(collapsedTreeDirs).filter((key) =>
    areas.some((area) => {
      const prefix = `dir::${area}::`
      if (!key.startsWith(prefix)) {
        return false
      }
      return target.relativePath.startsWith(`${key.slice(prefix.length)}/`)
    })
  )
}
