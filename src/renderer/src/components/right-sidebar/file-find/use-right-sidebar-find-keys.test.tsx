// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRightSidebarFindKeys } from './use-right-sidebar-find-keys'
import { useAppStore } from '@/store'

const requestRightSidebarFind = vi.fn()
let platform: NodeJS.Platform = 'darwin'

vi.mock('@/store', () => ({
  useAppStore: { getState: () => ({ keybindings: {}, requestRightSidebarFind }) }
}))
vi.mock('@/lib/shortcut-platform', () => ({ getShortcutPlatform: () => platform }))

function Host(): React.JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null)
  useRightSidebarFindKeys(ref)
  return (
    <div>
      <div ref={ref}>
        <input data-testid="inside" />
      </div>
      <input data-testid="outside" />
    </div>
  )
}

function pressFind(target: Element, mac: boolean): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: 'f',
    code: 'KeyF',
    bubbles: true,
    cancelable: true,
    metaKey: mac,
    ctrlKey: !mac
  })
  target.dispatchEvent(event)
  return event
}

beforeEach(() => {
  requestRightSidebarFind.mockClear()
  platform = 'darwin'
})
afterEach(cleanup)

describe('useRightSidebarFindKeys', () => {
  it('claims the chord only while focus is inside the sidebar', () => {
    const view = render(<Host />)
    const inside = view.getByTestId('inside')
    const event = pressFind(inside, true)
    expect(requestRightSidebarFind).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('leaves the chord to the editor everywhere else', () => {
    const view = render(<Host />)
    const event = pressFind(view.getByTestId('outside'), true)
    expect(requestRightSidebarFind).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('follows the platform rather than hardcoding the meta key', () => {
    platform = 'win32'
    const view = render(<Host />)
    pressFind(view.getByTestId('inside'), true)
    expect(requestRightSidebarFind).not.toHaveBeenCalled()
    pressFind(view.getByTestId('inside'), false)
    expect(requestRightSidebarFind).toHaveBeenCalledTimes(1)
  })
})

// Keeps the store import honest under the mock.
void useAppStore
