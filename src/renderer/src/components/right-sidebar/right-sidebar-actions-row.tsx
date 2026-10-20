import React from 'react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import { TabBarQuickCommandsButton } from '@/components/tab-bar/TabBarQuickCommandsButton'
import { resolveCmdJActiveGroupId } from '@/components/cmd-j/quick-action-context'
import { AutoMergeMenuButton } from './auto-merge/AutoMergeMenuButton'
import { FrontendDevServerButton } from './FrontendDevServerButton'
import { PreviewDeploymentButton } from './PreviewDeploymentButton'
import { WorkspaceActionButtons } from './workspace-actions/WorkspaceActionButtons'
import { RIGHT_SIDEBAR_HEADER_NO_DRAG_CLASS_NAME } from './right-sidebar-titlebar-drag-regions'

/** Quick commands, scoped to whichever workspace and pane the app is focused on. */
function ActiveWorkspaceQuickCommands(): React.JSX.Element | null {
  const worktreeId = useAppStore((s) => s.activeWorktreeId)
  const groupId = useAppStore((s) => resolveCmdJActiveGroupId(s, s.activeWorktreeId))
  if (!worktreeId || !groupId) {
    return null
  }
  return <TabBarQuickCommandsButton worktreeId={worktreeId} groupId={groupId} />
}

/**
 * The right sidebar's upper row: everything that *does* something, so the row below
 * is only places to look. Keeping them apart is why neither needs an overflow menu.
 */
export function RightSidebarActionsRow({
  trailing
}: {
  trailing: React.ReactNode
}): React.JSX.Element {
  return (
    <div
      className={cn('flex shrink-0 items-center gap-0.5', RIGHT_SIDEBAR_HEADER_NO_DRAG_CLASS_NAME)}
    >
      <ActiveWorkspaceQuickCommands />
      <WorkspaceActionButtons />
      <FrontendDevServerButton />
      <PreviewDeploymentButton />
      <AutoMergeMenuButton />
      {trailing}
    </div>
  )
}
