import { useEffect, useRef, useState } from 'react'
import { REVEAL_FLASH_DURATION_MS } from '@/lib/reveal-flash-class'
import type { CombinedDiffFileTreeMode } from '../resolve-changes/combined-diff-section-identity'
import type { CombinedDiffTreeNode } from './combined-diff-file-tree-row'
import { findCombinedDiffTreeRevealTarget } from './combined-diff-tree-reveal-target'

export type CombinedDiffTreeRevealRequest = {
  sectionKey: string
  requestId: number
}

/**
 * Drives `view.revealActiveFile` inside the diff tree: expand the target's ancestors, hand its row
 * key to the windowed lists to scroll to, and flash it.
 *
 * The roots come through a ref because the tree rebuilds them on every filter and viewed-state
 * change; keeping them out of the dependencies means an unrelated rebuild cannot re-fire a reveal
 * the user already got.
 */
export function useCombinedDiffTreeReveal({
  mode,
  request,
  roots,
  onExpandAncestors
}: {
  mode: CombinedDiffFileTreeMode
  request: CombinedDiffTreeRevealRequest | null
  roots: readonly CombinedDiffTreeNode[]
  onExpandAncestors: (ancestorKeys: readonly string[]) => void
}): { flashRowKey: string | null; scrollToRowKey: string | null } {
  const rootsRef = useRef(roots)
  rootsRef.current = roots
  const onExpandAncestorsRef = useRef(onExpandAncestors)
  onExpandAncestorsRef.current = onExpandAncestors
  const [revealedRowKey, setRevealedRowKey] = useState<string | null>(null)
  const [flashRowKey, setFlashRowKey] = useState<string | null>(null)

  useEffect(() => {
    if (!request) {
      return
    }
    const target = findCombinedDiffTreeRevealTarget({
      mode,
      roots: rootsRef.current,
      sectionKey: request.sectionKey
    })
    if (!target) {
      return
    }
    onExpandAncestorsRef.current(target.ancestorKeys)
    setRevealedRowKey(target.rowKey)
    setFlashRowKey(target.rowKey)
    const timeout = window.setTimeout(() => {
      setFlashRowKey((current) => (current === target.rowKey ? null : current))
    }, REVEAL_FLASH_DURATION_MS)
    return () => window.clearTimeout(timeout)
  }, [mode, request])

  return { flashRowKey, scrollToRowKey: revealedRowKey }
}
