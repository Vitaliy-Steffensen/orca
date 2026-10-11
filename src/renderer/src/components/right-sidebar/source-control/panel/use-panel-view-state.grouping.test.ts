// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GlobalSettings } from '../../../../../../shared/global-settings-types'
import { useSourceControlPanelViewState } from './use-panel-view-state'

function viewState(settings: Partial<GlobalSettings>, updateSettings = vi.fn()) {
  return renderHook(() =>
    useSourceControlPanelViewState({
      activeWorktreeId: 'wt',
      settings: settings as GlobalSettings,
      updateSettings
    })
  )
}

describe('source control grouping', () => {
  it('lists every changed file in one section unless grouping by status was chosen', () => {
    expect(viewState({}).result.current.sourceControlGrouping).toBe('all')
    expect(
      viewState({ sourceControlGrouping: 'status' }).result.current.sourceControlGrouping
    ).toBe('status')
  })

  it('saves the other grouping when toggled', () => {
    const updateSettings = vi.fn()
    const { result } = viewState({}, updateSettings)
    act(() => result.current.handleToggleSourceControlGrouping())
    expect(updateSettings).toHaveBeenCalledWith({ sourceControlGrouping: 'status' })
  })
})
