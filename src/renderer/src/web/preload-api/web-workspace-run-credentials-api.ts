import type { WorkspaceRunCredentialsApi } from '../../../../preload/api/workspace-run-credentials-api'

export function createWebWorkspaceRunCredentialsApi(): WorkspaceRunCredentialsApi {
  return {
    set: async () => undefined,
    has: async () => false,
    clear: async () => undefined,
    login: async () => ({ ok: false, reason: 'password-not-set' })
  }
}
