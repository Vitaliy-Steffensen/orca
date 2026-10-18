import { ipcMain } from 'electron'
import {
  clearWorkspaceRunPassword,
  hasWorkspaceRunPassword,
  readWorkspaceRunPassword,
  setWorkspaceRunPassword
} from '../credentials/workspace-run-credential-store'
import {
  buildWorkspaceRunLoginExpression,
  parseWorkspaceRunLoginResult,
  type WorkspaceRunLoginResult
} from '../../shared/workspace-run-login-script'
import type { BrowserEvalResult } from '../../shared/runtime-types'

type LoginEval = (params: {
  expression: string
  worktree?: string
  page?: string
}) => Promise<BrowserEvalResult>

const MAX_ID_LENGTH = 80

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readId(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > MAX_ID_LENGTH) {
    throw new Error('Workspace Run command id is required')
  }
  return value
}

function readOptionalSelector(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function registerWorkspaceRunCredentialHandlers(runtime: { browserEval: LoginEval }): void {
  ipcMain.handle('workspaceRunCredentials:has', (_event, id: unknown) =>
    hasWorkspaceRunPassword(readId(id))
  )
  ipcMain.handle('workspaceRunCredentials:set', (_event, id: unknown, password: unknown) => {
    if (typeof password !== 'string') {
      throw new Error('Workspace Run password is required')
    }
    setWorkspaceRunPassword(readId(id), password)
  })
  ipcMain.handle('workspaceRunCredentials:clear', (_event, id: unknown) => {
    clearWorkspaceRunPassword(readId(id))
  })
  ipcMain.handle(
    'workspaceRunCredentials:login',
    async (_event, raw: unknown): Promise<WorkspaceRunLoginResult> => {
      if (!isRecord(raw)) {
        return { ok: false, reason: 'login-error' }
      }
      const request = raw
      const commandId = readId(request.commandId)
      const email = typeof request.email === 'string' ? request.email : ''
      const password = readWorkspaceRunPassword(commandId)
      if (!password) {
        return { ok: false, reason: 'password-not-set' }
      }
      const expression = buildWorkspaceRunLoginExpression(
        {
          emailSelector: readOptionalSelector(request.emailSelector),
          passwordSelector: readOptionalSelector(request.passwordSelector),
          submitSelector: readOptionalSelector(request.submitSelector)
        },
        email,
        password
      )
      const evaluated = await runtime.browserEval({
        expression,
        ...(typeof request.worktree === 'string' ? { worktree: request.worktree } : {}),
        ...(typeof request.page === 'string' ? { page: request.page } : {})
      })
      return parseWorkspaceRunLoginResult(evaluated.result)
    }
  )
}
