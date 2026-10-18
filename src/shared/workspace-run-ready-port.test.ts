import { describe, expect, it } from 'vitest'
import { readWorkspaceRunReadyPortFromToml } from './workspace-run-ready-port'

const TOML = `
FRONTEND_PORT = { default = "27572" }
DJANGO_PORT = { default = "27569" }
NOT_A_PORT = { default = "nope" }
`

describe('readWorkspaceRunReadyPortFromToml', () => {
  it('reads a quoted default port', () => {
    expect(readWorkspaceRunReadyPortFromToml(TOML, 'FRONTEND_PORT')).toBe(27572)
    expect(readWorkspaceRunReadyPortFromToml(TOML, 'DJANGO_PORT')).toBe(27569)
  })

  it('ignores a missing or non-numeric assignment', () => {
    expect(readWorkspaceRunReadyPortFromToml(TOML, 'BACKEND_PORT')).toBeUndefined()
    expect(readWorkspaceRunReadyPortFromToml(TOML, 'NOT_A_PORT')).toBeUndefined()
    expect(readWorkspaceRunReadyPortFromToml(TOML, 'frontend_port')).toBeUndefined()
  })
})
