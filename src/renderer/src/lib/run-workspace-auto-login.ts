import { toast } from 'sonner'
import { callRuntimeRpc } from '@/runtime/runtime-rpc-client'
import { translate } from '@/i18n/i18n'
import type { WorkspaceRunQuickCommand } from '../../../shared/terminal-quick-command-types'
import {
  parseWorkspaceRunLoginResult,
  workspaceRunLoginWaitSelector,
  type WorkspaceRunLoginFailureReason
} from '../../../shared/workspace-run-login-script'

const LOCAL_TARGET = { kind: 'local' } as const

function failureLabel(reason: WorkspaceRunLoginFailureReason): string {
  if (reason === 'no-password-field') {
    return translate('auto.lib.run.workspace.auto.login.noPassword', 'no password field')
  }
  if (reason === 'no-email-field') {
    return translate('auto.lib.run.workspace.auto.login.noEmail', 'no email field')
  }
  if (reason === 'no-submit') {
    return translate('auto.lib.run.workspace.auto.login.noSubmit', 'no submit button')
  }
  if (reason === 'not-visible') {
    return translate('auto.lib.run.workspace.auto.login.notVisible', 'the login field is hidden')
  }
  if (reason === 'password-not-set') {
    return translate('auto.lib.run.workspace.auto.login.passwordMissing', 'password not set')
  }
  return translate('auto.lib.run.workspace.auto.login.error', 'the page rejected the login')
}

export async function runWorkspaceAutoLogin(args: {
  worktreeId: string
  command: WorkspaceRunQuickCommand
  pageId: string
}): Promise<void> {
  const login = args.command.autoLogin
  if (!login?.email.trim()) {
    return
  }
  const target = { worktree: args.worktreeId, page: args.pageId }
  try {
    await callRuntimeRpc(LOCAL_TARGET, 'browser.wait', {
      ...target,
      selector: workspaceRunLoginWaitSelector(login),
      timeout: 20_000
    })
    const evaluated = await window.api.workspaceRunCredentials.login({
      commandId: args.command.id,
      email: login.email,
      worktree: args.worktreeId,
      page: args.pageId,
      emailSelector: login.emailSelector,
      passwordSelector: login.passwordSelector,
      submitSelector: login.submitSelector
    })
    const result = evaluated.ok
      ? evaluated
      : parseWorkspaceRunLoginResult(JSON.stringify(evaluated))
    if (!result.ok) {
      toast.error(
        translate('auto.lib.run.workspace.auto.login.failed', 'Auto-login failed: {{reason}}', {
          reason: failureLabel(result.reason)
        })
      )
      return
    }
    if (login.successSelector?.trim()) {
      await callRuntimeRpc(LOCAL_TARGET, 'browser.wait', {
        ...target,
        selector: login.successSelector,
        timeout: 15_000
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    toast.error(
      translate('auto.lib.run.workspace.auto.login.failed', 'Auto-login failed: {{reason}}', {
        reason: message || failureLabel('login-error')
      })
    )
  }
}
