import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { translate } from '@/i18n/i18n'
import type { Repo } from '../../../../shared/repo-types'
import type { WorkspaceStatusDefinition } from '../../../../shared/worktree/types'
import type {
  WorkspaceStatusRuleCondition,
  WorkspaceStatusRuleConfig
} from '../../../../shared/workspace-status-rule-config'
import { SettingsRow } from './SettingsFormControls'
import { getPullRequestStatusRuleCopy } from './pull-request-status-rule-copy'

const UNMAPPED = '__none__'

function StatusSelect({
  label,
  value,
  statuses,
  onChange
}: {
  label: string
  value: string | null | undefined
  statuses: readonly WorkspaceStatusDefinition[]
  onChange: (status: string | undefined) => void
}): React.JSX.Element {
  return (
    <Select
      value={value ?? UNMAPPED}
      onValueChange={(next) => onChange(next === UNMAPPED ? undefined : next)}
    >
      <SelectTrigger size="sm" aria-label={label} className="h-7 w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNMAPPED}>
          {translate('auto.components.settings.prRules.noColumn', 'Do nothing')}
        </SelectItem>
        {statuses.map((status) => (
          <SelectItem key={status.id} value={status.id}>
            {status.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function ProjectScopeRow({
  repos,
  repoIds,
  onToggle
}: {
  repos: readonly Repo[]
  repoIds: readonly string[]
  onToggle: (repoId: string, selected: boolean) => void
}): React.JSX.Element {
  return (
    <SettingsRow
      alignTop
      label={translate('auto.components.settings.prRules.projects', 'Projects')}
      description={translate(
        'auto.components.settings.prRules.projectsDescription',
        'The rules only touch workspaces in these projects, and only look for review requests there.'
      )}
      control={
        <div className="scrollbar-sleek flex max-h-40 flex-col gap-2 overflow-y-auto pr-1">
          {repos.map((repo) => (
            <div key={repo.id} className="flex items-center gap-2">
              <Checkbox
                id={`pr-rule-repo-${repo.id}`}
                checked={repoIds.includes(repo.id)}
                onCheckedChange={(checked) => onToggle(repo.id, checked === true)}
              />
              <Label htmlFor={`pr-rule-repo-${repo.id}`}>{repo.displayName}</Label>
            </div>
          ))}
        </div>
      }
    />
  )
}

export function ConditionRow({
  condition,
  config,
  statuses,
  onChange
}: {
  condition: WorkspaceStatusRuleCondition
  config: WorkspaceStatusRuleConfig
  statuses: readonly WorkspaceStatusDefinition[]
  onChange: (condition: WorkspaceStatusRuleCondition, status: string | undefined) => void
}): React.JSX.Element {
  const copy = getPullRequestStatusRuleCopy()[condition]
  return (
    <SettingsRow
      label={copy.label}
      description={copy.description}
      control={
        <StatusSelect
          label={copy.label}
          value={config.statusByCondition[condition]}
          statuses={statuses}
          onChange={(status) => onChange(condition, status)}
        />
      }
    />
  )
}

export function NewWorkspaceStatusRow({
  value,
  statuses,
  onChange
}: {
  value: string | null
  statuses: readonly WorkspaceStatusDefinition[]
  onChange: (status: string | undefined) => void
}): React.JSX.Element {
  const label = translate(
    'auto.components.settings.prRules.newWorkspace',
    'New workspaces start in'
  )
  return (
    <SettingsRow
      label={label}
      description={translate(
        'auto.components.settings.prRules.newWorkspaceDescription',
        'Where a workspace Orca creates in these projects goes before it has a pull request. Workspaces that already exist keep their column.'
      )}
      control={<StatusSelect label={label} value={value} statuses={statuses} onChange={onChange} />}
    />
  )
}

export function AutomationStartStatusRow({
  value,
  statuses,
  onChange
}: {
  value: string | null
  statuses: readonly WorkspaceStatusDefinition[]
  onChange: (status: string | undefined) => void
}): React.JSX.Element {
  const label = translate(
    'auto.components.settings.prRules.automationLane',
    'Automation runs wait in'
  )
  return (
    <SettingsRow
      label={label}
      description={translate(
        'auto.components.settings.prRules.automationLaneDescription',
        'A workspace Orca starts an agent in goes here and stays here for the whole run, so no rule moves it halfway through. Picking a column makes it the holding column; the review workspaces Orca opens for you start in it.'
      )}
      control={<StatusSelect label={label} value={value} statuses={statuses} onChange={onChange} />}
    />
  )
}

export function AutomationReleaseStatusRow({
  value,
  statuses,
  onChange
}: {
  value: string | null
  statuses: readonly WorkspaceStatusDefinition[]
  onChange: (status: string | undefined) => void
}): React.JSX.Element {
  const label = translate(
    'auto.components.settings.prRules.automationRelease',
    'When a run ends with no pull request'
  )
  return (
    <SettingsRow
      label={label}
      description={translate(
        'auto.components.settings.prRules.automationReleaseDescription',
        'Where the holding column sends a workspace once its agents have been done for a while. One that does have a pull request goes to the column its state maps to above instead — a review you were asked for lands in "You are the reviewer".'
      )}
      control={<StatusSelect label={label} value={value} statuses={statuses} onChange={onChange} />}
    />
  )
}
