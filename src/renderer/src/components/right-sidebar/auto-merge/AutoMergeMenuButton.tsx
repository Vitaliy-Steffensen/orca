import React from 'react'
import { GitMerge, GitPullRequestArrow, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { MenuSwitchRow } from '@/components/menu-switch-row'
import { OptionsFilterCountBadge } from '@/components/sidebar/options-filter-count-badge'
import { translate } from '@/i18n/i18n'
import type { WorkspaceAutoMergePolicy } from '../../../../../shared/workspace-auto-merge-policy'
import { useAutoMergePolicy } from './use-auto-merge-policy'

function activeToggleCount(policy: WorkspaceAutoMergePolicy): number {
  return policy.enabled ? 1 + Number(policy.resolveConflicts) + Number(policy.fixFailingChecks) : 0
}

function describePolicy(policy: WorkspaceAutoMergePolicy): string {
  if (!policy.enabled) {
    return translate(
      'auto.components.autoMerge.tooltipOff',
      'Auto-merge off. Orca will not land this PR.'
    )
  }
  const extras = [
    policy.resolveConflicts
      ? translate('auto.components.autoMerge.clueConflicts', 'resolving conflicts')
      : null,
    policy.fixFailingChecks
      ? translate('auto.components.autoMerge.clueChecks', 'fixing failing CI')
      : null
  ].filter((entry) => entry !== null)
  const base = translate(
    'auto.components.autoMerge.tooltipOn',
    'Orca auto-merge: on top of GitHub auto-merge, Orca keeps watching this PR.'
  )
  return extras.length > 0 ? `${base} Also ${extras.join(' · ')}.` : base
}

export function AutoMergeMenuButton(): React.JSX.Element | null {
  const { available, policy, setToggle } = useAutoMergePolicy()
  if (!available) {
    return null
  }
  const label = translate('auto.components.autoMerge.label', 'Auto-merge')
  return (
    <DropdownMenu modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              type="button"
              className="relative text-muted-foreground"
              aria-label={label}
              data-auto-merge-trigger=""
            >
              <GitMerge className="size-3.5" strokeWidth={2.25} />
              <OptionsFilterCountBadge count={activeToggleCount(policy)} />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6} className="max-w-64">
          {describePolicy(policy)}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" side="bottom" sideOffset={4} className="w-72">
        <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
          {translate(
            'auto.components.autoMerge.explainer',
            'Orca is the source of truth. These run on top of GitHub auto-merge.'
          )}
        </p>
        <MenuSwitchRow
          icon={<GitPullRequestArrow className="size-3.5" />}
          label={label}
          checked={policy.enabled}
          onChange={(next) => setToggle('enabled', next)}
        />
        <MenuSwitchRow
          icon={<GitMerge className="size-3.5" />}
          label={translate('auto.components.autoMerge.resolveConflicts', 'Resolve conflicts')}
          checked={policy.resolveConflicts}
          disabled={!policy.enabled}
          indented
          onChange={(next) => setToggle('resolveConflicts', next)}
        />
        <MenuSwitchRow
          icon={<Wrench className="size-3.5" />}
          label={translate('auto.components.autoMerge.fixCi', 'Fix CI and rerun flaky tests')}
          checked={policy.fixFailingChecks}
          disabled={!policy.enabled}
          indented
          onChange={(next) => setToggle('fixFailingChecks', next)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
