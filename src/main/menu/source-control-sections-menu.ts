import {
  SOURCE_CONTROL_SECTIONS,
  type SourceControlSectionId
} from '../../shared/source-control-sections'
import { translateMain } from '../i18n/main-i18n'

// Fork: View > Source Control Sections turns each section of the source-control panel on or off.
export function buildSourceControlSectionsSubmenu(
  hidden: readonly string[],
  onToggle: (id: SourceControlSectionId) => void
): Electron.MenuItemConstructorOptions {
  return {
    label: translateMain('menu.sourceControlSections', 'Source Control Sections'),
    submenu: SOURCE_CONTROL_SECTIONS.map((section) => ({
      label: translateMain(section.labelKey, section.label),
      type: 'checkbox' as const,
      checked: !hidden.includes(section.id),
      click: () => onToggle(section.id)
    }))
  }
}
