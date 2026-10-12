import { useEffect, type RefObject } from 'react'
import type { Virtualizer } from '@tanstack/react-virtual'
import { useAppStore } from '@/store'
import { registerCombinedDiffFileStepper } from '@/lib/combined-diff-file-stepper'
import { adjacentSectionIndex, resolveCombinedDiffKey } from './combined-diff-keyboard-scroll'

export function useCombinedDiffKeyboardScroll({
  fileId,
  scrollContainerRef,
  virtualizer,
  scrollToSectionIndex,
  markDirectScrollInput
}: {
  fileId: string
  scrollContainerRef: RefObject<HTMLDivElement | null>
  virtualizer: Pick<Virtualizer<HTMLDivElement, Element>, 'measurementsCache'>
  scrollToSectionIndex: (index: number) => void
  markDirectScrollInput: () => void
}): void {
  useEffect(() => {
    const visibleContainer = (): HTMLDivElement | null => {
      const container = scrollContainerRef.current
      return container && container.offsetParent !== null ? container : null
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      const container = visibleContainer()
      if (!container || event.defaultPrevented) {
        return
      }
      const target = event.target instanceof Element ? event.target : null
      if (target !== document.body && !(target && container.contains(target))) {
        return
      }
      const action = resolveCombinedDiffKey(event, target)
      if (!action) {
        return
      }
      // Why capture and stop: Monaco would otherwise move a read-only caret the view never follows.
      event.preventDefault()
      event.stopPropagation()
      markDirectScrollInput()
      container.scrollBy({ top: action.delta })
    }
    const unregister = registerCombinedDiffFileStepper((direction) => {
      const container = visibleContainer()
      if (!container || useAppStore.getState().activeFileId !== fileId) {
        return false
      }
      const starts = virtualizer.measurementsCache.map((item) => item.start)
      const index = adjacentSectionIndex(starts, container.scrollTop, direction === 'next' ? 1 : -1)
      if (index !== null) {
        markDirectScrollInput()
        scrollToSectionIndex(index)
      }
      return true
    })
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      unregister()
    }
  }, [fileId, markDirectScrollInput, scrollContainerRef, scrollToSectionIndex, virtualizer])
}
