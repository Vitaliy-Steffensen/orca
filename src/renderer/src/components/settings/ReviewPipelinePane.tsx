import { ScanEye } from 'lucide-react'
import {
  ORCA_REVIEW_SKILL_INSTALL_COMMAND,
  ORCA_REVIEW_SKILL_NAME
} from '@/lib/agent-feature-install-commands'
import {
  GLOBAL_AGENT_SKILL_SOURCE_KINDS,
  useInstalledAgentSkill
} from '@/hooks/useInstalledAgentSkills'
import { useActiveProjectSkillRuntime } from '@/hooks/useActiveProjectSkillRuntime'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '../../store'
import { AgentSkillSetupPanel } from './AgentSkillSetupPanel'
import { buildSkillCommandForRuntime } from './CliSkillRuntimeSetup'
import { ReviewPipelineAgentPicker } from './ReviewPipelineAgentPicker'
import { OrchestrationSkillAgentCoverage } from './OrchestrationSkillAgentCoverage'
import { SearchableSetting } from './SearchableSetting'
import { getReviewPipelinePaneSearchEntries } from './review-pipeline-search'
import { matchesSettingsSearch } from './settings-search'
import { WorkspaceActionPromptRow } from './WorkspaceActionPromptsSection'

export function ReviewPipelinePane(): React.JSX.Element {
  const searchQuery = useAppStore((s) => s.settingsSearchQuery)
  const searchEntries = getReviewPipelinePaneSearchEntries()
  const activeSkillRuntime = useActiveProjectSkillRuntime()
  const installCommand = !activeSkillRuntime.installDisabledReason
    ? buildSkillCommandForRuntime(
        ORCA_REVIEW_SKILL_INSTALL_COMMAND,
        activeSkillRuntime.agentRuntime
      )
    : ORCA_REVIEW_SKILL_INSTALL_COMMAND

  const {
    installed,
    loading,
    error,
    skills: discoveredSkills,
    sources: discoveredSkillSources,
    refresh
  } = useInstalledAgentSkill(ORCA_REVIEW_SKILL_NAME, {
    discoveryTarget: activeSkillRuntime.discoveryTarget,
    sourceKinds: GLOBAL_AGENT_SKILL_SOURCE_KINDS
  })

  if (!matchesSettingsSearch(searchQuery, searchEntries)) {
    return <div />
  }

  return (
    <SearchableSetting
      title={translate('auto.components.settings.ReviewPipelinePane.title', 'Review pipeline')}
      description={translate(
        'auto.components.settings.ReviewPipelinePane.description',
        'How an agent reviews a branch: which files it reads first, when it opens the app, and how its findings reach your diff.'
      )}
      keywords={searchEntries[0].keywords}
      forceVisible
      className="space-y-5 py-2"
    >
      <AgentSkillSetupPanel
        title={translate('auto.components.settings.ReviewPipelinePane.skillTitle', 'Review skill')}
        description={translate(
          'auto.components.settings.ReviewPipelinePane.skillDescription',
          "Installs the review pipeline into every agent you picked, so the same review runs whichever one you launch. It uses the repository's own review rules when it has any."
        )}
        command={installCommand}
        terminalTitle="Review pipeline setup"
        terminalAriaLabel="Review skill install terminal"
        terminalWorktreeId="settings-review-pipeline-skill-terminal"
        terminalShellOverride={activeSkillRuntime.terminalShellOverride}
        terminalRuntime={activeSkillRuntime.agentRuntime}
        installed={installed}
        loading={loading}
        error={activeSkillRuntime.installDisabledReason ?? error}
        installDisabled={Boolean(activeSkillRuntime.installDisabledReason)}
        icon={<ScanEye className="size-5" />}
        footer={
          <OrchestrationSkillAgentCoverage
            embedded
            skillName={ORCA_REVIEW_SKILL_NAME}
            skills={discoveredSkills}
            sources={discoveredSkillSources}
            loading={loading}
          />
        }
        onRecheck={refresh}
        freshnessSkillName={
          activeSkillRuntime.canUseLocalSkillFreshness ? ORCA_REVIEW_SKILL_NAME : undefined
        }
      />

      <ReviewPipelineAgentPicker />

      <section className="divide-y divide-border">
        <div className="py-3">
          <h3 className="text-sm font-medium">
            {translate('auto.components.settings.ReviewPipelinePane.promptTitle', 'Review prompt')}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {translate(
              'auto.components.settings.ReviewPipelinePane.promptDescription',
              'What the agent is asked when a review starts. Supports {{branch}}, {{baseRef}}, {{worktreePath}}, {{prNumber}}, {{prUrl}} and {{prTitle}}. Clear the box to go back to the built-in prompt.'
            )}
          </p>
        </div>
        <WorkspaceActionPromptRow
          id="reviewPipeline"
          label={translate('auto.components.settings.ReviewPipelinePane.promptLabel', 'Prompt')}
        />
      </section>
    </SearchableSetting>
  )
}
