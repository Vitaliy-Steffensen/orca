import {
  getCombinedDiffFileTreeSectionKey,
  type CombinedDiffFileTreeMode
} from '../resolve-changes/combined-diff-section-identity'
import type { CombinedDiffTreeNode } from './combined-diff-file-tree-row'

export type CombinedDiffTreeRevealTarget = {
  rowKey: string
  ancestorKeys: readonly string[]
}

/**
 * Locate a diff section in the unflattened tree. Walking the roots rather than the rendered rows is
 * the point: the row the user is scrolled to is usually inside a collapsed directory, so it has no
 * flattened row to find until its ancestors are expanded.
 */
export function findCombinedDiffTreeRevealTarget({
  mode,
  roots,
  sectionKey
}: {
  mode: CombinedDiffFileTreeMode
  roots: readonly CombinedDiffTreeNode[]
  sectionKey: string
}): CombinedDiffTreeRevealTarget | null {
  const ancestorKeys: string[] = []

  const walk = (nodes: readonly CombinedDiffTreeNode[]): string | null => {
    for (const node of nodes) {
      if (node.type === 'file') {
        if (getCombinedDiffFileTreeSectionKey(mode, node.entry) === sectionKey) {
          return node.key
        }
        continue
      }
      ancestorKeys.push(node.key)
      const found = walk(node.children)
      if (found) {
        return found
      }
      ancestorKeys.pop()
    }
    return null
  }

  const rowKey = walk(roots)
  return rowKey ? { rowKey, ancestorKeys: [...ancestorKeys] } : null
}
