import type { WorkspaceRunLoginResult } from '../../shared/workspace-run-login-script'

export type WorkspaceRunCredentialsApi = {
  set: (id: string, password: string) => Promise<void>
  has: (id: string) => Promise<boolean>
  clear: (id: string) => Promise<void>
  login: (args: {
    commandId: string
    email: string
    worktree: string
    page: string
    emailSelector?: string
    passwordSelector?: string
    submitSelector?: string
  }) => Promise<WorkspaceRunLoginResult>
}
