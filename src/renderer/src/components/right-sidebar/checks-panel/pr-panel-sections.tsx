import React from 'react'
import { useAppStore } from '@/store'
import {
  moveSourceControlSection,
  orderPrPanelSections,
  toggleSourceControlSectionHidden,
  type PrPanelSectionId
} from '../../../../../shared/source-control-sections'
import { SectionDropZone } from '../source-control/panel/section-drop-zone'

export type PrPanelSection = { id: PrPanelSectionId; node: React.ReactNode }

// Fork: the PR panel's sections under its review header, in the user's dragged order, without the
// ones hidden from a header's context menu or View > PR Panel Sections.
export function PrPanelSections({
  sections
}: {
  sections: readonly PrPanelSection[]
}): React.JSX.Element {
  const layout = useAppStore((s) => s.settings?.sourceControlSectionLayout)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const hidden = layout?.pr?.hidden ?? []
  const order = orderPrPanelSections(layout?.pr?.order)
  const nodeById = new Map(sections.map((section) => [section.id, section.node]))
  const visible = order.filter((id) => nodeById.has(id) && !hidden.includes(id))
  const savePr = (pr: { order?: string[]; hidden?: string[] }): void => {
    void updateSettings({ sourceControlSectionLayout: { ...layout, pr: { ...layout?.pr, ...pr } } })
  }

  return (
    <>
      {visible.map((id) => (
        <SectionDropZone
          key={id}
          id={id}
          order={visible}
          onMove={(moved, beforeId) =>
            savePr({ order: moveSourceControlSection(order, moved, beforeId) })
          }
          onHide={(hiddenId) =>
            savePr({ hidden: toggleSourceControlSectionHidden(hidden, hiddenId) })
          }
        >
          {nodeById.get(id)}
        </SectionDropZone>
      ))}
    </>
  )
}
