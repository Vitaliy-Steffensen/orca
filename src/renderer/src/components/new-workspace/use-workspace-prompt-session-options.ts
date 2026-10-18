import type { TuiAgent } from '../../../../shared/tui-agent'
import type { WorkspaceMode } from '../../../../shared/workspace-mode'
import { getAgentSessionOptionCatalog } from '../../../../shared/agent-session-option-catalog'
import {
  resolveWorkspaceModeModel,
  WORKSPACE_MODE_LAUNCH_DEFAULTS
} from '../../../../shared/workspace-mode-launch-defaults'
import {
  readHostModelCatalogSnapshot,
  preloadHostModelCatalogSnapshots
} from '@/runtime/host-model-catalog-snapshots'
import { structuredAgentSessionTargetForHost } from '@/runtime/structured-agent-session-owner'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNativeChatPlanModeToggle } from '@/components/native-chat/native-chat-plan-mode-toggle'
import { narrowStructuredLaunchSeedOptions } from '../../../../shared/native-chat-session-option-defaults'
import type {
  SessionOptionDescriptor,
  SessionOptionsSurface,
  SessionOptionValue
} from '../../../../shared/native-chat-session-options'

const PLAN_MODE_CHOICES = [
  { value: 'default', label: 'Normal' },
  { value: 'acceptEdits', label: 'Accept edits' },
  { value: 'plan', label: 'Plan' }
]

function permissionModeSnapshot(mode: string): SessionOptionDescriptor[] {
  return [
    {
      id: 'permissionMode',
      label: 'Permission mode',
      category: 'mode',
      kind: {
        type: 'select',
        currentValue: mode,
        choices: PLAN_MODE_CHOICES
      },
      valueSource: 'default',
      transport: 'agent-session',
      settable: true
    }
  ]
}

/**
 * The new-workspace prompt uses the chat composer's plan switch before a session
 * exists. Shift+Tab and the mode picker share that surface; a touched value is
 * what the created chat is seeded with.
 */
export function useWorkspacePromptSessionOptions(
  agent: TuiAgent | null,
  workspaceMode?: WorkspaceMode,
  executionHostId?: string | null
): {
  snapshot: SessionOptionDescriptor[]
  surface: SessionOptionsSurface
  togglePlanMode: () => boolean
  seedOverlay: Readonly<Record<string, string>> | undefined
} {
  const [mode, setMode] = useState('default')
  const touchedRef = useRef(false)
  const [touched, setTouched] = useState(false)
  const [, refreshCatalog] = useState(0)
  const [modelPicks, setModelPicks] = useState<Record<string, string>>({})
  const modelTouchedRef = useRef(false)
  const pickKey = `${executionHostId ?? ''}:${agent ?? ''}`
  useEffect(() => {
    const target = structuredAgentSessionTargetForHost(executionHostId)
    if (!target || !agent) {
      return
    }
    let active = true
    void preloadHostModelCatalogSnapshots(target, [agent]).then(() => {
      if (active) {
        refreshCatalog((version) => version + 1)
      }
    })
    return () => {
      active = false
    }
  }, [agent, executionHostId])
  const catalog = agent ? getAgentSessionOptionCatalog(agent) : null
  const target = structuredAgentSessionTargetForHost(executionHostId)
  const cached =
    target && agent
      ? readHostModelCatalogSnapshot(target, agent, { newLaunch: true, seedsModel: true })
      : undefined
  const discovered = cached && cached.origin !== 'unknown' ? cached.models : undefined
  const models = catalog?.discoveredModelsAreAuthoritative
    ? (discovered ?? [])
    : [
        ...new Map(
          [...(catalog?.models ?? []), ...(discovered ?? [])].map((model) => [model.id, model])
        ).values()
      ]
  const defaults = workspaceMode ? WORKSPACE_MODE_LAUNCH_DEFAULTS[workspaceMode] : undefined
  const preferredModel =
    defaults?.agent === agent && !modelTouchedRef.current
      ? resolveWorkspaceModeModel(defaults.model, models)
      : undefined
  const pickedModel = modelPicks[pickKey]
  const model =
    pickedModel !== undefined
      ? models.some((row) => row.id === pickedModel)
        ? pickedModel
        : undefined
      : preferredModel
  const modelDescriptor: SessionOptionDescriptor[] = models.length
    ? [
        {
          id: 'model',
          label: 'Model',
          category: 'model',
          kind: {
            type: 'select',
            currentValue: model,
            choices: models.map((row) => ({ value: row.id, label: row.label }))
          },
          valueSource: pickedModel !== undefined ? 'applied' : 'default',
          transport: 'agent-session',
          settable: true
        }
      ]
    : []
  const snapshot = [...permissionModeSnapshot(mode), ...modelDescriptor]
  const applyMode = useCallback((value: string): SessionOptionDescriptor[] => {
    touchedRef.current = true
    setTouched(true)
    setMode(value)
    return permissionModeSnapshot(value)
  }, [])
  const surface: SessionOptionsSurface = {
    getSnapshot: () => snapshot,
    setOption: (id, value: SessionOptionValue) => {
      if (id === 'model' && typeof value === 'string') {
        modelTouchedRef.current = true
        setModelPicks((picks) => ({ ...picks, [pickKey]: value }))
        return Promise.resolve({
          snapshot: snapshot.map((option) =>
            option.id === 'model' && option.kind.type === 'select'
              ? { ...option, kind: { ...option.kind, currentValue: value }, valueSource: 'applied' }
              : option
          )
        })
      }
      if (id === 'permissionMode' && typeof value === 'string') {
        return Promise.resolve({ snapshot: [...applyMode(value), ...modelDescriptor] })
      }
      return Promise.resolve({ snapshot })
    },
    invokeAction: () => Promise.resolve({ snapshot }),
    subscribe: () => () => {}
  }
  const togglePlanMode = useNativeChatPlanModeToggle(surface, snapshot)
  const seedOverlay = useMemo(
    () =>
      touched || model
        ? narrowStructuredLaunchSeedOptions({
            ...(touched ? { permissionMode: mode } : {}),
            ...(model ? { model } : {})
          })
        : undefined,
    [mode, touched, model]
  )
  return { snapshot, surface, togglePlanMode, seedOverlay }
}
