import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { useAppStore } from '@/store'
import {
  makeCreatedAgentWorktree,
  seedEmptyActivatableWorktree
} from './worktree-activation-created-agent-test-state'
import { launchSilentSetup } from './worktree-silent-setup-launch'
import { spawnBackgroundTerminalPane } from './spawn-background-terminal-pane'
import { registerEagerPtyBuffer } from '@/components/terminal-pane/pty-dispatcher'

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))
vi.mock('./spawn-background-terminal-pane', () => ({
  spawnBackgroundTerminalPane: vi.fn(async () => ({ ptyId: 'pty-1' }))
}))
vi.mock('./worktree-activation', () => ({ activateAndRevealWorktree: vi.fn() }))
vi.mock('@/components/terminal-pane/pty-dispatcher', () => ({
  registerEagerPtyBuffer: vi.fn(() => ({ flush: () => 'boom\n', dispose: vi.fn() }))
}))

const WORKTREE = makeCreatedAgentWorktree()
const setup = { runnerScriptPath: '/tmp/setup-runner.sh', envVars: { A: '1' } }
const initialState = useAppStore.getState()

beforeEach(() => {
  vi.stubGlobal('navigator', { userAgent: 'Macintosh' })
  seedEmptyActivatableWorktree(WORKTREE)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  useAppStore.setState(initialState, true)
})

async function launchAndCaptureExit(onUnavailable = vi.fn()): Promise<(code: number) => void> {
  launchSilentSetup(WORKTREE.id, setup, onUnavailable)
  await vi.waitFor(() => expect(registerEagerPtyBuffer).toHaveBeenCalled())
  const onExit = vi.mocked(registerEagerPtyBuffer).mock.calls[0][1]
  return (code) => onExit('pty-1', code)
}

describe('launchSilentSetup', () => {
  it('spawns one tabless PTY that exits with the script status', async () => {
    await launchAndCaptureExit()
    expect(spawnBackgroundTerminalPane).toHaveBeenCalledTimes(1)
    const args = vi.mocked(spawnBackgroundTerminalPane).mock.calls[0][0]
    expect(args.command).toBe('bash /tmp/setup-runner.sh; exit $?')
    expect(args.placement).toBeUndefined()
    expect(useAppStore.getState().tabsByWorktree[WORKTREE.id] ?? []).toHaveLength(0)
  })

  it('stays silent when setup succeeds', async () => {
    const exit = await launchAndCaptureExit()
    exit(0)
    expect(toast.error).not.toHaveBeenCalled()
    expect(useAppStore.getState().tabsByWorktree[WORKTREE.id] ?? []).toHaveLength(0)
  })

  it('opens a Setup tab with the output and a toast when setup fails', async () => {
    const exit = await launchAndCaptureExit()
    exit(2)
    const tabs = useAppStore.getState().tabsByWorktree[WORKTREE.id]
    expect(tabs).toHaveLength(1)
    expect(tabs[0].customTitle).toBe('Setup')
    expect(toast.error).toHaveBeenCalledTimes(1)
  })

  it('falls back to the visible launch when the spawn fails', async () => {
    vi.mocked(spawnBackgroundTerminalPane).mockRejectedValueOnce(new Error('no pty'))
    const onUnavailable = vi.fn()
    launchSilentSetup(WORKTREE.id, setup, onUnavailable)
    await vi.waitFor(() => expect(onUnavailable).toHaveBeenCalledTimes(1))
  })
})
