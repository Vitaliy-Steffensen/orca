// @vitest-environment happy-dom
import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SECTION_DRAG_MIME } from '../listing/section-chrome'
import { SourceControlStackedSections } from './stacked-sections'

afterEach(cleanup)

function renderSections(onMove = vi.fn()) {
  const scrollRef = vi.fn()
  const { container } = render(
    <SourceControlStackedSections
      shelves={[
        { id: 'pending-review', node: <div>Review body</div> },
        { id: 'agent-turns', node: <div>Turns body</div> }
      ]}
      order={['agent-turns', 'changes', 'pending-review']}
      onMove={onMove}
      onHide={vi.fn()}
      scrollRef={scrollRef}
      footer={<div>Commits body</div>}
    >
      <div>Files body</div>
    </SourceControlStackedSections>
  )
  return { onMove, scrollRef, container }
}

describe('SourceControlStackedSections', () => {
  it('stacks every section at its own height in one scroller, Commits last', () => {
    const { scrollRef, container } = renderSections()
    const scroller = scrollRef.mock.calls.find(([node]) => node)?.[0] as HTMLElement
    expect(scroller).toBeTruthy()
    for (const body of ['Turns body', 'Files body', 'Review body', 'Commits body']) {
      expect(scroller.contains(screen.getByText(body))).toBe(true)
    }
    const text = scroller.textContent ?? ''
    expect(text.indexOf('Turns body')).toBeLessThan(text.indexOf('Files body'))
    expect(text.indexOf('Files body')).toBeLessThan(text.indexOf('Review body'))
    expect(text.indexOf('Review body')).toBeLessThan(text.indexOf('Commits body'))
    // No resize handles: opening one section never takes height from another.
    expect(container.querySelector('[role="separator"]')).toBeNull()
  })

  it('moves a dragged section to where it is dropped', () => {
    const { onMove } = renderSections()
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
