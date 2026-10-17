import { useEffect, useRef, useState } from 'react'
import { REVEAL_COMBINED_DIFF_TREE_EVENT } from '@/lib/combined-diff-tree-reveal-request'
import type { CombinedDiffTreeRevealRequest } from './use-combined-diff-tree-reveal'

/**
 * Turns the `view.revealActiveFile` event into a tree reveal for this viewer only. The section the
 * user is looking at is whatever the scroll anchor last recorded, which no caller outside the
 * viewer can see.
 */
export function useCombinedDiffTreeRevealRequest({
  fileId,
  resolveSectionKey,
  onReveal
}: {
  fileId: string
  resolveSectionKey: () => string | null
  onReveal: (sectionKey: string) => void
}): CombinedDiffTreeRevealRequest | null {
  const [request, setRequest] = useState<CombinedDiffTreeRevealRequest | null>(null)
  const resolveSectionKeyRef = useRef(resolveSectionKey)
  resolveSectionKeyRef.current = resolveSectionKey
  const onRevealRef = useRef(onReveal)
  onRevealRef.current = onReveal

  useEffect(() => {
    const onRevealRequest = (
      event: WindowEventMap[typeof REVEAL_COMBINED_DIFF_TREE_EVENT]
    ): void => {
      if (event.detail.fileId !== fileId) {
        return
      }
      const sectionKey = resolveSectionKeyRef.current()
      if (!sectionKey) {
        return
      }
      onRevealRef.current(sectionKey)
      setRequest({ sectionKey, requestId: Date.now() })
    }
    window.addEventListener(REVEAL_COMBINED_DIFF_TREE_EVENT, onRevealRequest)
    return () => window.removeEventListener(REVEAL_COMBINED_DIFF_TREE_EVENT, onRevealRequest)
  }, [fileId])

  return request
}
