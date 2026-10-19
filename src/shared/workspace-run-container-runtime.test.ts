import { describe, expect, it } from 'vitest'
import { workspaceRunMentionsContainers } from './workspace-run-container-runtime'
import type { WorkspaceRunQuickCommand } from './terminal-quick-command-types'

function command(...commands: string[]): WorkspaceRunQuickCommand {
  return {
    id: 'run',
    label: 'Run',
    action: 'workspace-run',
    scope: { type: 'global' },
    services: commands.map((text, index) => ({ label: `Service ${index}`, command: text })),
    readyTimeoutSeconds: 120,
    openBrowser: false
  }
}

describe('workspaceRunMentionsContainers', () => {
  it('spots container tooling in any service', () => {
    expect(workspaceRunMentionsContainers(command('pnpm dev', 'docker compose up'))).toBe(true)
    expect(workspaceRunMentionsContainers(command('podman-compose up'))).toBe(true)
  })

  it('leaves plain dev servers alone', () => {
    expect(workspaceRunMentionsContainers(command('pnpm dev', 'cargo run'))).toBe(false)
    expect(workspaceRunMentionsContainers(command('npm run dockerize-docs'))).toBe(false)
  })
})
