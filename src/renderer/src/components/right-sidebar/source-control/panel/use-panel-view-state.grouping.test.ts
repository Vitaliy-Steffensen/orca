// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react'
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
  it('ignores a persisted grouping preference now that Changes, Staged and Unstaged always show', () => {
    const updateSettings = vi.fn()
    // A saved profile can still carry the removed key. It is ignored, with no settings rewrite.
    const persisted: Partial<GlobalSettings> = {}
    Object.assign(persisted, { sourceControlGrouping: 'status' })
    const { result } = viewState(persisted, updateSettings)
    expect(result.current).not.toHaveProperty('sourceControlGrouping')
    expect(result.current).not.toHaveProperty('handleToggleSourceControlGrouping')
    expect(updateSettings).not.toHaveBeenCalled()
  })
})
