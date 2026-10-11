// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { trackDockScrollPadding } from './dock-scroll-padding'

function element(height: number): HTMLDivElement {
  const div = document.createElement('div')
  Object.defineProperty(div, 'offsetHeight', { configurable: true, get: () => height })
  return div
}

describe('trackDockScrollPadding', () => {
  it("reserves the docked footer's real height at the bottom of the file list", () => {
    const scroller = document.createElement('div')
    trackDockScrollPadding(scroller, element(180))
    expect(scroller.style.scrollPaddingBottom).toBe('180px')
  })

  it('follows the dock as it grows, and clears the padding on cleanup', () => {
    let resize: () => void = () => {}
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resize = callback
        }
        observe(): void {}
        disconnect(): void {}
      }
    )
    const scroller = document.createElement('div')
    let height = 28
    const dock = document.createElement('div')
    Object.defineProperty(dock, 'offsetHeight', { configurable: true, get: () => height })
    const stop = trackDockScrollPadding(scroller, dock)
    height = 300
    resize()
    expect(scroller.style.scrollPaddingBottom).toBe('300px')
    stop()
    expect(scroller.style.scrollPaddingBottom).toBe('')
    vi.unstubAllGlobals()
  })
})
