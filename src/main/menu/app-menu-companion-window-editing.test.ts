import { describe, expect, it, vi } from 'vitest'

const { getFocusedWindowMock, getFocusedWebContentsMock, sendActionToFirstResponderMock } =
  vi.hoisted(() => ({
    getFocusedWindowMock: vi.fn(),
    getFocusedWebContentsMock: vi.fn(),
    sendActionToFirstResponderMock: vi.fn()
  }))

vi.mock('electron', () => ({
  BrowserWindow: { getFocusedWindow: getFocusedWindowMock },
  Menu: {
    buildFromTemplate: vi.fn(),
    sendActionToFirstResponder: sendActionToFirstResponderMock
  },
  webContents: { getFocusedWebContents: getFocusedWebContentsMock }
}))

import { createAppMenuPasteItem } from './app-menu-paste-item'
import { createAppMenuSelectionItem } from './app-menu-selection-item'

function focusWindow(userAgent: string) {
  const contents = {
    getUserAgent: () => userAgent,
    paste: vi.fn(),
    copy: vi.fn(),
    selectAll: vi.fn(),
    send: vi.fn()
  }
  getFocusedWindowMock.mockReturnValue({ webContents: contents })
  getFocusedWebContentsMock.mockReturnValue(contents)
  return contents
}

function click(item: Electron.MenuItemConstructorOptions): void {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: these items always define a click handler.
  ;(item.click as () => void)()
}

describe('app menu editing in the companion window', () => {
  it('runs native clipboard commands when the focused window is the companion web client', () => {
    const contents = focusWindow('Chrome/130 OrcaCompanionWindow')
    click(createAppMenuPasteItem({ label: 'Paste', isMac: true }))
    click(
      createAppMenuSelectionItem({
        action: 'copy',
        label: 'Copy',
        isMac: true
      })
    )
    click(
      createAppMenuSelectionItem({
        action: 'select-all',
        label: 'Select All',
        isMac: true
      })
    )
    expect(contents.paste).toHaveBeenCalledTimes(1)
    expect(contents.copy).toHaveBeenCalledTimes(1)
    expect(contents.selectAll).toHaveBeenCalledTimes(1)
    expect(contents.send).not.toHaveBeenCalled()
  })

  it('keeps renderer-owned routing for the desktop window', () => {
    const contents = focusWindow('Chrome/130 Orca/1.0')
    click(createAppMenuPasteItem({ label: 'Paste', isMac: true }))
    click(
      createAppMenuSelectionItem({
        action: 'copy',
        label: 'Copy',
        isMac: true
      })
    )
    expect(contents.paste).not.toHaveBeenCalled()
    expect(contents.copy).not.toHaveBeenCalled()
    expect(contents.send).toHaveBeenCalledWith('ui:appMenuPaste')
    expect(contents.send).toHaveBeenCalledWith('ui:appMenuSelectionAction', 'copy')
  })
})
