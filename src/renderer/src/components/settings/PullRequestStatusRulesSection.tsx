import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { Button } from '@/components/ui/button'
import type {
  WorkspaceStatusRuleCondition,
  WorkspaceStatusRuleConfig
} from '../../../../shared/workspace-status-rule-config'
import { applyAutomationHoldLane } from '../../../../shared/workspace-automation-lane'
import { SettingsRow } from './SettingsFormControls'
import { PullRequestStatusRuleTabs } from './PullRequestStatusRuleTabs'

export function PullRequestStatusRulesSection(): React.JSX.Element {
  const config = useAppStore((state) => state.workspaceStatusRules)
  const statuses = useAppStore((state) => state.workspaceStatuses)
  const repos = useAppStore((state) => state.repos)
  const setWorkspaceStatusRules = useAppStore((state) => state.setWorkspaceStatusRules)
  const setWorkspaceStatuses = useAppStore((state) => state.setWorkspaceStatuses)
  const openAutomationsPage = useAppStore((state) => state.openAutomationsPage)

  const patch = (updates: Partial<WorkspaceStatusRuleConfig>): void => {
    setWorkspaceStatusRules({ ...config, ...updates })
  }
  const setCondition = (
    condition: WorkspaceStatusRuleCondition,
    status: string | undefined
  ): void => {
    const next = { ...config.statusByCondition }
    if (status) {
      next[condition] = status
    } else {
      delete next[condition]
    }
    patch({ statusByCondition: next })
  }
  // Why both writes: the column only holds a run because of the flag on its definition, so the
  // choice has to reach the board's columns as well as the rules.
  const setAutomationStartStatus = (status: string | null): void => {
    patch({ automationStartStatus: status })
    setWorkspaceStatuses(applyAutomationHoldLane(statuses, status))
  }

  return (
    <section className="divide-y divide-border">
      <SettingsRow
        label={translate(
          'auto.components.settings.prRules.scheduledBy',
          'Scheduled by the Pull request sync automation'
        )}
        description={translate(
          'auto.components.settings.prRules.scheduledByDescription',
          'When it runs, and whether it runs, is on the Automations page. The rules below are what each check does.'
        )}
        control={
          <Button type="button" variant="outline" size="sm" onClick={() => openAutomationsPage()}>
            {translate('auto.components.settings.prRules.openAutomation', 'Open automation')}
          </Button>
        }
      />
      <PullRequestStatusRuleTabs
        config={config}
        statuses={statuses}
        repos={repos}
        patch={patch}
        setCondition={setCondition}
        setAutomationStartStatus={setAutomationStartStatus}
      />
    </section>
  )
}
