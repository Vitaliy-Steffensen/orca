import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  orderSourceControlSections,
  type MovableSourceControlSectionId
} from '../../../../../../shared/source-control-sections'
import { SECTION_DRAG_MIME, SectionChromeProvider, dropBeforeId } from '../listing/section-chrome'

type Half = 'top' | 'bottom'

function halfOf(event: React.DragEvent<HTMLElement>): Half {
  const rect = event.currentTarget.getBoundingClientRect()
  return event.clientY <= rect.top + rect.height / 2 ? 'top' : 'bottom'
}

function draggedSectionId(
  event: React.DragEvent<HTMLElement>
): MovableSourceControlSectionId | null {
  const id = event.dataTransfer.getData(SECTION_DRAG_MIME)
  return orderSourceControlSections([]).find((candidate) => candidate === id) ?? null
}

// Fork: one section of the source-control panel, as a drop target for reordering by its header.
export function SectionDropZone({
  id,
  order,
  onMove,
  onHide,
  className,
  children
}: {
  id: MovableSourceControlSectionId
  order: readonly MovableSourceControlSectionId[]
  onMove: (
    id: MovableSourceControlSectionId,
    beforeId: MovableSourceControlSectionId | null
  ) => void
  onHide: (id: MovableSourceControlSectionId) => void
  className?: string
  children: React.ReactNode
}): React.JSX.Element {
  const [over, setOver] = useState<Half | null>(null)
  const isSectionDrag = (event: React.DragEvent<HTMLElement>): boolean =>
    Array.from(event.dataTransfer.types).includes(SECTION_DRAG_MIME)

  return (
    <div
      data-section-drop={id}
      className={cn('relative', className)}
      onDragOver={(event) => {
        if (!isSectionDrag(event)) {
          return
        }
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        setOver(halfOf(event))
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOver(null)
        }
      }}
      onDrop={(event) => {
        setOver(null)
        const dragged = draggedSectionId(event)
        if (!dragged) {
          return
        }
        event.preventDefault()
        onMove(dragged, dropBeforeId(order, id, halfOf(event)))
      }}
    >
      <SectionChromeProvider sectionId={id} onHide={() => onHide(id)}>
        {children}
      </SectionChromeProvider>
      {over ? (
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-primary',
            over === 'top' ? 'top-0' : 'bottom-0'
          )}
        />
      ) : null}
    </div>
  )
}
