import { homedir } from 'node:os'
import { describe, expect, it, vi } from 'vitest'
import { getDefaultPersistedState } from '../../../shared/constants'
import type { PersistedState } from '../../../shared/persisted-state-types'
import { normalizeLoadedUiState } from './normalize-loaded-ui-state'

function loadUi(sidebarOrder: unknown) {
  const defaults = getDefaultPersistedState(homedir())
  const parsed: PersistedState = JSON.parse(
    JSON.stringify({
      ...defaults,
      ui: { ...defaults.ui, workspaceStatusSidebarOrder: sidebarOrder }
    })
  )
  return normalizeLoadedUiState(parsed, defaults, defaults.onboarding!, false, false, vi.fn())
}

describe('persisted sidebar status order', () => {
  it('round-trips the bands the user dragged', () => {
    expect(
      loadUi({ sections: ['Needs me', 'Ask'], manualLaneSections: ['Needs me'] })
        .workspaceStatusSidebarOrder
    ).toEqual({ sections: ['Needs me', 'Ask'], manualLaneSections: ['Needs me'] })
  })

  it('reads a missing or malformed order as no dragged order', () => {
    expect(loadUi(undefined).workspaceStatusSidebarOrder).toEqual({
      sections: [],
      manualLaneSections: []
    })
    expect(loadUi({ sections: ['  ', 7, 'Ask', 'Ask'] }).workspaceStatusSidebarOrder).toEqual({
      sections: ['Ask'],
      manualLaneSections: []
    })
  })
})
