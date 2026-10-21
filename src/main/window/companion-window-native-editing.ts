import { Menu, type BrowserWindow, type WebContents } from 'electron'
import { COMPANION_USER_AGENT_TOKEN } from '../../shared/companion-window-user-agent'

// Why: the companion window loads the browser web client with no preload, so Orca's
// renderer-owned clipboard routing (`ui:appMenuPaste`, `ui:editableContextPaste`) lands on a
// noop listener there; Chromium's native editing commands are the only ones that reach it.
export function ownsNativeEditingCommands(
  contents: Pick<WebContents, 'getUserAgent'> | null | undefined
): boolean {
  return contents?.getUserAgent().includes(COMPANION_USER_AGENT_TOKEN) === true
}

export function installCompanionEditingContextMenu(window: BrowserWindow): void {
  window.webContents.on('context-menu', (_event, params) => {
    if (!params.isEditable || window.isDestroyed()) {
      return
    }
    const suggestions: Electron.MenuItemConstructorOptions[] = params.dictionarySuggestions
      .slice(0, 5)
      .map((suggestion) => ({
        label: suggestion,
        click: () => window.webContents.replaceMisspelling(suggestion)
      }))
    Menu.buildFromTemplate([
      ...suggestions,
      ...(suggestions.length > 0 ? [{ type: 'separator' as const }] : []),
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'pasteAndMatchStyle' },
      { role: 'selectAll' }
    ]).popup({ window, x: params.x, y: params.y })
  })
}
