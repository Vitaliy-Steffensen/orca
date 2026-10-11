// @vitest-environment happy-dom
import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SECTION_DRAG_MIME } from '../source-control/listing/section-chrome'
import { PrPanelSections } from './pr-panel-sections'

const state = vi.hoisted(() => ({
  settings: {
    sourceControlSectionLayout: {
      order: ['changes'],
      pr: { order: ['pr-comments', 'pr-checks'], hidden: ['pr-attention'] }
    }
  } as Record<string, unknown>,
  updateSettings: vi.fn()
}))

vi.mock('@/store', () => ({
  useAppStore: (select: (s: typeof state) => unknown) => select(state)
}))

afterEach(cleanup)

function renderPanel() {
  render(
    <PrPanelSections
      sections={[
        { id: 'pr-attention', node: <div>Attention body</div> },
        { id: 'pr-checks', node: <div>Checks body</div> },
        { id: 'pr-comments', node: <div>Comments body</div> }
      ]}
    />
  )
}

describe('PrPanelSections', () => {
  it('lays the PR sections out in the saved order, leaving hidden ones out', () => {
    renderPanel()
    const text = document.body.textContent ?? ''
    expect(text.indexOf('Comments body')).toBeLessThan(text.indexOf('Checks body'))
    expect(text).not.toContain('Attention body')
  })

  it('saves the new order under the PR panel when a section is dropped', () => {
    renderPanel()
    const target = screen.getByText('Comments body').closest('[data-section-drop]')!
    target.getBoundingClientRect = () => ({ top: 0, height: 100 }) as DOMRect
    for (const make of [createEvent.dragOver, createEvent.drop]) {
      const event = make(target)
      Object.defineProperty(event, 'dataTransfer', {
        value: { types: [SECTION_DRAG_MIME], getData: () => 'pr-checks', dropEffect: '' }
      })
      Object.defineProperty(event, 'clientY', { value: 10 })
      fireEvent(target, event)
    }
    expect(state.updateSettings).toHaveBeenCalledWith({
      sourceControlSectionLayout: {
        order: ['changes'],
        pr: {
          order: ['pr-checks', 'pr-comments', 'pr-attention', 'pr-pending-review'],
          hidden: ['pr-attention']
        }
      }
    })
  })
})
