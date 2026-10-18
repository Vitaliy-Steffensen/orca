import React from 'react'
import { Layers, MessageSquare } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getIntlLocale, translate } from '@/i18n/i18n'
import type { DiffAreaTotals } from '../../../../shared/diff-area'
import { diffAreaTotal, diffMixConicGradient } from './worktree-card-diff-mix'
import { resolveWorktreeCardFacts, type WorktreeCardFact } from './worktree-card-facts'
import type { WorktreeCardController } from './use-worktree-card-controller'

const PRIORITY_VARIANT = {
  1: 'cardChipAlert',
  2: 'cardChipWarn',
  3: 'cardChipQuiet',
  4: 'cardChipQuiet'
} as const

function formatCount(value: number): string {
  return value.toLocaleString(getIntlLocale())
}

function DiffFact({
  fact
}: {
  fact: Extract<WorktreeCardFact, { id: 'diff' }>
}): React.JSX.Element {
  const fileLabel =
    typeof fact.files === 'number'
      ? translate('auto.components.sidebar.worktreeCardFacts.diffFiles', '{{value0}} {{value1}}', {
          value0: formatCount(fact.files),
          value1:
            fact.files === 1
              ? translate('auto.components.sidebar.worktreeCardFacts.file', 'file')
              : translate('auto.components.sidebar.worktreeCardFacts.files', 'files')
        })
      : null
  const tooltip = fileLabel
    ? translate(
        'auto.components.sidebar.worktreeCardFacts.diffWithFiles',
        '+{{value0}} −{{value1}} across {{value2}}',
        { value0: formatCount(fact.added), value1: formatCount(fact.removed), value2: fileLabel }
      )
    : translate('auto.components.sidebar.worktreeCardFacts.diff', '+{{value0}} −{{value1}}', {
        value0: formatCount(fact.added),
        value1: formatCount(fact.removed)
      })
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex items-center gap-1 text-[10px] leading-none tabular-nums"
          data-worktree-card-fact="diff"
        >
          <span className="text-[color:var(--git-decoration-added)]">
            +{formatCount(fact.added)}
          </span>
          <span className="text-[color:var(--git-decoration-deleted)]">
            −{formatCount(fact.removed)}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

function mixTooltip(areas: DiffAreaTotals): string {
  const total = diffAreaTotal(areas)
  const share = (value: number): string => `${Math.round((value / total) * 100)}%`
  return translate(
    'auto.components.sidebar.worktreeCardFacts.diffMix',
    'Frontend {{value0}}, backend {{value1}}, e2e {{value2}}, CI {{value3}}',
    {
      value0: share(areas.fe),
      value1: share(areas.be),
      value2: share(areas.e2e),
      value3: share(areas.ci)
    }
  )
}

function DiffMixFact({
  fact
}: {
  fact: Extract<WorktreeCardFact, { id: 'diff-mix' }>
}): React.JSX.Element {
  const label = mixTooltip(fact.areas)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-block size-3.5 shrink-0 rounded-full border border-border"
          style={{ background: diffMixConicGradient(fact.areas) }}
          data-worktree-card-fact="diff-mix"
          aria-label={label}
        />
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function FactBadge({
  id,
  variant,
  label,
  tooltip,
  icon
}: {
  id: string
  variant: 'cardChipAlert' | 'cardChipWarn' | 'cardChipQuiet'
  label: string
  tooltip: string
  icon?: React.ComponentType<{ className?: string }>
}): React.JSX.Element {
  const Icon = icon
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={variant} data-worktree-card-fact={id}>
          {Icon ? <Icon className="size-2.5" /> : null}
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

function priorityCopy(label: 'urgent' | 'high' | 'medium' | 'low'): string {
  switch (label) {
    case 'urgent':
      return translate('auto.components.sidebar.worktreeCardFacts.priority.urgent', 'Urgent')
    case 'high':
      return translate('auto.components.sidebar.worktreeCardFacts.priority.high', 'High')
    case 'medium':
      return translate('auto.components.sidebar.worktreeCardFacts.priority.medium', 'Medium')
    case 'low':
      return translate('auto.components.sidebar.worktreeCardFacts.priority.low', 'Low')
  }
}

function renderFact(fact: WorktreeCardFact): React.JSX.Element {
  switch (fact.id) {
    case 'diff':
      return <DiffFact key={fact.id} fact={fact} />
    case 'diff-mix':
      return <DiffMixFact key={fact.id} fact={fact} />
    case 'linear-priority':
      return (
        <FactBadge
          key={fact.id}
          id={fact.id}
          variant={PRIORITY_VARIANT[fact.priority]}
          label={priorityCopy(fact.label)}
          tooltip={translate(
            'auto.components.sidebar.worktreeCardFacts.priorityTooltip',
            'Linear priority: {{value0}}',
            { value0: priorityCopy(fact.label) }
          )}
        />
      )
    case 'stack':
      return (
        <FactBadge
          key={fact.id}
          id={fact.id}
          variant="cardChipQuiet"
          icon={Layers}
          label={`${fact.position}/${fact.size}`}
          tooltip={translate(
            'auto.components.sidebar.worktreeCardFacts.stack',
            'Pull request {{value0}} of {{value1}} in a GitHub stack',
            { value0: String(fact.position), value1: String(fact.size) }
          )}
        />
      )
    case 'unresolved-comments':
      return (
        <FactBadge
          key={fact.id}
          id={fact.id}
          variant="cardChipWarn"
          icon={MessageSquare}
          label={fact.truncated ? `${formatCount(fact.count)}+` : formatCount(fact.count)}
          tooltip={translate(
            'auto.components.sidebar.worktreeCardFacts.unresolved',
            '{{value0}} unresolved review comments',
            { value0: fact.truncated ? `${formatCount(fact.count)}+` : formatCount(fact.count) }
          )}
        />
      )
    case 'pr-open-age':
      return (
        <FactBadge
          key={fact.id}
          id={fact.id}
          variant="cardChipQuiet"
          label={translate('auto.components.sidebar.worktreeCardFacts.openAge', '{{value0}}d', {
            value0: String(fact.days)
          })}
          tooltip={translate(
            'auto.components.sidebar.worktreeCardFacts.openAgeTooltip',
            'Open for {{value0}} days',
            { value0: String(fact.days) }
          )}
        />
      )
  }
}

export function WorktreeCardReviewFacts({
  card
}: {
  card: WorktreeCardController
}): React.JSX.Element | null {
  const review = card.prDisplay && 'mergeable' in card.prDisplay ? card.prDisplay : null
  const facts = resolveWorktreeCardFacts({
    cardProps: card.cardProps,
    review,
    linearPriority: card.linearIssue?.priority,
    branchLineTotal: card.branchLineTotal
  })
  if (facts.length === 0) {
    return null
  }
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1" data-worktree-card-facts="">
      {facts.map((fact) => renderFact(fact))}
    </div>
  )
}
