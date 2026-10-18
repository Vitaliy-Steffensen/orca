// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWorkspacePromptSessionOptions } from './use-workspace-prompt-session-options'
import type { TuiAgent } from '../../../../shared/tui-agent'
import type { WorkspaceMode } from '../../../../shared/workspace-mode'

vi.mock('@/runtime/host-model-catalog-snapshots', () => ({
  preloadHostModelCatalogSnapshots: vi.fn(async () => {}),
  readHostModelCatalogSnapshot: (_target: unknown, agent: string) =>
    agent === 'cursor'
      ? {
          origin: 'probe',
          models: [{ id: 'composer-2', label: 'Composer 2', isDefault: true, efforts: [] }]
        }
      : undefined
}))
vi.mock('@/runtime/structured-agent-session-owner', () => ({
  structuredAgentSessionTargetForHost: (host: string) =>
    host === 'local' ? { kind: 'local' } : null
}))
afterEach(cleanup)

type Props = { agent: TuiAgent; mode: WorkspaceMode; host: string }
const initialProps: Props = { agent: 'claude', mode: 'supervised', host: 'local' }

describe('workspace session options', () => {
  it('resolves mode models and keeps explicit model picks across mode changes', async () => {
    const { result, rerender } = renderHook(
      ({ agent, mode, host }: Props) => useWorkspacePromptSessionOptions(agent, mode, host),
      { initialProps }
    )
    await waitFor(() => expect(result.current.seedOverlay?.model).toBe('opus'))
    rerender({ agent: 'cursor', mode: 'ask', host: 'local' })
    expect(result.current.seedOverlay?.model).toBe('composer-2')
    rerender(initialProps)
    await act(async () => {
      await result.current.surface.setOption('model', 'sonnet')
    })
    expect(result.current.seedOverlay?.model).toBe('sonnet')
    rerender({ ...initialProps, mode: 'autonomous' })
    expect(result.current.seedOverlay?.model).toBe('sonnet')
  })
  it('keeps Shift+Tab plan mode independent of model and workspace mode', async () => {
    const { result, rerender } = renderHook(
      ({ agent, mode, host }: Props) => useWorkspacePromptSessionOptions(agent, mode, host),
      { initialProps }
    )
    await act(async () => {
      result.current.togglePlanMode()
    })
    expect(result.current.seedOverlay).toEqual({ model: 'opus', permissionMode: 'plan' })
    rerender({ agent: 'grok', mode: 'autonomous', host: 'local' })
    expect(result.current.seedOverlay).toEqual({ permissionMode: 'plan' })
  })
  it('never reuses local discovered models for an SSH host', async () => {
    const { result, rerender } = renderHook(
      ({ agent, mode, host }: Props) => useWorkspacePromptSessionOptions(agent, mode, host),
      { initialProps }
    )
    rerender({ agent: 'cursor', mode: 'ask', host: 'ssh:dev' })
    expect(result.current.seedOverlay?.model).toBeUndefined()
    const model = result.current.snapshot.find((option) => option.id === 'model')
    expect(
      model?.kind.type === 'select' &&
        model.kind.choices.some((choice) => choice.value === 'composer-2')
    ).toBe(false)
  })
})
