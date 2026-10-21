// @vitest-environment happy-dom

/**
 * Guards the sub-option indent: Tailwind v4 emits `px-*` as `padding-inline`,
 * which outranks a physical `pl-*` override and silently flattens the nesting.
 */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MenuSwitchRow } from './menu-switch-row'

let container: HTMLDivElement
let root: Root

function renderRow(indented: boolean, disabled = false, onChange = vi.fn()): HTMLElement {
  act(() => {
    root.render(
      <MenuSwitchRow
        icon={null}
        label="Row"
        checked={false}
        onChange={onChange}
        indented={indented}
        disabled={disabled}
      />
    )
  })
  const row = container.querySelector('[role="switch"]')
  if (!(row instanceof HTMLElement)) {
    throw new Error('MenuSwitchRow did not render a switch')
  }
  return row
}

function paddingClasses(row: HTMLElement): string[] {
  return row.className.split(/\s+/).filter((cls) => /^p[xlr]?-/.test(cls))
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('MenuSwitchRow', () => {
  it('indents a sub-option past the row above it', () => {
    const indented = paddingClasses(renderRow(true))
    const flat = paddingClasses(renderRow(false))
    expect(indented).toContain('pl-7')
    expect(flat).toContain('pl-2')
  })

  it('never pairs the indent with a padding-inline utility that would outrank it', () => {
    expect(paddingClasses(renderRow(true)).filter((cls) => cls.startsWith('px-'))).toEqual([])
  })

  it('ignores clicks while disabled', () => {
    const onChange = vi.fn()
    const row = renderRow(false, true, onChange)
    act(() => row.click())
    expect(onChange).not.toHaveBeenCalled()
  })
})
