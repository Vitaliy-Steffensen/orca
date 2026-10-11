import { describe, expect, it, vi } from 'vitest'
import { buildSourceControlSectionsSubmenu } from './source-control-sections-menu'

describe('buildSourceControlSectionsSubmenu', () => {
  it('lists every source-control section as a visibility checkbox', () => {
    const onToggle = vi.fn()
    const menu = buildSourceControlSectionsSubmenu(['commits'], onToggle)
    expect(menu.label).toBe('Source Control Sections')
    const items = menu.submenu as Electron.MenuItemConstructorOptions[]
    expect(items.map((item) => [item.label, item.type, item.checked])).toEqual([
      ['Reviewers', 'checkbox', true],
      ['Pending review', 'checkbox', true],
      ['Agent notes', 'checkbox', true],
      ['Agent turns', 'checkbox', true],
      ['Changes', 'checkbox', true],
      ['Commits', 'checkbox', false]
    ])
    items[5].click?.({} as never, undefined, {} as never)
    expect(onToggle).toHaveBeenCalledWith('commits')
  })
})
