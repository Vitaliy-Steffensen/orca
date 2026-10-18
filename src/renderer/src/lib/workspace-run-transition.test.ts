import { describe, expect, it } from 'vitest'
import {
  transitionWorkspaceRun,
  WORKSPACE_RUN_LIVENESS_READY_MS,
  type WorkspaceRunEntry,
  type WorkspaceRunServiceObservation
} from './workspace-run-transition'

function entry(overrides: Partial<WorkspaceRunEntry> = {}): WorkspaceRunEntry {
  return {
    commandId: 'dev',
    state: 'booting',
    startedAt: 0,
    readyDeadlineAt: 120_000,
    openedBrowser: false,
    services: [
      { label: 'Web', tabId: 'run-tab', leafId: 'web', readyPort: 5173, ready: false },
      { label: 'Api', tabId: 'run-tab', leafId: 'api', ready: false }
    ],
    ...overrides
  }
}

function observe(
  leafId: string,
  overrides: Partial<WorkspaceRunServiceObservation> = {}
): WorkspaceRunServiceObservation {
  return {
    leafId,
    tabPresent: true,
    ptyAlive: true,
    ptyAliveSince: 0,
    portListening: false,
    ...overrides
  }
}

describe('transitionWorkspaceRun', () => {
  it('becomes running and asks to open the browser when every service is ready', () => {
    const result = transitionWorkspaceRun({
      entry: entry(),
      now: 4_000,
      observations: [observe('web', { portListening: true }), observe('api', { ptyAliveSince: 0 })]
    })
    expect(result.entry?.state).toBe('running')
    expect(result.shouldOpenBrowser).toBe(true)
    expect(result.entry?.openedBrowser).toBe(false)
    expect(result.toast).toBeUndefined()
  })

  it('asks again while the browser has not opened yet', () => {
    const running = entry({
      state: 'running',
      openedBrowser: false,
      services: [
        { label: 'Web', tabId: 'run-tab', leafId: 'web', readyPort: 5173, ready: true },
        { label: 'Api', tabId: 'run-tab', leafId: 'api', ready: true }
      ]
    })
    const result = transitionWorkspaceRun({
      entry: running,
      now: 5_000,
      observations: [observe('web', { portListening: true }), observe('api', { ptyAliveSince: 0 })]
    })
    expect(result.shouldOpenBrowser).toBe(true)
    expect(result.entry).toBe(running)
  })

  it('does not ask to open the browser twice', () => {
    const result = transitionWorkspaceRun({
      entry: entry({
        state: 'running',
        openedBrowser: true,
        services: [
          { label: 'Web', tabId: 'run-tab', leafId: 'web', readyPort: 5173, ready: true },
          { label: 'Api', tabId: 'run-tab', leafId: 'api', ready: true }
        ]
      }),
      now: 5_000,
      observations: [observe('web', { portListening: true }), observe('api', { ptyAliveSince: 0 })]
    })
    expect(result.shouldOpenBrowser).toBe(false)
    expect(result.entry?.state).toBe('running')
  })

  it('clears a booting run and toasts when every pty has exited', () => {
    const result = transitionWorkspaceRun({
      entry: entry(),
      now: 1_000,
      observations: [
        observe('web', { ptyAlive: false, ptyAliveSince: null }),
        observe('api', { ptyAlive: false, ptyAliveSince: null })
      ]
    })
    expect(result.entry).toBeNull()
    expect(result.toast).toBe('exited-before-up')
  })

  it('clears a booting run on the deadline without a pty toast', () => {
    const result = transitionWorkspaceRun({
      entry: entry(),
      now: 120_000,
      observations: [observe('web'), observe('api', { ptyAliveSince: 119_000 })]
    })
    expect(result.entry).toBeNull()
    expect(result.toast).toBe('timed-out')
  })

  it('clears a running stack when a tracked pty exits', () => {
    const result = transitionWorkspaceRun({
      entry: entry({ state: 'running' }),
      now: 10_000,
      observations: [
        observe('web', { portListening: true }),
        observe('api', { ptyAlive: false, ptyAliveSince: null })
      ]
    })
    expect(result.entry).toBeNull()
    expect(result.toast).toBeUndefined()
  })

  it('drops a hand-closed tab and clears the badge when it was the last one', () => {
    const partial = transitionWorkspaceRun({
      entry: entry(),
      now: 1_000,
      observations: [observe('web'), observe('api', { tabPresent: false, ptyAlive: false })]
    })
    expect(partial.entry?.services.map((service) => service.leafId)).toEqual(['web'])
    expect(partial.toast).toBeUndefined()

    const last = transitionWorkspaceRun({
      entry: entry(),
      now: 1_000,
      observations: [
        observe('web', { tabPresent: false, ptyAlive: false }),
        observe('api', { tabPresent: false, ptyAlive: false })
      ]
    })
    expect(last.entry).toBeNull()
    expect(last.toast).toBeUndefined()
  })

  it('keeps an adopted run with no tabs', () => {
    const adopted = entry({ state: 'running', services: [], openedBrowser: true })
    const result = transitionWorkspaceRun({ entry: adopted, now: 10_000, observations: [] })
    expect(result.entry).toBe(adopted)
  })

  it('waits out the no-port liveness window', () => {
    const waiting = transitionWorkspaceRun({
      entry: entry({ services: [{ label: 'Api', tabId: 'run-tab', leafId: 'api', ready: false }] }),
      now: 1_000,
      observations: [observe('api', { ptyAliveSince: 1_000 })]
    })
    expect(waiting.entry?.state).toBe('booting')
    expect(waiting.entry?.services[0]?.ready).toBe(false)

    const ready = transitionWorkspaceRun({
      entry: entry({ services: [{ label: 'Api', tabId: 'run-tab', leafId: 'api', ready: false }] }),
      now: 1_000 + WORKSPACE_RUN_LIVENESS_READY_MS,
      observations: [observe('api', { ptyAliveSince: 1_000 })]
    })
    expect(ready.entry?.state).toBe('running')
  })
})
