import React from 'react'
import { CalendarClock, Check, Crosshair, Kanban, List } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/store'
import { requestScrollToCurrentWorkspaceReveal } from '@/lib/scroll-to-current-workspace-status'
import { SidebarSettingsHelpMenu } from './SidebarSettingsHelpMenu'
import { translate } from '@/i18n/i18n'

type SidebarToolbarProps = {
  workspaceBoardOpen: boolean
  workspaceBoardDragPreviewOpen?: boolean
  onWorkspaceBoardToggle: () => void
}

const SidebarToolbar = React.memo(function SidebarToolbar({
  workspaceBoardOpen,
  workspaceBoardDragPreviewOpen = false,
  onWorkspaceBoardToggle
}: SidebarToolbarProps) {
  // Why: this memo boundary needs its own language subscription, while
  // translate() preserves Orca's pseudo-localization behavior. Without it the
  // toolbar keeps whatever language was active at boot — English, since the persisted locale
  // is applied asynchronously after the lazy catalog loads.
  useTranslation()
  const openTaskPage = useAppStore((s) => s.openTaskPage)
  const openAutomationsPage = useAppStore((s) => s.openAutomationsPage)

  return (
    <div className="mt-auto shrink-0">
      <div className="flex items-center justify-between border-t border-worktree-sidebar-border px-2 py-1.5">
        <div className="flex min-w-0 items-center gap-1">
          <SidebarSettingsHelpMenu
            overflowItems={
              <>
                <DropdownMenuItem onSelect={requestScrollToCurrentWorkspaceReveal}>
                  <Crosshair className="size-3.5" />
                  {translate(
                    'auto.components.sidebar.ScrollToCurrentWorkspaceToolbarButton.23989bb663',
                    'Reveal active workspace'
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-workspace-board-trigger=""
                  data-workspace-board-preview={workspaceBoardDragPreviewOpen ? 'true' : undefined}
                  onSelect={onWorkspaceBoardToggle}
                >
                  <Kanban className="size-3.5" />
                  {translate(
                    'auto.components.sidebar.SidebarToolbar.49f62c5665',
                    'Workspace board'
                  )}
                  {workspaceBoardOpen ? <Check className="ml-auto size-3.5" /> : null}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openTaskPage()}>
                  <List className="size-3.5" />
                  {translate('auto.components.sidebar.SidebarNav.fee535205b', 'Tasks')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={openAutomationsPage}>
                  <CalendarClock className="size-3.5" />
                  {translate('auto.components.sidebar.SidebarNav.f323383e9a', 'Automations')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            }
          />
        </div>
      </div>
    </div>
  )
})

export default SidebarToolbar
