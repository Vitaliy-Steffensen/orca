import React, { useCallback, useState } from "react";
import {
  Bell,
  Check,
  FolderPlus,
  GitBranch,
  MoreHorizontal,
  SlidersHorizontal,
} from "lucide-react";
import { useAppStore } from "@/store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { translate } from "@/i18n/i18n";
import { OptionsFilterCountBadge } from "./options-filter-count-badge";
import {
  useWorkspaceOptionsFilterBadge,
  WorkspaceOptionsMenuItems,
} from "./workspace-options-menu-items";

type SidebarHeaderOverflowMenuProps = {
  agentsViewActive: boolean;
  onMenuOpenChange?: (open: boolean) => void;
};

export const SidebarHeaderOverflowMenu = React.memo(
  function SidebarHeaderOverflowMenu({
    agentsViewActive,
    onMenuOpenChange,
  }: SidebarHeaderOverflowMenuProps) {
    const [open, setOpen] = useState(false);
    const openModal = useAppStore((s) => s.openModal);
    const setSidebarBody = useAppStore((s) => s.setSidebarBody);
    const hideDefaultBranchWorkspace = useAppStore(
      (s) => s.hideDefaultBranchWorkspace,
    );
    const setHideDefaultBranchWorkspace = useAppStore(
      (s) => s.setHideDefaultBranchWorkspace,
    );
    const { activeFilterCount } = useWorkspaceOptionsFilterBadge();
    const moreLabel = translate("dashboard.sidebar.more", "More");
    const mainWorkspaceLabel = translate(
      hideDefaultBranchWorkspace
        ? "dashboard.sidebar.showMainWorkspace"
        : "dashboard.sidebar.hideMainWorkspace",
      hideDefaultBranchWorkspace
        ? "Show main workspace"
        : "Hide main workspace",
    );
    const activityLabel = translate(
      agentsViewActive
        ? "dashboard.sidebar.closeActivity"
        : "dashboard.sidebar.openActivity",
      agentsViewActive ? "Turn off activity view" : "View activity",
    );

    const handleOpenChange = useCallback(
      (next: boolean) => {
        setOpen(next);
        onMenuOpenChange?.(next);
      },
      [onMenuOpenChange],
    );

    return (
      <DropdownMenu modal={false} open={open} onOpenChange={handleOpenChange}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                type="button"
                className="relative text-muted-foreground"
                aria-label={moreLabel}
                data-workspace-board-preserve-open=""
              >
                <MoreHorizontal className="size-3.5" strokeWidth={2.25} />
                {agentsViewActive ? null : (
                  <OptionsFilterCountBadge count={activeFilterCount} />
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {moreLabel}
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          side="right"
          align="start"
          sideOffset={8}
          className="w-52"
          data-workspace-board-preserve-open=""
        >
          <DropdownMenuItem
            onSelect={() =>
              setSidebarBody?.(agentsViewActive ? "workspaces" : "agents")
            }
          >
            <Bell className="size-3.5" />
            {activityLabel}
            {agentsViewActive ? <Check className="ml-auto size-3.5" /> : null}
          </DropdownMenuItem>
          {agentsViewActive ? null : (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setHideDefaultBranchWorkspace(!hideDefaultBranchWorkspace);
              }}
            >
              <GitBranch className="size-3.5" />
              {mainWorkspaceLabel}
              {hideDefaultBranchWorkspace ? (
                <Check className="ml-auto size-3.5" />
              ) : null}
            </DropdownMenuItem>
          )}
          {agentsViewActive ? null : (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <SlidersHorizontal className="size-3.5" />
                {translate(
                  "auto.components.sidebar.SidebarWorkspaceOptionsMenu.9919ae1082",
                  "Workspace options",
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent
                className="w-72"
                data-workspace-board-preserve-open=""
              >
                <WorkspaceOptionsMenuItems preserveWorkspaceBoardOpen />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuItem onSelect={() => openModal("add-repo")}>
            <FolderPlus className="size-3.5" />
            {translate(
              "auto.components.sidebar.SidebarHeader.addProject",
              "Add project",
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  },
);
