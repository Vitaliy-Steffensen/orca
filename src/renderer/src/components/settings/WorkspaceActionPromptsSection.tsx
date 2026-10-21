import React from 'react'
import { useAppStore } from '@/store'
import { Textarea } from '@/components/ui/textarea'
import { translate } from '@/i18n/i18n'
import {
  DEFAULT_WORKSPACE_ACTION_PROMPTS,
  TOP_BAR_WORKSPACE_ACTION_PROMPT_IDS,
  type WorkspaceActionPromptId
} from '../../../../shared/workspace-action-prompts'
import { SettingsRow } from './SettingsFormControls'

function promptLabel(id: WorkspaceActionPromptId): string {
  switch (id) {
    case 'commitAndPush':
      return translate('auto.components.settings.workspaceActions.commitAndPush', 'Commit & push')
    case 'createPullRequest':
      return translate('auto.components.settings.workspaceActions.createPr', 'Create PR')
    case 'readyForReview':
      return translate('auto.components.settings.workspaceActions.ready', 'Ready for review')
    case 'reviewPullRequest':
      return translate('auto.components.settings.workspaceActions.review', 'Review')
    case 'reReviewPullRequest':
      return translate('auto.components.settings.workspaceActions.reReview', 'Re-review')
    case 'reviewPipeline':
      return translate(
        'auto.components.settings.workspaceActions.reviewPipeline',
        'Review pipeline'
      )
  }
}

export function WorkspaceActionPromptRow({
  id,
  label,
  className
}: {
  id: WorkspaceActionPromptId
  label?: string
  className?: string
}): React.JSX.Element {
  const config = useAppStore((state) => state.workspaceStatusRules)
  const setWorkspaceStatusRules = useAppStore((state) => state.setWorkspaceStatusRules)
  const update = (value: string): void => {
    const actionPrompts = { ...config.actionPrompts }
    // Why the default is not stored: an untouched box keeps following the built-in prompt.
    if (value.trim() && value !== DEFAULT_WORKSPACE_ACTION_PROMPTS[id]) {
      actionPrompts[id] = value
    } else {
      delete actionPrompts[id]
    }
    setWorkspaceStatusRules({ ...config, actionPrompts })
  }
  return (
    <SettingsRow
      alignTop
      className={className}
      label={label ?? promptLabel(id)}
      control={
        <Textarea
          value={config.actionPrompts[id] ?? DEFAULT_WORKSPACE_ACTION_PROMPTS[id]}
          onChange={(event) => update(event.target.value)}
          className="h-40 w-[320px]"
        />
      }
    />
  )
}

export function WorkspaceActionPromptsSection(): React.JSX.Element {
  return (
    <section className="divide-y divide-border">
      <div className="py-3">
        <h3 className="text-sm font-medium">
          {translate('auto.components.settings.workspaceActions.title', 'Top bar actions')}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {translate(
            'auto.components.settings.workspaceActions.description',
            'Prompts for the buttons beside the right sidebar toggle. Supports {{branch}}, {{baseRef}}, {{worktreePath}}, {{prNumber}}, {{prUrl}}, {{prTitle}}, {{draftMode}}, {{templateRule}} and {{prInstructions}}. Resolve conflicts uses the Source Control conflict template. Clear a box to go back to the built-in prompt.'
          )}
        </p>
      </div>
      {TOP_BAR_WORKSPACE_ACTION_PROMPT_IDS.map((id) => (
        <WorkspaceActionPromptRow key={id} id={id} />
      ))}
    </section>
  )
}
