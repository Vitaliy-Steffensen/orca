import React, { createContext, useContext, useMemo } from 'react'
import { EyeOff } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { translate } from '@/i18n/i18n'

export const SECTION_DRAG_MIME = 'application/x-orca-source-control-section'

type SectionChrome = { sectionId: string; onHide: () => void }

const SectionChromeContext = createContext<SectionChrome | null>(null)

// Fork: a section of the source-control panel. Its header becomes the drag handle that reorders
// it, and its context menu hides it.
export function SectionChromeProvider({
  sectionId,
  onHide,
  children
}: SectionChrome & { children: React.ReactNode }): React.JSX.Element {
  const value = useMemo(() => ({ sectionId, onHide }), [onHide, sectionId])
  return <SectionChromeContext.Provider value={value}>{children}</SectionChromeContext.Provider>
}

/** Wraps a section header in its section's drag handle and Hide menu, if it has a section. */
export function SectionHeaderChrome({
  children
}: {
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>
}): React.JSX.Element {
  const chrome = useContext(SectionChromeContext)
  if (!chrome) {
    return children
  }
  const handle = React.cloneElement(children, {
    draggable: true,
    onDragStart: (event: React.DragEvent<HTMLElement>) => {
      event.dataTransfer.setData(SECTION_DRAG_MIME, chrome.sectionId)
      event.dataTransfer.effectAllowed = 'move'
    }
  })
  return <HideSectionContextMenu onHide={chrome.onHide}>{handle}</HideSectionContextMenu>
}

/** Right-click offers to hide the section; a nested menu, like a commit row's, wins. */
export function HideSectionContextMenu({
  onHide,
  children
}: {
  onHide: () => void
  children: React.ReactElement
}): React.JSX.Element {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={onHide}>
          <EyeOff className="size-3.5" />
          {translate('sourceControlSections.hide', 'Hide section')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

/** Where a dragged section lands when dropped on `targetId`'s top or bottom half. */
export function dropBeforeId<Id extends string>(
  order: readonly Id[],
  targetId: Id,
  half: 'top' | 'bottom'
): Id | null {
  if (half === 'top') {
    return targetId
  }
  return order[order.indexOf(targetId) + 1] ?? null
}
