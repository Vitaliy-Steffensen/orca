import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { launchAgentInNewTab, type LaunchAgentInNewTabResult } from '@/lib/launch-agent-in-new-tab'
import { newAgentLaunchRequestId } from '@/lib/agent-launch-request-id'
import { cancelStructuredAgentLaunch } from '@/lib/structured-agent-session-launch'
import { holdStructuredAgentSessionLaunchOption } from '@/lib/structured-agent-session-launch-options'
import { getStructuredLaunchStateBySessionId } from '@/lib/structured-agent-session-launch-registry'
import { dispatchWorkspaceTabCommand } from '@/lib/workspace-tab-commands'
import { useAppStore } from '@/store'
import { enqueueSessionOptionSettingsWrite } from '@/components/native-chat/native-chat-session-option-settings-write'
import {
  readNativeChatComposerDraft,
  structuredAgentSessionDraftScopeKey,
  updateNativeChatComposerDraft
} from '@/components/native-chat/native-chat-composer-draft-store'
import { structuredAgentSessionTabId } from '../../../shared/structured-agent-session-projection'
import { encodeStructuredAgentSessionOptionValue } from '../../../shared/structured-agent-session-option-codec'
import type { LaunchSource } from '../../../shared/telemetry-property-schemas'
import {
  chooseUnifiedChatAgent,
  type UnifiedChatAgent
} from '../../../shared/unified-claude-cursor-chat'
import {
  lastUnifiedChatAgent,
  noteUnifiedChatWhenStarted,
  rememberUnifiedChatAgent,
  unifiedLaunchSessionIds
} from './unified-chat-sessions'

function groupIdForWorktree(worktreeId: string, groupId: string | undefined): string | undefined {
  if (groupId) {
    return groupId
  }
  const state = useAppStore.getState()
  return state.activeGroupIdByWorktree[worktreeId] ?? state.groupsByWorktree[worktreeId]?.[0]?.id
}

function tabIdForSession(worktreeId: string, sessionId: string): string {
  const tab = (useAppStore.getState().unifiedTabsByWorktree[worktreeId] ?? []).find(
    (candidate) => candidate.contentType === 'agent-session' && candidate.entityId === sessionId
  )
  return tab?.id ?? structuredAgentSessionTabId(sessionId)
}

function carryDraft(fromSessionId: string, toSessionId: string): void {
  const draft = readNativeChatComposerDraft(structuredAgentSessionDraftScopeKey(fromSessionId))
  if (!draft.text && draft.images.length === 0) {
    return
  }
  updateNativeChatComposerDraft(
    structuredAgentSessionDraftScopeKey(toSessionId),
    {
      text: draft.text,
      images: [...draft.images],
      ...(draft.document ? { document: draft.document } : {})
    },
    'immediate'
  )
}

function holdModel(sessionId: string, agent: UnifiedChatAgent, modelId: string): void {
  const encoded = encodeStructuredAgentSessionOptionValue('model', modelId)
  const state = getStructuredLaunchStateBySessionId(sessionId)
  if (!encoded || !state) {
    return
  }
  holdStructuredAgentSessionLaunchOption(sessionId, 'model', encoded)
  void enqueueSessionOptionSettingsWrite(state.intent.target, {
    type: 'apply-picks',
    agent,
    picks: [{ modelId, optionId: 'model', value: modelId }]
  })
}

function closeChat(worktreeId: string, sessionId: string): void {
  cancelStructuredAgentLaunch(worktreeId, sessionId)
  dispatchWorkspaceTabCommand({
    type: 'close',
    target: { kind: 'tab', worktreeId, tabId: tabIdForSession(worktreeId, sessionId) }
  })
}

function startUnifiedChat(args: {
  worktreeId: string
  groupId?: string
  agent: UnifiedChatAgent
  launchSource: LaunchSource
  onSession?: (sessionId: string) => void
}): LaunchAgentInNewTabResult {
  const before = unifiedLaunchSessionIds(args.worktreeId, args.agent)
  const result = launchAgentInNewTab({
    requestId: newAgentLaunchRequestId(),
    agent: args.agent,
    worktreeId: args.worktreeId,
    groupId: groupIdForWorktree(args.worktreeId, args.groupId),
    launchSource: args.launchSource
  })
  if (!result) {
    toast.error(
      translate('components.native-chat.unifiedChat.couldNotStart', "Couldn't start a new chat.")
    )
    return null
  }
  rememberUnifiedChatAgent(args.agent)
  noteUnifiedChatWhenStarted(args.worktreeId, args.agent, before, (sessionId) => {
    args.onSession?.(sessionId)
  })
  return result
}

/** Opens one chat. The model menu, not this call, decides Claude or Cursor. */
export function openUnifiedNewChat(args: {
  worktreeId: string
  groupId?: string
  availableAgents: readonly string[]
  defaultAgent: string | null | undefined
  launchSource: LaunchSource
}): LaunchAgentInNewTabResult {
  const agent = chooseUnifiedChatAgent({
    available: args.availableAgents,
    defaultAgent: args.defaultAgent,
    lastAgent: lastUnifiedChatAgent()
  })
  if (!agent) {
    return null
  }
  return startUnifiedChat({
    worktreeId: args.worktreeId,
    groupId: args.groupId,
    agent,
    launchSource: args.launchSource
  })
}

/** Moves an unsent chat onto the other provider, keeping what is typed. */
export function switchUnifiedChatProvider(args: {
  worktreeId: string
  groupId?: string
  fromSessionId: string
  toAgent: UnifiedChatAgent
  modelId: string
}): void {
  startUnifiedChat({
    worktreeId: args.worktreeId,
    groupId: args.groupId,
    agent: args.toAgent,
    launchSource: 'tab_bar_quick_launch',
    onSession: (sessionId) => {
      carryDraft(args.fromSessionId, sessionId)
      holdModel(sessionId, args.toAgent, args.modelId)
      closeChat(args.worktreeId, args.fromSessionId)
    }
  })
}
