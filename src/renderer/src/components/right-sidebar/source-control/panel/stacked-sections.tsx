import React from 'react'
import { SectionDropZone } from './section-drop-zone'
import type { MovableSourceControlSectionId } from '../../../../../../shared/source-control-sections'

export type StackedSection = {
  id: Exclude<MovableSourceControlSectionId, 'changes'>
  node: React.ReactNode
}

// Fork: the source-control sections stack in one scroller, each as tall as its content, so opening
// one never takes height from another. They follow the user's order, set by dragging a section's
// header onto another; the changed files are `children`, and Commits (`footer`) closes the list.
export function SourceControlStackedSections({
  shelves,
  order,
  onMove,
  onHide,
  scrollRef,
  scrollStyle,
  footer,
  children
}: {
  shelves: readonly StackedSection[]
  order: readonly MovableSourceControlSectionId[]
  onMove: (
    id: MovableSourceControlSectionId,
    beforeId: MovableSourceControlSectionId | null
  ) => void
  onHide: (id: MovableSourceControlSectionId) => void
  scrollRef: (node: HTMLDivElement | null) => void
  scrollStyle?: React.CSSProperties
  footer?: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  const shelfById = new Map(shelves.map((shelf) => [shelf.id, shelf]))
  const visible = order.filter((id) => id === 'changes' || shelfById.has(id))
  return (
    <div
      ref={scrollRef}
      className="relative min-h-0 flex-1 overflow-auto scrollbar-sleek"
      style={scrollStyle}
    >
      {visible.map((id) => (
        <SectionDropZone key={id} id={id} order={visible} onMove={onMove} onHide={onHide}>
          {id === 'changes' ? children : shelfById.get(id)?.node}
        </SectionDropZone>
      ))}
      {footer}
    </div>
  )
}
