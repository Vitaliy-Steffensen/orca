import { useCallback, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import { openPromptMatchedWorkspace } from '@/lib/open-prompt-matched-workspace'
import type { NewWorkspaceProjectOption } from '@/lib/new-workspace-project-options'
import type { WorkspacePromptTaskLink } from '@/lib/workspace-prompt-task-link'
import type { Worktree } from '../../../../shared/worktree/types'
import type { NewWorkspaceComposerCardProps } from './new-workspace-composer-card-props'
import { useWorkspacePromptPlanMode } from './use-workspace-prompt-plan-mode'
import { useWorkspacePromptTaskLink } from './use-workspace-prompt-task-link'
import { WorkspacePromptComposer } from './WorkspacePromptComposer'
import { WorkspacePromptProjectSwitcher } from './WorkspacePromptProjectSwitcher'

function promptActionLabel(match: Worktree | null, fallback: string): string {
  if (!match) {
    return fallback
  }
  return match.isArchived
    ? translate('components.newWorkspace.prompt.restore', 'Restore')
    : translate('components.newWorkspace.prompt.open', 'Open')
}

function promptHint(match: Worktree | null, link: WorkspacePromptTaskLink | null): string | null {
  if (match) {
    return match.isArchived
      ? translate('components.newWorkspace.prompt.restoreHint', 'Enter restores “{{name}}”', {
          name: match.displayName
        })
      : translate('components.newWorkspace.prompt.openHint', 'Enter opens “{{name}}”', {
          name: match.displayName
        })
  }
  if (link?.kind === 'github') {
    return translate(
      'components.newWorkspace.prompt.linkGitHub',
      'Links GitHub {{kind}} #{{number}}',
      {
        kind: link.link.type === 'pr' ? 'pull request' : 'issue',
        number: String(link.link.number)
      }
    )
  }
  if (link?.kind === 'linear') {
    return translate('components.newWorkspace.prompt.linkLinear', 'Links Linear {{id}}', {
      id: link.intent.identifier
    })
  }
  if (link?.kind === 'linear-review') {
    return translate('components.newWorkspace.prompt.linkLinearReview', 'Links Linear review')
  }
  return null
}

/**
 * Project switcher, advanced toggle, and the chat-style prompt. A pasted task
 * link opens the workspace that already has it instead of creating another.
 */
export function WorkspacePromptComposerFields({
  card,
  repoId,
  sparseEditing,
  projectOptions,
  selectedProjectId,
  selectedProjectName
}: {
  card: NewWorkspaceComposerCardProps
  repoId: string
  sparseEditing: boolean
  projectOptions: readonly NewWorkspaceProjectOption[]
  selectedProjectId: string | null
  selectedProjectName: string
}): React.JSX.Element {
  const agentPrompt = card.agentPrompt ?? ''
  const planMode = useWorkspacePromptPlanMode()
  const { link, match } = useWorkspacePromptTaskLink({
    prompt: agentPrompt,
    repoId,
    onGitHubItem: card.onSmartGitHubItemSelect,
    onLinearIssue: card.onSmartLinearIssueSelect,
    onClearLinkedSelection: card.onClearSmartNameSelection
  })
  if (card.promptTaskMatchRef) {
    card.promptTaskMatchRef.current = match
  }
  const onLaunchSeedChange = card.onLaunchSeedChange
  useEffect(() => {
    onLaunchSeedChange?.(planMode.seedOverlay)
  }, [onLaunchSeedChange, planMode.seedOverlay])
  const onCreate = card.onCreate
  const onOpenedExistingWorkspace = card.onOpenedExistingWorkspace
  const handlePromptSubmit = useCallback((): void => {
    if (match) {
      void openPromptMatchedWorkspace(match)
        .then((opened) => {
          if (opened) {
            onOpenedExistingWorkspace?.()
          }
        })
        .catch(() => {
          // Unarchive reports its own failure. A failed open must not create a second workspace.
        })
      return
    }
    onCreate()
  }, [match, onCreate, onOpenedExistingWorkspace])

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <WorkspacePromptProjectSwitcher
          options={projectOptions}
          selectedProjectId={selectedProjectId}
          selectedProjectName={selectedProjectName}
          onProjectChange={card.onProjectChange}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={card.onToggleAdvanced}
          disabled={sparseEditing}
          aria-expanded={card.advancedOpen}
          className="-mr-1 text-xs focus-visible:ring-inset"
        >
          {translate('auto.components.NewWorkspaceComposerCard.f0470c7383', 'Advanced')}
          <ChevronDown
            className={cn('size-4 transition-transform', card.advancedOpen && 'rotate-180')}
          />
        </Button>
      </div>
      {sparseEditing ? null : (
        <WorkspacePromptComposer
          prompt={agentPrompt}
          onPromptChange={(value) => card.onAgentPromptChange?.(value)}
          onSubmit={handlePromptSubmit}
          disabled={card.createDisabled && !match}
          creating={card.creating}
          actionLabel={promptActionLabel(match, card.primaryActionLabel)}
          placeholder={translate(
            'components.newWorkspace.prompt.placeholder',
            'Describe the workspace, or paste a GitHub or Linear link'
          )}
          hint={promptHint(match, link)}
          planMode={planMode}
        />
      )}
    </>
  )
}
