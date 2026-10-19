import React from 'react'
import type { ActiveRightSidebarTab, ActivityBarPosition } from '@/store/slices/editor'
import type { CheckStatus } from '../../../../shared/github/pull-request-types'
import { cn } from '@/lib/utils'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu'
import { ActivityBarButton, TopActivityOverflowMenu } from './activity-bar-buttons'
import type { ActivityBarItem } from './activity-bar-buttons'
import { ActivityBarPositionMenu } from './activity-bar-position-menu'
import {
  RIGHT_SIDEBAR_HEADER_NO_DRAG_CLASS_NAME,
  RIGHT_SIDEBAR_TOP_ACTIVITY_STRIP_CLASS_NAME
} from './right-sidebar-titlebar-drag-regions'

/**
 * Two rows: actions on top, view tabs underneath. They used to share one 36px strip,
 * which is why tabs kept disappearing behind a More menu whenever an action appeared.
 */
export function RightSidebarTopActivityBar({
  topActivityStripRef,
  topActivityLayout,
  effectiveTab,
  onSelectTab,
  checksStatus,
  actionsRow,
  activityBarPosition,
  onChangeActivityBarPosition
}: {
  topActivityStripRef: (node: HTMLDivElement | null) => void
  topActivityLayout: {
    visibleItems: ActivityBarItem[]
    overflowItems: ActivityBarItem[]
    compact: boolean
  }
  effectiveTab: ActiveRightSidebarTab
  onSelectTab: (tab: ActiveRightSidebarTab) => void
  checksStatus: CheckStatus | null
  actionsRow: React.ReactNode
  activityBarPosition: ActivityBarPosition
  onChangeActivityBarPosition: (pos: ActivityBarPosition) => void
}): React.JSX.Element {
  return (
    <ContextMenu>
      <TooltipProvider delayDuration={400}>
        {/* ── Row 1: actions. Shares the titlebar, so the empty left half stays draggable. ── */}
        <div className="flex h-[36px] min-h-[36px] items-center overflow-hidden border-b border-border right-sidebar-header-inset right-sidebar-header-drag">
          <div className="ml-auto flex shrink-0 items-center pr-1">{actionsRow}</div>
        </div>
        {/* ── Row 2: view tabs, with the whole panel width to themselves. ── */}
        <ContextMenuTrigger asChild>
          <div
            ref={topActivityStripRef}
            className={cn(
              RIGHT_SIDEBAR_TOP_ACTIVITY_STRIP_CLASS_NAME,
              RIGHT_SIDEBAR_HEADER_NO_DRAG_CLASS_NAME
            )}
          >
            <div className="flex min-w-0 shrink">
              {topActivityLayout.visibleItems.map((item) => (
                <ActivityBarButton
                  key={item.id}
                  item={item}
                  active={effectiveTab === item.id}
                  onClick={() => onSelectTab(item.id)}
                  layout="top"
                  statusIndicator={item.id === 'checks' ? checksStatus : null}
                  compact={topActivityLayout.compact}
                />
              ))}
            </div>
            {topActivityLayout.overflowItems.length > 0 && (
              <TopActivityOverflowMenu
                items={topActivityLayout.overflowItems}
                activeTab={effectiveTab}
                onSelect={onSelectTab}
                checksStatus={checksStatus}
              />
            )}
          </div>
        </ContextMenuTrigger>
      </TooltipProvider>
      <ActivityBarPositionMenu
        currentPosition={activityBarPosition}
        onChangePosition={onChangeActivityBarPosition}
      />
    </ContextMenu>
  )
}
