export const ARROW_SCROLL_STEP_PX = 40

export type CombinedDiffKeyAction = { kind: 'scroll'; delta: number } | null

type ArrowKeyEvent = Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>

function isMonacoInput(target: Element): boolean {
  return target.tagName === 'TEXTAREA' && target.closest('.monaco-editor') !== null
}

// Why aria-autocomplete: Monaco sets it to "none" on the input of a read-only editor.
function isEditableMonaco(target: Element): boolean {
  return isMonacoInput(target) && target.getAttribute('aria-autocomplete') !== 'none'
}

function isTextField(target: Element): boolean {
  if (isMonacoInput(target)) {
    return false
  }
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

// Fork: in the combined diff, the bare arrows scroll the view unless you are typing. Modified
// arrows stay with the keybindings, where the next/previous-file step snaps to a file's top.
export function resolveCombinedDiffKey(
  event: ArrowKeyEvent,
  target: Element | null
): CombinedDiffKeyAction {
  const direction = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
  if (direction === 0 || event.altKey || event.shiftKey || event.metaKey || event.ctrlKey) {
    return null
  }
  if (target && (isTextField(target) || isEditableMonaco(target))) {
    return null
  }
  return { kind: 'scroll', delta: direction * ARROW_SCROLL_STEP_PX }
}

/** The section whose top should come to the top of the view; `starts` are section offsets. */
export function adjacentSectionIndex(
  starts: readonly number[],
  scrollTop: number,
  direction: 1 | -1
): number | null {
  // Why the 1px slack: a snapped section's top lands on scrollTop give or take rounding.
  let current = 0
  for (let index = 0; index < starts.length; index += 1) {
    if (starts[index] <= scrollTop + 1) {
      current = index
    }
  }
  if (direction === 1) {
    return current + 1 < starts.length ? current + 1 : null
  }
  if (scrollTop > starts[current] + 1) {
    return current
  }
  return current > 0 ? current - 1 : null
}
