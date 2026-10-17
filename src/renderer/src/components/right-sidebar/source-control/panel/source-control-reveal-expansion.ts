import { parseChangedFileRowKey } from '@/store/slices/editor/actions/changed-file-order'

/** The section id that holds a row, given its `<area>::<path>` key. */
export function revealTargetSection(rowKey: string): string | null {
  const target = parseChangedFileRowKey(rowKey)
  if (!target) {
    return null
  }
  if (target.area === 'branch') {
    return 'branch'
  }
  return target.area === 'branch-worktree' ? 'all-changes' : target.area
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
  return Array.from(collapsedTreeDirs).filter((key) => {
    const prefix = `dir::${target.area}::`
    if (!key.startsWith(prefix)) {
      return false
    }
    return target.relativePath.startsWith(`${key.slice(prefix.length)}/`)
  })
}
