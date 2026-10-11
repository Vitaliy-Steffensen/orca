import {
  PR_PANEL_SECTIONS,
  SOURCE_CONTROL_SECTIONS,
  type PanelSection
} from '../../shared/source-control-sections'
import type { GlobalSettings } from '../../shared/global-settings-types'
import { translateMain } from '../i18n/main-i18n'

export type PanelSectionsPanel = 'sourceControl' | 'pr'

function sectionsSubmenu(
  label: string,
  sections: readonly PanelSection[],
  hidden: readonly string[],
  onToggle: (id: string) => void
): Electron.MenuItemConstructorOptions {
  return {
    label,
    submenu: sections.map((section) => ({
      label: translateMain(section.labelKey, section.label),
      type: 'checkbox' as const,
      checked: !hidden.includes(section.id),
      click: () => onToggle(section.id)
    }))
  }
}

// Fork: View > Source Control Sections and View > PR Panel Sections turn each section of those
// panels on or off.
export function buildPanelSectionsSubmenus(
  layout: GlobalSettings['sourceControlSectionLayout'],
  onToggle: (panel: PanelSectionsPanel, id: string) => void
): Electron.MenuItemConstructorOptions[] {
  return [
    sectionsSubmenu(
      translateMain('menu.sourceControlSections', 'Source Control Sections'),
      SOURCE_CONTROL_SECTIONS,
      layout?.hidden ?? [],
      (id) => onToggle('sourceControl', id)
    ),
    sectionsSubmenu(
      translateMain('menu.prPanelSections', 'PR Panel Sections'),
      PR_PANEL_SECTIONS,
      layout?.pr?.hidden ?? [],
      (id) => onToggle('pr', id)
    )
  ]
}
