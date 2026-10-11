/**
 * Keeps the file list's bottom scroll-padding equal to the docked footer's height, so a row revealed
 * by keyboard stepping lands above the footer however far it is expanded.
 */
export function trackDockScrollPadding(scroller: HTMLElement, dock: HTMLElement): () => void {
  const apply = (): void => {
    scroller.style.scrollPaddingBottom = `${dock.offsetHeight}px`
  }
  apply()
  if (typeof ResizeObserver === 'undefined') {
    return () => {
      scroller.style.scrollPaddingBottom = ''
    }
  }
  const observer = new ResizeObserver(apply)
  observer.observe(dock)
  return () => {
    observer.disconnect()
    scroller.style.scrollPaddingBottom = ''
  }
}
