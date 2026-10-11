// @vitest-environment happy-dom
import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SECTION_DRAG_MIME } from '../listing/section-chrome'
import { SourceControlResizableSections } from './resizable-sections'

afterEach(cleanup)

function renderSections(onMove = vi.fn()) {
  render(
    <SourceControlResizableSections
      shelves={[
        { id: 'pending-review', node: <div>Review body</div> },
        { id: 'agent-turns', node: <div>Turns body</div> }
      ]}
      order={['agent-turns', 'changes', 'pending-review']}
      onMove={onMove}
      onHide={vi.fn()}
    >
      <div>Files body</div>
    </SourceControlResizableSections>
  )
  return onMove
}

describe('SourceControlResizableSections order', () => {
  it('lays the sections out in the saved order, changed files included', () => {
    renderSections()
    const text = document.body.textContent ?? ''
    expect(text.indexOf('Turns body')).toBeLessThan(text.indexOf('Files body'))
    expect(text.indexOf('Files body')).toBeLessThan(text.indexOf('Review body'))
  })

  it('moves a dragged section to where it is dropped', () => {
    const onMove = renderSections()
    const target = screen.getByText('Turns body').closest('[data-section-drop]')!
    const dataTransfer = {
      types: [SECTION_DRAG_MIME],
      getData: (type: string) => (type === SECTION_DRAG_MIME ? 'pending-review' : ''),
      dropEffect: ''
    }
    target.getBoundingClientRect = () => ({ top: 0, height: 100 }) as DOMRect
    for (const make of [createEvent.dragOver, createEvent.drop]) {
      const event = make(target)
      Object.defineProperty(event, 'dataTransfer', { value: dataTransfer })
      Object.defineProperty(event, 'clientY', { value: 10 })
      fireEvent(target, event)
    }
    expect(onMove).toHaveBeenCalledWith('pending-review', 'agent-turns')
  })
})
