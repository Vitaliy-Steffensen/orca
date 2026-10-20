import { useEffect, useMemo, useState } from 'react'
import { getAgentCatalog } from '@/lib/agent-catalog'
import { translate } from '@/i18n/i18n'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  readNativeChatEnrichedModels,
  subscribeNativeChatEnrichedModels
} from '@/components/native-chat/native-chat-session-option-enrichment'
import { useAppStore } from '../../store'
import { SettingsRow } from './SettingsFormControls'
import { getAgentSessionOptionCatalog } from '../../../../shared/agent-session-option-catalog'
import type { CatalogModel } from '../../../../shared/agent-session-option-catalog-types'
import { filterEnabledTuiAgents } from '../../../../shared/tui-agent-selection'
import {
  DEFAULT_REVIEW_PIPELINE_AGENT,
  type WorkspaceActionAgent
} from '../../../../shared/workspace-status-rule-config'
import type { TuiAgent } from '../../../../shared/tui-agent'

const LOCAL_HOST_KEY = 'local'

function useAgentModels(agent: TuiAgent): CatalogModel[] {
  const seeded = getAgentSessionOptionCatalog(agent)?.models
  const [discovered, setDiscovered] = useState<CatalogModel[] | null>(() =>
    readNativeChatEnrichedModels(agent, LOCAL_HOST_KEY)
  )
  useEffect(() => {
    setDiscovered(readNativeChatEnrichedModels(agent, LOCAL_HOST_KEY))
    return subscribeNativeChatEnrichedModels(agent, LOCAL_HOST_KEY, setDiscovered)
  }, [agent])
  return discovered ?? seeded ?? []
}

function effortChoices(model: CatalogModel | undefined): { value: string; label: string }[] {
  const option = model?.options?.find((entry) => entry.id === 'effort')
  return option?.kind.type === 'select' ? option.kind.choices : []
}

export function ReviewPipelineAgentPicker(): React.JSX.Element {
  const config = useAppStore((state) => state.workspaceStatusRules)
  const setWorkspaceStatusRules = useAppStore((state) => state.setWorkspaceStatusRules)
  const disabledTuiAgents = useAppStore((state) => state.settings?.disabledTuiAgents)
  const current: WorkspaceActionAgent =
    config.actionAgents.reviewPipeline ?? DEFAULT_REVIEW_PIPELINE_AGENT
  const models = useAgentModels(current.agent)
  const agents = useMemo(() => {
    const enabled = new Set(
      filterEnabledTuiAgents(
        getAgentCatalog().map((entry) => entry.id),
        disabledTuiAgents
      )
    )
    return getAgentCatalog().filter((entry) => enabled.has(entry.id) || entry.id === current.agent)
  }, [current.agent, disabledTuiAgents])
  const selectedModel = models.find((model) => model.id === current.model)
  const efforts = effortChoices(selectedModel)

  const save = (next: WorkspaceActionAgent): void =>
    setWorkspaceStatusRules({
      ...config,
      actionAgents: { ...config.actionAgents, reviewPipeline: next }
    })
  const pickAgent = (agent: TuiAgent): void => {
    if (agent === current.agent) {
      return
    }
    const defaultModel = getAgentSessionOptionCatalog(agent)?.models.find(
      (model) => model.isDefault
    )?.id
    save({ agent, ...(defaultModel ? { model: defaultModel } : {}) })
  }
  const pickModel = (model: string): void => save({ agent: current.agent, model })
  const pickEffort = (effort: string): void => save({ ...current, effort })

  const modelOptions =
    models.some((model) => model.id === current.model) || !current.model
      ? models
      : [...models, { id: current.model, label: current.model, options: [] }]

  return (
    <section className="divide-y divide-border">
      <div className="py-3">
        <h3 className="text-sm font-medium">
          {translate('auto.components.settings.ReviewPipelinePane.modelTitle', 'Review model')}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {translate(
            'auto.components.settings.ReviewPipelinePane.modelDescription',
            'The agent and model the Review button runs on. It does not change the agent you chat with.'
          )}
        </p>
      </div>
      <SettingsRow
        label={translate('auto.components.settings.ReviewPipelinePane.agentLabel', 'Agent')}
        control={
          <Select
            value={current.agent}
            onValueChange={(value) => {
              const entry = agents.find((agent) => agent.id === value)
              if (entry) {
                pickAgent(entry.id)
              }
            }}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {agents.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  {entry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      {modelOptions.length > 0 ? (
        <SettingsRow
          label={translate('auto.components.settings.ReviewPipelinePane.modelLabel', 'Model')}
          control={
            <Select value={current.model ?? ''} onValueChange={pickModel}>
              <SelectTrigger className="w-[220px]">
                <SelectValue
                  placeholder={translate(
                    'auto.components.settings.ReviewPipelinePane.modelDefault',
                    'Agent default'
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      ) : null}
      {efforts.length > 0 ? (
        <SettingsRow
          label={translate('auto.components.settings.ReviewPipelinePane.effortLabel', 'Effort')}
          control={
            <Select value={current.effort ?? ''} onValueChange={pickEffort}>
              <SelectTrigger className="w-[220px]">
                <SelectValue
                  placeholder={translate(
                    'auto.components.settings.ReviewPipelinePane.effortDefault',
                    'Model default'
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {efforts.map((choice) => (
                  <SelectItem key={choice.value} value={choice.value}>
                    {choice.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      ) : null}
    </section>
  )
}
