import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { executeWorktreeCreation } from './worktree-creation-flow-execute'
import { launchSilentSetup } from './worktree-silent-setup-launch'
import { launchStructuredWorktreeSession } from './worktree-creation-structured-session'
import {
  makeCreatedAgentWorktree,
  seedEmptyActivatableWorktree
} from './worktree-activation-created-agent-test-state'
import { registerWorktreeActivationReset } from './worktree-activation-test-harness'
import type { WorktreeCreationRequest } from './pending-worktree-creation'

vi.mock('./worktree-creation-structured-session', () => ({
  launchStructuredWorktreeSession: vi.fn(async (args) => ({
    accepted: true,
    cancelled: false,
    visibilityUnknown: false,
    activation: args.activation,
    primaryTabId: args.primaryTabId
  }))
}))
vi.mock('./worktree-silent-setup-launch', () => ({
  canRunSetupSilently: () => true,
  launchSilentSetup: vi.fn()
}))
vi.mock('./worktree-creation-completion', () => ({ completeWorktreeCreation: vi.fn() }))

const initialState = useAppStore.getState()
registerWorktreeActivationReset()
afterEach(() => {
  vi.restoreAllMocks()
  useAppStore.setState(initialState, true)
})

describe('native chat creation completed in the background', () => {
  it.each(['claude', 'codex'] as const)(
    'runs setup once in the background with no tab or focus change for %s',
    async (agent) => {
      vi.mocked(launchSilentSetup).mockClear()
      const worktree = makeCreatedAgentWorktree()
      seedEmptyActivatableWorktree(worktree)
      const request: WorktreeCreationRequest = {
        repoId: worktree.repoId,
        name: 'feature',
        setupDecision: 'run',
        agent,
        agentLaunchRoute: 'structured-native-chat',
        pendingFirstAgentMessageRename: false,
        note: '',
        startupPlan: null,
        quickPrompt: '',
        quickTelemetry: null
      }
      const setup = { runnerScriptPath: '/tmp/setup-runner.sh', envVars: {} }
      useAppStore.setState({
        activeView: 'tasks',
        activeWorktreeId: 'previous-worktree',
        activeTabId: 'previous-tab',
        createWorktree: vi.fn().mockResolvedValue({ worktree, setup }),
        pendingWorktreeCreations: {
          'creation-1': {
            creationId: 'creation-1',
            phase: 'fetching',
            status: 'creating',
            startedAt: 1,
            indeterminate: false,
            loaderVisible: true,
            request
          }
        }
      })

      await executeWorktreeCreation('creation-1', request)

      const state = useAppStore.getState()
      expect(state.tabsByWorktree[worktree.id] ?? []).toHaveLength(0)
      expect(launchSilentSetup).toHaveBeenCalledTimes(1)
      expect(launchSilentSetup).toHaveBeenCalledWith(worktree.id, setup, expect.any(Function))
      expect(state.activeView).toBe('tasks')
      expect(state.activeWorktreeId).toBe('previous-worktree')
      expect(state.activeTabId).toBe('previous-tab')
      expect(launchStructuredWorktreeSession).toHaveBeenCalledWith(
        expect.objectContaining({ primaryTabId: null, shouldActivateOnCompletion: false })
      )
    }
  )
})
