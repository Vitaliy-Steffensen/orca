// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SectionHeader } from './section-header'
import { SECTION_DRAG_MIME, SectionChromeProvider, dropBeforeId } from './section-chrome'

afterEach(cleanup)

describe('section chrome', () => {
  it("drags a section by its header, carrying the section's id", () => {
    render(
      <SectionChromeProvider sectionId="agent-turns" onHide={vi.fn()}>
        <SectionHeader label="Agent turns" count={2} isCollapsed={false} onToggle={vi.fn()} />
      </SectionChromeProvider>
    )
    const header = screen.getByText('Agent turns').closest('[draggable="true"]')
    expect(header).toBeTruthy()
    const setData = vi.fn()
    fireEvent.dragStart(header!, { dataTransfer: { setData, effectAllowed: '' } })
    expect(setData).toHaveBeenCalledWith(SECTION_DRAG_MIME, 'agent-turns')
  })

  it('offers to hide the section from its header context menu', async () => {
    const onHide = vi.fn()
    render(
      <SectionChromeProvider sectionId="reviewers" onHide={onHide}>
        <SectionHeader label="Reviewers" count={1} isCollapsed={false} onToggle={vi.fn()} />
      </SectionChromeProvider>
    )
    fireEvent.contextMenu(screen.getByText('Reviewers'))
    fireEvent.click(await screen.findByText('Hide section'))
    expect(onHide).toHaveBeenCalled()
  })

  it('leaves a header outside any section plain', () => {
    render(<SectionHeader label="Loose" count={0} isCollapsed={false} onToggle={vi.fn()} />)
    expect(screen.getByText('Loose').closest('[draggable="true"]')).toBeNull()
  })

  it('drops before the hovered section in its top half, else before the one after it', () => {
    const order = ['reviewers', 'agent-turns', 'changes'] as const
    expect(dropBeforeId(order, 'agent-turns', 'top')).toBe('agent-turns')
    expect(dropBeforeId(order, 'agent-turns', 'bottom')).toBe('changes')
    expect(dropBeforeId(order, 'changes', 'bottom')).toBeNull()
  })
})
