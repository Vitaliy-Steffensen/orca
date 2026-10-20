import React, { useState } from 'react'
import {
  ChevronDown,
  CircleCheck,
  GitMerge,
  GitPullRequestArrow,
  GitPullRequestDraft,
  ScanEye,
  ScanSearch,
  Upload
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  SPLIT_BUTTON_MAIN_SEGMENT_CLASS,
  SPLIT_BUTTON_MENU_SEGMENT_CLASS,
  SPLIT_BUTTON_SEGMENT_CLASS,
  SPLIT_BUTTON_SURFACE_CLASS
} from '@/components/split-button-surface'
import { translate } from '@/i18n/i18n'
import type { WorkspaceActionKind } from '../../../../../shared/workspace-action'
import { selectWorkspaceActionContext } from './workspace-action-context'
import { launchWorkspaceAction } from './launch-workspace-action'

const EMPTY_ACTIONS: WorkspaceActionKind[] = []

function actionCopy(action: WorkspaceActionKind): { label: string; icon: React.JSX.Element } {
  switch (action) {
    case 'resolve-conflicts':
      return {
        label: translate('auto.components.workspaceActions.resolveConflicts', 'Resolve conflicts'),
        icon: <GitMerge className="size-3.5" />
      }
    case 'create-pull-request':
      return {
        label: translate('auto.components.workspaceActions.createPr', 'Create PR'),
        icon: <GitPullRequestArrow className="size-3.5" />
      }
    case 'create-draft-pull-request':
      return {
        label: translate('auto.components.workspaceActions.createDraftPr', 'Create draft PR'),
        icon: <GitPullRequestDraft className="size-3.5" />
      }
    case 'commit-and-push':
      return {
        label: translate('auto.components.workspaceActions.commitAndPush', 'Commit & push'),
        icon: <Upload className="size-3.5" />
      }
    case 'ready-for-review':
      return {
        label: translate('auto.components.workspaceActions.readyForReview', 'Ready for review'),
        icon: <CircleCheck className="size-3.5" />
      }
    case 'review':
      return {
        label: translate('auto.components.workspaceActions.review', 'Review'),
        icon: <ScanEye className="size-3.5" />
      }
    case 're-review':
      return {
        label: translate('auto.components.workspaceActions.reReview', 'Re-review'),
        icon: <ScanSearch className="size-3.5" />
      }
  }
}

/**
 * One control for the whole question "what can this branch do next" — the most urgent answer on the
 * face, the rest behind the chevron, and nothing at all when the branch has nothing to offer. It is
 * the shape the tab bar's quick-commands button already uses, so the header row reads as one kind
 * of control.
 */
export function WorkspaceActionButtons(): React.JSX.Element | null {
  const actions = useAppStore(
    useShallow((state) => selectWorkspaceActionContext(state)?.actions ?? EMPTY_ACTIONS)
  )
  const [busy, setBusy] = useState(false)
  const [primary, ...rest] = actions
  if (!primary) {
    return null
  }
  const run = (kind: WorkspaceActionKind): void => {
    setBusy(true)
    void launchWorkspaceAction(kind).finally(() => setBusy(false))
  }
  const copy = actionCopy(primary)
  const menuLabel = translate(
    'auto.components.workspaceActions.moreWorkspaceActions',
    'More workspace actions'
  )
  return (
    <div className="flex shrink-0 items-center gap-1 pr-1" data-workspace-action-buttons="">
      <TooltipProvider delayDuration={400}>
        <div className={SPLIT_BUTTON_SURFACE_CLASS} data-workspace-action={primary}>
          {/* Why no tooltip: the label is always visible, so it would only repeat the button. */}
          <button
            type="button"
            className={cn(SPLIT_BUTTON_SEGMENT_CLASS, SPLIT_BUTTON_MAIN_SEGMENT_CLASS)}
            aria-label={copy.label}
            disabled={busy}
            onClick={() => run(primary)}
          >
            {copy.icon}
            <span className="text-[12px] font-medium">{copy.label}</span>
          </button>
          {rest.length > 0 ? (
            <DropdownMenu modal={false}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(SPLIT_BUTTON_SEGMENT_CLASS, SPLIT_BUTTON_MENU_SEGMENT_CLASS)}
                      aria-label={menuLabel}
                      disabled={busy}
                    >
                      <ChevronDown className="size-3" strokeWidth={2.5} />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  {menuLabel}
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" side="bottom" sideOffset={4}>
                {rest.map((kind) => {
                  const entry = actionCopy(kind)
                  return (
                    <DropdownMenuItem key={kind} onSelect={() => run(kind)}>
                      {entry.icon}
                      {entry.label}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </TooltipProvider>
    </div>
  )
}
