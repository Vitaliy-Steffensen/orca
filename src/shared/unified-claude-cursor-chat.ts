/** Claude and Cursor are one new chat. The model menu names which one runs. */

export const UNIFIED_CHAT_AGENTS = ['claude', 'cursor'] as const

export type UnifiedChatAgent = (typeof UNIFIED_CHAT_AGENTS)[number]

const MODEL_VALUE_SEPARATOR = '\u001f'

export function isUnifiedChatAgent(agent: string): agent is UnifiedChatAgent {
  return agent === 'claude' || agent === 'cursor'
}

export function chooseUnifiedChatAgent(args: {
  available: readonly string[]
  defaultAgent: string | null | undefined
  lastAgent: UnifiedChatAgent | null
}): UnifiedChatAgent | null {
  const available = UNIFIED_CHAT_AGENTS.filter((agent) => args.available.includes(agent))
  if (args.lastAgent && available.includes(args.lastAgent)) {
    return args.lastAgent
  }
  if (
    args.defaultAgent &&
    isUnifiedChatAgent(args.defaultAgent) &&
    available.includes(args.defaultAgent)
  ) {
    return args.defaultAgent
  }
  return available[0] ?? null
}

export function encodeUnifiedChatModelValue(agent: UnifiedChatAgent, modelId: string): string {
  return `${agent}${MODEL_VALUE_SEPARATOR}${modelId}`
}

export function decodeUnifiedChatModelValue(
  value: string
): { agent: UnifiedChatAgent; modelId: string } | null {
  const splitAt = value.indexOf(MODEL_VALUE_SEPARATOR)
  if (splitAt < 1) {
    return null
  }
  const agent = value.slice(0, splitAt)
  const modelId = value.slice(splitAt + MODEL_VALUE_SEPARATOR.length)
  if (!isUnifiedChatAgent(agent) || modelId.length === 0) {
    return null
  }
  return { agent, modelId }
}

export type UnifiedChatListedModel = {
  id: string
  label: string
}

export type UnifiedChatModelChoice = {
  agent: UnifiedChatAgent
  modelId: string
  label: string
  group: string
  value: string
}

/** Null when there is no second provider to offer, so the menu stays that agent's own list. */
export function buildUnifiedChatModelChoices(args: {
  currentAgent: UnifiedChatAgent
  currentModels: readonly UnifiedChatListedModel[]
  currentModelId: string | undefined
  otherAgent: UnifiedChatAgent | null
  otherModels: readonly UnifiedChatListedModel[]
  groupLabel: (agent: UnifiedChatAgent) => string
}): { choices: UnifiedChatModelChoice[]; currentValue: string | undefined } | null {
  if (!args.otherAgent || args.otherModels.length === 0) {
    return null
  }
  const choices: UnifiedChatModelChoice[] = []
  for (const agent of [args.currentAgent, args.otherAgent]) {
    const models = agent === args.currentAgent ? [...args.currentModels] : [...args.otherModels]
    if (
      agent === args.currentAgent &&
      args.currentModelId &&
      !models.some((model) => model.id === args.currentModelId)
    ) {
      models.unshift({ id: args.currentModelId, label: args.currentModelId })
    }
    const group = args.groupLabel(agent)
    for (const model of models) {
      choices.push({
        agent,
        modelId: model.id,
        label: model.label,
        group,
        value: encodeUnifiedChatModelValue(agent, model.id)
      })
    }
  }
  if (!choices.some((choice) => choice.agent !== args.currentAgent)) {
    return null
  }
  return {
    choices,
    currentValue: args.currentModelId
      ? encodeUnifiedChatModelValue(args.currentAgent, args.currentModelId)
      : undefined
  }
}

/** A new chat can still change provider until the person has sent something. */
export function unifiedChatCanSwitchProvider(args: {
  journalItems: readonly { body: { kind: string; role?: string } }[]
  submissionCount: number
}): boolean {
  if (args.submissionCount > 0) {
    return false
  }
  return !args.journalItems.some(
    (item) => item.body.kind === 'message' && item.body.role === 'user'
  )
}
