import { useMemo, useSyncExternalStore } from 'react'
import { useAgentDetectionTargetForWorktree } from '@/hooks/useAgentDetectionTarget'
import { useDetectedAgents } from '@/hooks/useDetectedAgents'
import { translate } from '@/i18n/i18n'
import { readHostModelCatalogSnapshot } from '@/runtime/host-model-catalog-snapshots'
import { useAppStore } from '@/store'
import { getAgentSessionOptionCatalog } from '../../../../shared/agent-session-option-catalog'
import { filterEnabledTuiAgents } from '../../../../shared/tui-agent-selection'
import type { RuntimeClientTarget } from '../../../../shared/runtime-client-target'
import type {
  SessionOptionDescriptor,
  SessionOptionsSurface,
  SessionOptionValue
} from '../../../../shared/native-chat-session-options'
import {
  buildUnifiedChatModelChoices,
  decodeUnifiedChatModelValue,
  isUnifiedChatAgent,
  UNIFIED_CHAT_AGENTS,
  unifiedChatCanSwitchProvider,
  type UnifiedChatAgent,
  type UnifiedChatListedModel
} from '../../../../shared/unified-claude-cursor-chat'
import { isUnifiedChatSession, subscribeUnifiedChatSessions } from '@/lib/unified-chat-sessions'
import { switchUnifiedChatProvider } from '@/lib/unified-new-chat'

function providerLabel(agent: UnifiedChatAgent): string {
  return agent === 'claude'
    ? translate('components.native-chat.composer.modelProvider.claude', 'Claude')
    : translate('components.native-chat.composer.modelProvider.cursor', 'Cursor')
}

function listedModels(
  target: RuntimeClientTarget,
  agent: UnifiedChatAgent,
  worktree: string | undefined
): UnifiedChatListedModel[] {
  const catalog = readHostModelCatalogSnapshot(target, agent, {
    newLaunch: true,
    seedsModel: true,
    ...(worktree ? { worktree } : {})
  })
  if (catalog && catalog.origin !== 'unknown' && catalog.models.length > 0) {
    return catalog.models.map((model) => ({ id: model.id, label: model.label || model.id }))
  }
  return (getAgentSessionOptionCatalog(agent)?.models ?? []).map((model) => ({
    id: model.id,
    label: model.label
  }))
}

function withChoices(
  snapshot: readonly SessionOptionDescriptor[],
  choices: { value: string; label: string; group: string }[],
  currentValue: string | undefined
): SessionOptionDescriptor[] {
  return snapshot.map((descriptor) => {
    if (descriptor.category !== 'model' || descriptor.kind.type !== 'select') {
      return descriptor
    }
    return {
      ...descriptor,
      kind: { ...descriptor.kind, choices, currentValue }
    }
  })
}

export function useUnifiedChatModelMenu(args: {
  agent: string
  sessionId: string
  worktreeId: string | null
  groupId?: string
  target: RuntimeClientTarget
  worktreeSelector: string | undefined
  journalItems: readonly { body: { kind: string; role?: string } }[]
  submissionCount: number
  optionSnapshot: SessionOptionDescriptor[]
  optionSurface: SessionOptionsSurface
}): { snapshot: SessionOptionDescriptor[]; surface: SessionOptionsSurface } {
  const marked = useSyncExternalStore(
    subscribeUnifiedChatSessions,
    () => isUnifiedChatSession(args.sessionId),
    () => false
  )
  const detectionTarget = useAgentDetectionTargetForWorktree(args.worktreeId)
  const { detectedIds } = useDetectedAgents(detectionTarget)
  const disabledAgents = useAppStore((state) => state.settings?.disabledTuiAgents)
  const enabled = detectedIds ? filterEnabledTuiAgents(detectedIds, disabledAgents) : []
  const currentAgent = isUnifiedChatAgent(args.agent) ? args.agent : null
  const otherAgent =
    currentAgent === null
      ? null
      : (UNIFIED_CHAT_AGENTS.find((agent) => agent !== currentAgent && enabled.includes(agent)) ??
        null)
  const canSwitch =
    marked &&
    currentAgent !== null &&
    unifiedChatCanSwitchProvider({
      journalItems: args.journalItems,
      submissionCount: args.submissionCount
    })
  const built = useMemo(() => {
    if (!canSwitch || !currentAgent) {
      return null
    }
    const model = args.optionSnapshot.find(
      (descriptor) => descriptor.category === 'model' && descriptor.kind.type === 'select'
    )
    const live =
      model?.kind.type === 'select'
        ? model.kind.choices.map((choice) => ({ id: choice.value, label: choice.label }))
        : []
    const currentModels =
      live.length > 0 ? live : listedModels(args.target, currentAgent, args.worktreeSelector)
    return buildUnifiedChatModelChoices({
      currentAgent,
      currentModels,
      currentModelId: model?.kind.type === 'select' ? model.kind.currentValue : undefined,
      otherAgent,
      otherModels: otherAgent ? listedModels(args.target, otherAgent, args.worktreeSelector) : [],
      groupLabel: providerLabel
    })
  }, [args.optionSnapshot, args.target, args.worktreeSelector, canSwitch, currentAgent, otherAgent])
  const snapshot = useMemo(
    () =>
      built
        ? withChoices(args.optionSnapshot, built.choices, built.currentValue)
        : args.optionSnapshot,
    [args.optionSnapshot, built]
  )
  const worktreeId = args.worktreeId
  const surface = useMemo<SessionOptionsSurface>(() => {
    if (!built || !currentAgent || !worktreeId) {
      return args.optionSurface
    }
    return {
      ...args.optionSurface,
      getSnapshot: () => snapshot,
      setOption: async (id: string, value: SessionOptionValue) => {
        const picked =
          id === 'model' && typeof value === 'string' ? decodeUnifiedChatModelValue(value) : null
        if (picked && picked.agent !== currentAgent) {
          switchUnifiedChatProvider({
            worktreeId,
            groupId: args.groupId,
            fromSessionId: args.sessionId,
            toAgent: picked.agent,
            modelId: picked.modelId
          })
          return { snapshot }
        }
        return args.optionSurface.setOption(id, picked?.modelId ?? value)
      }
    }
  }, [args.groupId, args.optionSurface, args.sessionId, built, currentAgent, snapshot, worktreeId])
  return { snapshot, surface }
}
