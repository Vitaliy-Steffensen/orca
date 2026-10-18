// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SourceControlHeaderOverflowMenu } from './header-overflow-menu'

afterEach(cleanup)

describe('source control grouping toggle', () => {
  it('no longer offers a grouping switch now that the three sections always show', () => {
    render(
      <TooltipProvider>
        <SourceControlHeaderOverflowMenu
          sourceControlViewMode="list"
          viewModeToggleDisabled={false}
          onToggleViewMode={vi.fn()}
          onChangeBaseRef={vi.fn()}
          onRefreshBranchCompare={vi.fn()}
          branchCompareRefreshDisabled={false}
        />
      </TooltipProvider>
    )
    fireEvent.pointerDown(screen.getByLabelText('More source control actions'), {
      button: 0,
      ctrlKey: false
    })
    expect(screen.queryByText('Group by status')).toBeNull()
    expect(screen.queryByText('Show all changes in one list')).toBeNull()
    expect(screen.getByText('View as tree')).toBeTruthy()
  })
})
