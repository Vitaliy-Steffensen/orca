export function createAppWindowMenu(
  label: string,
  isMac: boolean,
  companion?: { label: string; onOpen: () => void }
): Electron.MenuItemConstructorOptions {
  return {
    label,
    submenu: [
      ...(companion
        ? [{ label: companion.label, click: companion.onOpen }, { type: 'separator' as const }]
        : []),
      {
        // Why: Electron's minimize role otherwise steals Ctrl+M from terminal apps such as Crush.
        role: 'minimize',
        ...(isMac ? {} : { accelerator: '', registerAccelerator: false })
      },
      { role: 'zoom' }
    ]
  }
}
