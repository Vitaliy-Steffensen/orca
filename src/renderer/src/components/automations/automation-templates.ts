import type {
  AutomationSchedulePreset,
  AutomationWorkspaceMode
} from '../../../../shared/automations-types'
import type { TuiAgent } from '../../../../shared/tui-agent'
import { translate } from '@/i18n/i18n'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import { REVIEW_STAGED_COMMENT_INSTRUCTION } from '../../../../shared/agent-note-prompt'

export type AutomationTemplate = {
  id: string
  category: string
  label: string
  description: string
  name: string
  prompt: string
  preset: AutomationSchedulePreset
  time?: string
  dayOfWeek?: string
  agentId?: TuiAgent
  extraAgentArgs?: string
  workspaceMode?: AutomationWorkspaceMode
  missedRunGraceMinutes?: string
}

export const getAutomationTemplates = createLocalizedCatalog((): AutomationTemplate[] => [
  {
    id: 'repo-health-weekday',
    category: translate(
      'auto.components.automations.automation.templates.repoHealth.category',
      'Repo health'
    ),
    label: translate(
      'auto.components.automations.automation.templates.b84757677d',
      'Weekday repo audit'
    ),
    description: translate(
      'auto.components.automations.automation.templates.a7fbd32ddb',
      'Check dependencies, failing tests, and risky open changes each weekday.'
    ),
    name: translate(
      'auto.components.automations.automation.templates.repoHealth.name',
      'Weekday repo audit'
    ),
    prompt: translate(
      'auto.components.automations.automation.templates.repoHealth.prompt',
      'Review the repository health. Check dependency updates, failing tests, lint/typecheck status, and risky open changes. Summarize findings and suggest the next action.'
    ),
    preset: 'weekdays',
    time: '09:00',
    missedRunGraceMinutes: '720'
  },
  {
    id: 'review-pipeline-weekday',
    category: translate(
      'auto.components.automations.automation.templates.reviewPipeline.category',
      'Review'
    ),
    label: translate(
      'auto.components.automations.automation.templates.reviewPipeline.label',
      'Branch review'
    ),
    description: translate(
      'auto.components.automations.automation.templates.reviewPipeline.description',
      'Every weekday, reviews the checked-out branch with the review pipeline on Grok 4.7 and stages the findings on the diff. Pick the workspace to review.'
    ),
    name: translate(
      'auto.components.automations.automation.templates.reviewPipeline.name',
      'Branch review'
    ),
    prompt: `${translate(
      'auto.components.automations.automation.templates.reviewPipeline.prompt',
      'Review the work on the checked-out branch against its base branch. Use the orca-review skill: it rates and groups the changed files, runs every review skill you have whose area the diff touches, screenshots the UI when the frontend diff earns it, and stages the findings. Read every changed file, not only the diff hunks. Only report a finding you can tie to the input or state that makes it go wrong. Do not change any code.'
    )}\n\n${REVIEW_STAGED_COMMENT_INSTRUCTION}`,
    preset: 'weekdays',
    time: '09:00',
    agentId: 'grok',
    extraAgentArgs: '-m grok-4.7',
    workspaceMode: 'existing',
    missedRunGraceMinutes: '720'
  },
  {
    id: 'release-prep-weekly',
    category: translate(
      'auto.components.automations.automation.templates.releasePrep.category',
      'Release prep'
    ),
    label: translate(
      'auto.components.automations.automation.templates.39ed39280a',
      'Release readiness'
    ),
    description: translate(
      'auto.components.automations.automation.templates.513401db93',
      'Prepare a weekly release risk summary from the current project state.'
    ),
    name: translate(
      'auto.components.automations.automation.templates.releasePrep.name',
      'Release readiness review'
    ),
    prompt: translate(
      'auto.components.automations.automation.templates.releasePrep.prompt',
      'Prepare a release readiness summary. Look for blockers, unmerged risky changes, missing validation, and documentation gaps. End with a concise release/no-release recommendation.'
    ),
    preset: 'weekly',
    time: '14:00',
    dayOfWeek: '4',
    missedRunGraceMinutes: '1440'
  },
  {
    id: 'recurring-review-daily',
    category: translate(
      'auto.components.automations.automation.templates.recurringReview.category',
      'Recurring review'
    ),
    label: translate(
      'auto.components.automations.automation.templates.6023075b27',
      'Daily change review'
    ),
    description: translate(
      'auto.components.automations.automation.templates.3b7281c75f',
      'Scan recent work and call out correctness, UX, and test coverage risks.'
    ),
    name: translate(
      'auto.components.automations.automation.templates.recurringReview.name',
      'Daily change review'
    ),
    prompt: translate(
      'auto.components.automations.automation.templates.recurringReview.prompt',
      'Review recent changes in this workspace. Focus on correctness risks, UX regressions, missing tests, and follow-up tasks. Keep the report short and actionable.'
    ),
    preset: 'daily',
    time: '16:30',
    missedRunGraceMinutes: '180'
  },
  {
    id: 'maintenance-hourly',
    category: translate(
      'auto.components.automations.automation.templates.maintenance.category',
      'Maintenance'
    ),
    label: translate(
      'auto.components.automations.automation.templates.8a0228bea3',
      'Hourly queue check'
    ),
    description: translate(
      'auto.components.automations.automation.templates.37571fcb16',
      'Look for stuck work, stale generated files, and failed local validation.'
    ),
    name: translate(
      'auto.components.automations.automation.templates.maintenance.name',
      'Hourly maintenance check'
    ),
    prompt: translate(
      'auto.components.automations.automation.templates.maintenance.prompt',
      'Check for stuck work, stale generated files, failing validation, and anything that needs human attention. Report only actionable issues.'
    ),
    preset: 'hourly',
    time: '00:15',
    missedRunGraceMinutes: '30'
  },
  {
    id: 'weekly-recap-monday',
    category: translate(
      'auto.components.automations.automation.templates.weeklyRecap.category',
      'Weekly recap'
    ),
    label: translate(
      'auto.components.automations.automation.templates.weeklyRecap.label',
      'Monday weekly recap'
    ),
    description: translate(
      'auto.components.automations.automation.templates.weeklyRecap.description',
      'Every Monday, writes what landed on the default branch into a dated file in the run workspace and prints it so it lands in the run history.'
    ),
    name: translate(
      'auto.components.automations.automation.templates.weeklyRecap.name',
      'Monday weekly recap'
    ),
    prompt: translate(
      'auto.components.automations.automation.templates.weeklyRecap.prompt',
      'Write a short recap of what landed on the default branch since the previous Monday. Use git log on the default branch for that window, and the pull requests merged in it. Cover behaviour changes, new commands and flags, and how the codebase is worked. Skip refactors, dependency bumps, and mirror merges. Write the recap to a dated file under .context/ in this workspace (for example .context/weekly-recap-YYYY-MM-DD.md) and print the same text, so it is saved in the automation run history.'
    ),
    preset: 'weekly',
    time: '08:00',
    dayOfWeek: '1',
    agentId: 'claude',
    workspaceMode: 'new_per_run',
    missedRunGraceMinutes: '720'
  },
  {
    id: 'linear-status-wednesday',
    category: translate(
      'auto.components.automations.automation.templates.linearStatus.category',
      'Linear'
    ),
    label: translate(
      'auto.components.automations.automation.templates.linearStatus.label',
      'Wednesday Linear status'
    ),
    description: translate(
      'auto.components.automations.automation.templates.linearStatus.description',
      'Every Wednesday, posts a Linear project status update for the projects you lead. To keep a draft instead, change the last step of the prompt to write it under .context/ and stop. That is a text edit, not a code change.'
    ),
    name: translate(
      'auto.components.automations.automation.templates.linearStatus.name',
      'Wednesday Linear status'
    ),
    prompt: translate(
      'auto.components.automations.automation.templates.linearStatus.prompt',
      'Post a short Linear project status update for each project you lead. List them with `orca linear project list --lead me --json`. For each project, read `orca linear project show <id> --json` and its issues with `orca linear list-issues --project <id> --json`. Write a short update covering what moved, what is blocked, and what is next. Post it with `orca linear project update post --project <id> --body <text> --health <onTrack|atRisk|offTrack>`. Choose the health from the evidence in the issues, and say why in the body. This posts directly. To keep a draft instead, write it under .context/ and stop.'
    ),
    preset: 'weekly',
    time: '08:00',
    dayOfWeek: '3',
    agentId: 'claude',
    workspaceMode: 'new_per_run',
    missedRunGraceMinutes: '720'
  }
])
