import { useEffect, useMemo, useState } from 'react'
import { translate } from '@/i18n/i18n'
import {
  preloadHostModelCatalogSnapshots,
  readHostModelCatalogSnapshot
} from '@/runtime/host-model-catalog-snapshots'
import { getAgentSessionOptionCatalog } from '../../../../shared/agent-session-option-catalog'
import type { RuntimeClientTarget } from '../../../../shared/runtime-client-target'
import type { SessionOptionSelectChoice } from '../../../../shared/native-chat-session-options'
import type { TuiAgent } from '../../../../shared/tui-agent'
import {
  resolveWorkspaceModeModel,
  WORKSPACE_MODE_LAUNCH_DEFAULTS
} from '../../../../shared/workspace-mode-launch-defaults'
import {
  buildUnifiedChatModelChoices,
  decodeUnifiedChatModelValue,
  isUnifiedChatAgent,
  UNIFIED_CHAT_AGENTS,
  type UnifiedChatAgent,
  type UnifiedChatListedModel
} from '../../../../shared/unified-claude-cursor-chat'

function providerLabel(agent: UnifiedChatAgent): string {
  return agent === 'claude'
    ? translate('components.native-chat.composer.modelProvider.claude', 'Claude')
    : translate('components.native-chat.composer.modelProvider.cursor', 'Cursor')
}

function listedModels(
  target: RuntimeClientTarget | null,
  agent: TuiAgent,
  worktree: string
): UnifiedChatListedModel[] {
  const catalog = target
    ? readHostModelCatalogSnapshot(target, agent, { newLaunch: true, seedsModel: true, worktree })
    : undefined
  const discovered =
    catalog && catalog.origin !== 'unknown'
      ? catalog.models.map((model) => ({ id: model.id, label: model.label || model.id }))
      : []
  const optionCatalog = getAgentSessionOptionCatalog(agent)
  if (optionCatalog?.discoveredModelsAreAuthoritative) {
    return discovered
  }
  const staticModels = (optionCatalog?.models ?? []).map((model) => ({
    id: model.id,
    label: model.label
  }))
  return [...new Map([...staticModels, ...discovered].map((row) => [row.id, row])).values()]
}

export type SelectionAskModelPicker = {
  choices: SessionOptionSelectChoice[]
  currentValue: string | undefined
  pillLabel: string
  /** The model id to seed the launch with; undefined leaves the CLI's own default. */
  modelId: string | undefined
  select: (value: string) => void
}

/**
 * The Ask popover's model pill before any chat exists: Composer by default, the other installed
 * provider's models grouped beside Cursor's once that host has answered for both.
 */
export function useSelectionAskModel({
  agent,
  worktreeId,
  target,
  otherAgent,
  onAgentChange
}: {
  agent: TuiAgent
  worktreeId: string
  target: RuntimeClientTarget | null
  /** The second provider to list, when one is installed and enabled. */
  otherAgent: UnifiedChatAgent | null
  onAgentChange: (agent: UnifiedChatAgent) => void
}): SelectionAskModelPicker | null {
  const [catalogVersion, setCatalogVersion] = useState(0)
  const [picked, setPicked] = useState<{ agent: TuiAgent; modelId: string } | null>(null)

  useEffect(() => {
    if (!target) {
      return
    }
    const wanted = [agent, ...(otherAgent ? [otherAgent] : [])].filter(
      (candidate) =>
        !readHostModelCatalogSnapshot(target, candidate, {
          newLaunch: true,
          seedsModel: true,
          worktree: worktreeId
        })
    )
    if (wanted.length === 0) {
      return
    }
    let active = true
    void preloadHostModelCatalogSnapshots(target, wanted).then(() => {
      if (active) {
        setCatalogVersion((version) => version + 1)
      }
    })
    return () => {
      active = false
    }
  }, [agent, otherAgent, target, worktreeId])

  return useMemo(() => {
    void catalogVersion
    const models = listedModels(target, agent, worktreeId)
    if (models.length === 0) {
      return null
    }
    const defaults = WORKSPACE_MODE_LAUNCH_DEFAULTS.ask
    const pickedHere = picked?.agent === agent ? picked.modelId : undefined
    const modelId =
      (pickedHere && models.some((row) => row.id === pickedHere) ? pickedHere : undefined) ??
      (picked === null && defaults.agent === agent
        ? resolveWorkspaceModeModel(defaults.model, models)
        : undefined)
    const unified =
      otherAgent && isUnifiedChatAgent(agent)
        ? buildUnifiedChatModelChoices({
            currentAgent: agent,
            currentModels: models,
            currentModelId: modelId,
            otherAgent,
            otherModels: listedModels(target, otherAgent, worktreeId),
            groupLabel: providerLabel
          })
        : null
    const choices: SessionOptionSelectChoice[] =
      unified?.choices.map((choice) => ({
        value: choice.value,
        label: choice.label,
        group: choice.group
      })) ?? models.map((row) => ({ value: row.id, label: row.label }))
    const currentValue = unified ? unified.currentValue : modelId
    return {
      choices,
      currentValue,
      pillLabel:
        choices.find((choice) => choice.value === currentValue)?.label ??
        translate('components.native-chat.composer.model', 'Model'),
      modelId,
      select: (value) => {
        const decoded = unified ? decodeUnifiedChatModelValue(value) : null
        const nextAgent = decoded?.agent ?? agent
        setPicked({ agent: nextAgent, modelId: decoded?.modelId ?? value })
        if (decoded && decoded.agent !== agent) {
          onAgentChange(decoded.agent)
        }
      }
    }
  }, [agent, catalogVersion, onAgentChange, otherAgent, picked, target, worktreeId])
}

/** The second provider for the pill, when it is installed, enabled, and not the current one. */
export function otherUnifiedChatAgent(
  agent: TuiAgent,
  available: readonly TuiAgent[]
): UnifiedChatAgent | null {
  return (
    UNIFIED_CHAT_AGENTS.find((candidate) => candidate !== agent && available.includes(candidate)) ??
    null
  )
}
