import { describe, expect, it } from 'vitest'
import type { WorkspacePort } from '../../../shared/workspace-ports'
import type { WorkspaceRunQuickCommand } from '../../../shared/terminal-quick-command-types'
import { workspaceRunBrowserOpenPlan, workspaceRunLoginPageId } from './open-workspace-run-browser'
import { listeningPortNumbers } from './workspace-run-ports'
import { transitionWorkspaceRun, type WorkspaceRunEntry } from './workspace-run-transition'

const WORKTREE_ID = 'flowbase-review'

function command(): WorkspaceRunQuickCommand {
  return {
    id: 'flowbase-workspace-run',
    label: 'Run',
    action: 'workspace-run',
    openBrowser: true,
    browserServiceIndex: 1,
    browserPath: '/auth/login',
    autoLogin: { email: 'dev@example.com' },
    services: [
      {
        label: 'Backend',
        command: 'mise run backend-up',
        readyPortEnv: 'DJANGO_PORT'
      },
      {
        label: 'Frontend',
        command: 'mise run frontend-up',
        readyPortEnv: 'FRONTEND_PORT'
      }
    ]
  }
}

function entry(): WorkspaceRunEntry {
  return {
    commandId: 'flowbase-workspace-run',
    state: 'booting',
    startedAt: 0,
    readyDeadlineAt: 900_000,
    openedBrowser: false,
    services: [
      { label: 'Backend', tabId: 'backend', readyPort: 23880, ready: false },
      { label: 'Frontend', tabId: 'frontend', readyPort: 23883, ready: false }
    ]
  }
}

function djangoPort(): WorkspacePort {
  return {
    id: 'orbstack:23880',
    bindHost: '*',
    connectHost: '127.0.0.1',
    port: 23880,
    processName: 'OrbStack',
    protocol: 'http',
    kind: 'external'
  }
}

function frontendPort(): WorkspacePort {
  return {
    id: 'vite:23883',
    bindHost: '::',
    connectHost: 'localhost',
    port: 23883,
    processName: 'node',
    protocol: 'http',
    kind: 'workspace',
    owner: {
      worktreeId: WORKTREE_ID,
      repoId: 'flowbase',
      displayName: 'review',
      path: '/work/flowbase',
      confidence: 'cwd'
    },
    advertisedUrl: 'http://review.localhost:23883/'
  }
}

describe('workspace run browser open after boot', () => {
  it('opens the resolved frontend once Docker has published the API port', () => {
    const scans = { local: { ports: [djangoPort(), frontendPort()] } }
    const listening = listeningPortNumbers(scans)
    expect(listening.has(23880)).toBe(true)
    expect(listening.has(23883)).toBe(true)

    const ready = transitionWorkspaceRun({
      entry: entry(),
      now: 1_000,
      observations: [
        {
          tabId: 'backend',
          tabPresent: true,
          ptyAlive: true,
          ptyAliveSince: 0,
          portListening: listening.has(23880)
        },
        {
          tabId: 'frontend',
          tabPresent: true,
          ptyAlive: true,
          ptyAliveSince: 0,
          portListening: listening.has(23883)
        }
      ]
    })
    expect(ready.entry?.state).toBe('running')
    expect(ready.shouldOpenBrowser).toBe(true)
    expect(ready.entry?.openedBrowser).toBe(false)

    const plan = workspaceRunBrowserOpenPlan({
      command: command(),
      services: ready.entry?.services ?? [],
      worktreeId: WORKTREE_ID,
      scans
    })
    expect(plan.markOpened).toBe(true)
    expect(plan.port?.kind).toBe('workspace')
    expect(plan.port && plan.port.kind === 'workspace' ? plan.port.advertisedUrl : '').toBe(
      'http://review.localhost:23883/'
    )
  })

  it('does not mark the browser opened while the frontend port is still down', () => {
    const scans = { local: { ports: [djangoPort()] } }
    const plan = workspaceRunBrowserOpenPlan({
      command: command(),
      services: entry().services,
      worktreeId: WORKTREE_ID,
      scans
    })
    expect(plan.markOpened).toBe(false)
    expect(plan.port).toBeNull()
  })

  it('signs in on the page created by the open, not the tabs from before it', () => {
    const before = [{ id: 'old', activePageId: 'old-page' }]
    expect(workspaceRunLoginPageId(before, 'login-tab')).toBeNull()
    const after = [...before, { id: 'login-tab', activePageId: 'login-page' }]
    expect(workspaceRunLoginPageId(after, 'login-tab')).toBe('login-page')
  })
})
