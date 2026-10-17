/**
 * Targeted reveal dispatch for the `view.revealActiveFile` shortcut when the active tab is a
 * combined diff. The viewer owns the scroll anchor that knows which section is on screen, so the
 * shortcut can only ask it to reveal — it cannot compute the target itself. Mirrors
 * RENAME_TERMINAL_TAB_EVENT: the event reaches only the viewer that owns the file id, instead of a
 * store field every mounted viewer would read and clear.
 */
export const REVEAL_COMBINED_DIFF_TREE_EVENT = 'orca-reveal-combined-diff-tree'

export type RevealCombinedDiffTreeDetail = {
  fileId: string
}

declare global {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- WindowEventMap requires declaration merging.
  interface WindowEventMap {
    'orca-reveal-combined-diff-tree': CustomEvent<RevealCombinedDiffTreeDetail>
  }
}

export function requestCombinedDiffTreeReveal(fileId: string): void {
  window.dispatchEvent(
    new CustomEvent<RevealCombinedDiffTreeDetail>(REVEAL_COMBINED_DIFF_TREE_EVENT, {
      detail: { fileId }
    })
  )
}
