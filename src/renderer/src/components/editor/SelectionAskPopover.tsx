import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SendHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { translate } from '@/i18n/i18n'
import { useAgentDetectionTargetForWorktree } from '@/hooks/useAgentDetectionTarget'
import { useDetectedAgents } from '@/hooks/useDetectedAgents'
import { NativeChatModelCombobox } from '@/components/native-chat/NativeChatModelCombobox'
import { resolveAgentSessionLaunchRoute } from '@/lib/agent-session-launch-plan'
import { launchSelectionAsk } from '@/lib/selection-ask-launch'
import { pickQuickWorkspaceAgent } from '@/lib/quick-workspace-agent-selection'
import {
  resolveStructuredAgentSessionOwner,
  structuredAgentSessionTargetForHost
} from '@/runtime/structured-agent-session-owner'
import { useAppStore } from '@/store'
import { filterEnabledTuiAgents } from '../../../../shared/tui-agent-selection'
import { narrowStructuredLaunchSeedOptions } from '../../../../shared/native-chat-session-option-defaults'
import { resolveWorkspaceModeAgent } from '../../../../shared/workspace-mode-launch-defaults'
import { workspaceKindForWorktreeId } from '../../../../shared/workspace-launch-kind'
import type { TuiAgent } from '../../../../shared/tui-agent'
import type { SelectionAskRequest } from './selection-ask-request'
import { otherUnifiedChatAgent, useSelectionAskModel } from './use-selection-ask-model'

function SelectionAskForm({ request }: { request: SelectionAskRequest }): React.JSX.Element | null {
  const close = useAppStore((state) => state.closeSelectionAsk)
  const settings = useAppStore((state) => state.settings)
  const activeWorktreeId = useAppStore((state) => state.activeWorktreeId)
  const executionHostId = useAppStore((state) =>
    resolveStructuredAgentSessionOwner(state, request.worktreeId)
  )
  const detectionTarget = useAgentDetectionTargetForWorktree(request.worktreeId)
  const { detectedIds } = useDetectedAgents(detectionTarget)
  const [question, setQuestion] = useState('')
  const [agentOverride, setAgentOverride] = useState<TuiAgent | null>(null)

  const preferredAgent = useMemo(
    () =>
      resolveWorkspaceModeAgent(
        'ask',
        detectedIds,
        settings?.disabledTuiAgents,
        pickQuickWorkspaceAgent(settings?.defaultTuiAgent, detectedIds, settings?.disabledTuiAgents)
      ),
    [detectedIds, settings?.defaultTuiAgent, settings?.disabledTuiAgents]
  )
  const agent = agentOverride ?? preferredAgent
  const route = useAppStore((state) =>
    agent
      ? resolveAgentSessionLaunchRoute(state, {
          agent,
          workspace: {
            kind: workspaceKindForWorktreeId(request.worktreeId),
            worktreeId: request.worktreeId
          }
        })
      : null
  )
  const target = useMemo(
    () => structuredAgentSessionTargetForHost(executionHostId),
    [executionHostId]
  )
  const enabledAgents = useMemo(
    () => (detectedIds ? filterEnabledTuiAgents(detectedIds, settings?.disabledTuiAgents) : []),
    [detectedIds, settings?.disabledTuiAgents]
  )
  const picker = useSelectionAskModel({
    agent: agent ?? 'claude',
    worktreeId: request.worktreeId,
    target,
    otherAgent: agent ? otherUnifiedChatAgent(agent, enabledAgents) : null,
    onAgentChange: setAgentOverride
  })

  // Why: the chat opens in the selection's workspace, so leaving that workspace abandons the ask.
  const openedInWorktreeId = useRef(activeWorktreeId)
  useEffect(() => {
    if (activeWorktreeId !== openedInWorktreeId.current) {
      close()
    }
  }, [activeWorktreeId, close])

  const submit = useCallback(() => {
    if (!agent || !question.trim()) {
      return
    }
    const seedOverlay =
      route === 'structured-native-chat' && picker?.modelId
        ? narrowStructuredLaunchSeedOptions({ model: picker.modelId })
        : undefined
    launchSelectionAsk({ request, question, agent, ...(seedOverlay ? { seedOverlay } : {}) })
    close()
  }, [agent, close, picker?.modelId, question, request, route])

  if (!agent) {
    return null
  }
  // Why: a terminal-routed launch cannot apply a picked model, so no choice is offered there.
  const showPicker = route === 'structured-native-chat' && picker !== null
  return (
    <div className="flex w-80 flex-col gap-2">
      <Textarea
        autoFocus
        rows={3}
        value={question}
        placeholder={translate(
          'components.editor.selectionAsk.placeholder',
          'Ask about these lines…'
        )}
        onChange={(event) => setQuestion(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            submit()
          }
        }}
      />
      <div className="flex items-center justify-between gap-2">
        {showPicker && picker ? (
          <NativeChatModelCombobox
            choices={picker.choices}
            currentValue={picker.currentValue}
            defaultOpen={false}
            readOnly={false}
            readOnlyReason={null}
            onSelect={picker.select}
            renderTrigger={(onKeyDown) => (
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="xs" onKeyDown={onKeyDown}>
                  {picker.pillLabel}
                </Button>
              </PopoverTrigger>
            )}
          />
        ) : (
          <span />
        )}
        <Button type="button" size="xs" disabled={!question.trim()} onClick={submit}>
          <SendHorizontal />
          {translate('components.editor.selectionAsk.send', 'Ask')}
        </Button>
      </div>
    </div>
  )
}

/** One app-level host for the question asked on a code selection, wherever it was made. */
export default function SelectionAskPopover(): React.JSX.Element {
  const request = useAppStore((state) => state.selectionAskRequest)
  const close = useAppStore((state) => state.closeSelectionAsk)
  const virtualRef = useMemo(
    () => ({
      current: request
        ? {
            getBoundingClientRect: () =>
              new DOMRect(
                request.anchorRect.left,
                request.anchorRect.top,
                request.anchorRect.width,
                request.anchorRect.height
              )
          }
        : null
    }),
    [request]
  )

  return (
    <Popover open={request !== null} onOpenChange={(open) => !open && close()}>
      <PopoverAnchor virtualRef={virtualRef} />
      {request ? (
        <PopoverContent
          align="start"
          side="top"
          sideOffset={6}
          collisionPadding={8}
          hideWhenDetached
          // Why: the model picker is its own popover, portalled out of this one; a click in it is
          // "outside" by DOM containment and would otherwise dismiss the question behind it.
          onPointerDownOutside={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest('[data-radix-popper-content-wrapper]')
            ) {
              event.preventDefault()
            }
          }}
          onFocusOutside={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest('[data-radix-popper-content-wrapper]')
            ) {
              event.preventDefault()
            }
          }}
        >
          <SelectionAskForm
            key={`${request.relativePath}:${request.startLine}`}
            request={request}
          />
        </PopoverContent>
      ) : null}
    </Popover>
  )
}
