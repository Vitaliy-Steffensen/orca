import { useCallback, useMemo, useRef, useState } from 'react'
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
export function useWorkspacePromptPlanMode(): {
  snapshot: SessionOptionDescriptor[]
  surface: SessionOptionsSurface
  togglePlanMode: () => boolean
  seedOverlay: Readonly<Record<string, string>> | undefined
} {
  const [mode, setMode] = useState('default')
  const touchedRef = useRef(false)
  const [touched, setTouched] = useState(false)
  const snapshot = useMemo(() => permissionModeSnapshot(mode), [mode])
  const applyMode = useCallback((value: string): SessionOptionDescriptor[] => {
    touchedRef.current = true
    setTouched(true)
    setMode(value)
    return permissionModeSnapshot(value)
  }, [])
  const surface = useMemo<SessionOptionsSurface>(
    () => ({
      getSnapshot: () => permissionModeSnapshot(mode),
      setOption: (id, value: SessionOptionValue) => {
        if (id === 'permissionMode' && typeof value === 'string') {
          return Promise.resolve({ snapshot: applyMode(value) })
        }
        return Promise.resolve({ snapshot: permissionModeSnapshot(mode) })
      },
      invokeAction: () => Promise.resolve({ snapshot: permissionModeSnapshot(mode) }),
      subscribe: () => () => {}
    }),
    [applyMode, mode]
  )
  const togglePlanMode = useNativeChatPlanModeToggle(surface, snapshot)
  const seedOverlay = useMemo(
    () => (touched ? narrowStructuredLaunchSeedOptions({ permissionMode: mode }) : undefined),
    [mode, touched]
  )
  return { snapshot, surface, togglePlanMode, seedOverlay }
}
