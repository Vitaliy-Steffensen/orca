import { describe, expect, it, vi } from 'vitest'
import { buildPanelSectionsSubmenus } from './source-control-sections-menu'

describe('buildPanelSectionsSubmenus', () => {
  it('lists every section of both panels as a visibility checkbox', () => {
    const onToggle = vi.fn()
    const [sourceControl, prPanel] = buildPanelSectionsSubmenus(
      { hidden: ['commits'], pr: { hidden: ['pr-checks'] } },
      onToggle
    )
    const rows = (menu: Electron.MenuItemConstructorOptions) =>
      (menu.submenu as Electron.MenuItemConstructorOptions[]).map((item) => [
        item.label,
        item.type,
        item.checked
      ])
    expect(sourceControl.label).toBe('Source Control Sections')
    expect(rows(sourceControl)).toEqual([
      ['Review', 'checkbox', true],
      ['Pending review', 'checkbox', true],
      ['Agent notes', 'checkbox', true],
      ['Agent turns', 'checkbox', true],
      ['Changes', 'checkbox', true],
      ['Staged Changes', 'checkbox', true],
      ['Unstaged Changes', 'checkbox', true],
      ['Commits', 'checkbox', false]
    ])
    expect(prPanel.label).toBe('PR Panel Sections')
    expect(rows(prPanel)).toEqual([
      ['Needs attention', 'checkbox', true],
      ['Checks', 'checkbox', false],
      ['Pending review', 'checkbox', true],
      ['Comments', 'checkbox', true],
      ['Resolved', 'checkbox', true]
    ])

    const items = prPanel.submenu as Electron.MenuItemConstructorOptions[]
    items[1].click?.({} as never, undefined, {} as never)
    expect(onToggle).toHaveBeenCalledWith('pr', 'pr-checks')
  })
})
