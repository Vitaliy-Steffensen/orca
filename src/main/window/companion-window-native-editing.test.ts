import { beforeEach, describe, expect, it, vi } from 'vitest'

const { buildFromTemplateMock, popupMock } = vi.hoisted(() => ({
  buildFromTemplateMock: vi.fn(),
  popupMock: vi.fn()
}))

vi.mock('electron', () => ({
  Menu: { buildFromTemplate: buildFromTemplateMock }
}))

import { installCompanionEditingContextMenu } from './companion-window-native-editing'

function fakeWindow() {
  const listeners = new Map<string, (event: unknown, params: unknown) => void>()
  buildFromTemplateMock.mockReturnValue({ popup: popupMock })
  return {
    isDestroyed: () => false,
    webContents: {
      replaceMisspelling: vi.fn(),
      on: (event: string, listener: (event: unknown, params: unknown) => void) => {
        listeners.set(event, listener)
      }
    },
    emitContextMenu: (params: Partial<Electron.ContextMenuParams>) => {
      listeners.get('context-menu')?.({}, { dictionarySuggestions: [], ...params })
    }
  }
}

describe('companion window editing context menu', () => {
  beforeEach(() => {
    buildFromTemplateMock.mockClear()
    popupMock.mockClear()
  })

  it('offers native clipboard roles on an editable field', () => {
    const window = fakeWindow()
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the installer only reads the members this double provides.
    installCompanionEditingContextMenu(window as unknown as Electron.BrowserWindow)
    window.emitContextMenu({ isEditable: true, x: 4, y: 9 })
    expect(buildFromTemplateMock.mock.calls[0]?.[0]).toEqual([
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'pasteAndMatchStyle' },
      { role: 'selectAll' }
    ])
    expect(popupMock).toHaveBeenCalledWith({ window, x: 4, y: 9 })
  })

  it('shows no menu outside an editable field', () => {
    const window = fakeWindow()
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the installer only reads the members this double provides.
    installCompanionEditingContextMenu(window as unknown as Electron.BrowserWindow)
    window.emitContextMenu({ isEditable: false })
    expect(buildFromTemplateMock).not.toHaveBeenCalled()
  })
})
