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
import { launchWorkspaceAction, type WorkspaceActionLaunch } from './launch-workspace-action'

function primaryCopy(action: WorkspaceActionKind): { label: string; icon: React.JSX.Element } {
  switch (action) {
    case 'commit-and-push':
      return {
        label: translate('auto.components.workspaceActions.commitAndPush', 'Commit & push'),
        icon: <Upload className="size-3.5" />
      }
    case 'resolve-conflicts':
      return {
        label: translate('auto.components.workspaceActions.resolveConflicts', 'Resolve conflicts'),
        icon: <GitMerge className="size-3.5" />
      }
    case 'ready-for-review':
      return {
        label: translate('auto.components.workspaceActions.readyForReview', 'Ready for review'),
        icon: <CircleCheck className="size-3.5" />
      }
    case 'create-pull-request':
      return {
        label: translate('auto.components.workspaceActions.createPr', 'Create PR'),
        icon: <GitPullRequestArrow className="size-3.5" />
      }
  }
}

type MenuEntry = { kind: WorkspaceActionLaunch; label: string; icon: React.JSX.Element }

/**
 * One verb, plus the variants of that same verb behind a chevron — the shape the tab bar's
 * quick-commands button already uses, so the header row reads as one kind of control.
 */
function SplitActionButton({
  label,
  icon,
  disabled,
  primaryKind,
  menuLabel,
  menuEntries,
  onRun,
  ...surfaceProps
}: {
  label: string
  icon: React.JSX.Element
  disabled: boolean
  primaryKind: WorkspaceActionLaunch
  menuLabel: string
  menuEntries: readonly MenuEntry[]
  onRun: (kind: WorkspaceActionLaunch) => void
} & React.ComponentProps<'div'>): React.JSX.Element {
  return (
    <TooltipProvider delayDuration={400}>
      <div className={SPLIT_BUTTON_SURFACE_CLASS} {...surfaceProps}>
        {/* Why no tooltip: the label is always visible, so it would only repeat the button. */}
        <button
          type="button"
          className={cn(SPLIT_BUTTON_SEGMENT_CLASS, SPLIT_BUTTON_MAIN_SEGMENT_CLASS)}
          aria-label={label}
          disabled={disabled}
          onClick={() => onRun(primaryKind)}
        >
          {icon}
          <span className="text-[12px] font-medium">{label}</span>
        </button>
        {menuEntries.length > 0 ? (
          <DropdownMenu modal={false}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(SPLIT_BUTTON_SEGMENT_CLASS, SPLIT_BUTTON_MENU_SEGMENT_CLASS)}
                    aria-label={menuLabel}
                    disabled={disabled}
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
              {menuEntries.map((entry) => (
                <DropdownMenuItem key={entry.kind} onSelect={() => onRun(entry.kind)}>
                  {entry.icon}
                  {entry.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </TooltipProvider>
  )
}

export function WorkspaceActionButtons(): React.JSX.Element | null {
  const action = useAppStore((state) => selectWorkspaceActionContext(state)?.action ?? null)
  const canReview = useAppStore((state) => {
    const pr = selectWorkspaceActionContext(state)?.pr
    return pr?.state === 'open' || pr?.state === 'draft'
  })
  const [busy, setBusy] = useState<WorkspaceActionLaunch | null>(null)
  if (!action && !canReview) {
    return null
  }
  const run = (kind: WorkspaceActionLaunch): void => {
    setBusy(kind)
    void launchWorkspaceAction(kind).finally(() => setBusy(null))
  }
  const primary = action ? primaryCopy(action) : null
  // Why only Create PR carries a variant: draft is a property of the pull request being opened.
  // Commit & push, Resolve conflicts and Ready for review have no second form.
  const primaryMenuEntries: MenuEntry[] =
    action === 'create-pull-request'
      ? [
          {
            kind: 'primary-draft',
            label: translate('auto.components.workspaceActions.createDraftPr', 'Create draft PR'),
            icon: <GitPullRequestDraft className="size-3.5" />
          }
        ]
      : []
  return (
    <div className="flex shrink-0 items-center gap-1 pr-1" data-workspace-action-buttons="">
      {canReview ? (
        <SplitActionButton
          label={translate('auto.components.workspaceActions.review', 'Review')}
          icon={<ScanEye className="size-3.5" />}
          disabled={busy !== null}
          menuLabel={translate(
            'auto.components.workspaceActions.moreReviewActions',
            'More review actions'
          )}
          menuEntries={[
            {
              kind: 're-review',
              label: translate('auto.components.workspaceActions.reReview', 'Re-review'),
              icon: <ScanSearch className="size-3.5" />
            }
          ]}
          primaryKind="review"
          onRun={run}
        />
      ) : null}
      {primary ? (
        <SplitActionButton
          label={primary.label}
          icon={primary.icon}
          disabled={busy !== null}
          menuLabel={translate(
            'auto.components.workspaceActions.morePrActions',
            'More pull request actions'
          )}
          menuEntries={primaryMenuEntries}
          primaryKind="primary"
          onRun={run}
          data-workspace-action={action}
        />
      ) : null}
    </div>
  )
}
