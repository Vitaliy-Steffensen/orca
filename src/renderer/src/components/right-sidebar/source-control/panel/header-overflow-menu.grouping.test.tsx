// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SourceControlHeaderOverflowMenu } from './header-overflow-menu'

afterEach(cleanup)

function openMenu(grouping: 'all' | 'status', onToggleGrouping = vi.fn()) {
  render(
    <TooltipProvider>
      <SourceControlHeaderOverflowMenu
        sourceControlViewMode="list"
        viewModeToggleDisabled={false}
        onToggleViewMode={vi.fn()}
        onChangeBaseRef={vi.fn()}
        onRefreshBranchCompare={vi.fn()}
        branchCompareRefreshDisabled={false}
        sourceControlGrouping={grouping}
        onToggleGrouping={onToggleGrouping}
      />
    </TooltipProvider>
  )
  fireEvent.pointerDown(screen.getByLabelText('More source control actions'), {
    button: 0,
    ctrlKey: false
  })
  return onToggleGrouping
}

describe('source control grouping toggle', () => {
  it('offers grouping by status from the one list, and switches when chosen', () => {
    const onToggleGrouping = openMenu('all')
    fireEvent.click(screen.getByText('Group by status'))
    expect(onToggleGrouping).toHaveBeenCalled()
  })

  it('offers going back to one list from the status sections', () => {
    openMenu('status')
    expect(screen.getByText('Show all changes in one list')).toBeTruthy()
  })
})
