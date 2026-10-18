import type {
  WorkspaceRunLoginConfig,
  WorkspaceRunQuickCommand,
  WorkspaceRunService
} from './terminal-quick-command-types'

// Same caps as terminal quick commands. Kept local so this normalizer does not
// import the module that calls it.
const MAX_SERVICE_LABEL_LENGTH = 80
const MAX_SERVICE_COMMAND_LENGTH = 4000

export const MAX_WORKSPACE_RUN_SERVICES = 8
export const DEFAULT_WORKSPACE_RUN_READY_TIMEOUT_SECONDS = 120
export const MIN_WORKSPACE_RUN_READY_TIMEOUT_SECONDS = 5
export const MAX_WORKSPACE_RUN_READY_TIMEOUT_SECONDS = 3600
const MAX_WORKSPACE_RUN_BROWSER_PATH_LENGTH = 500
const MAX_WORKSPACE_RUN_SELECTOR_LENGTH = 200
const MAX_WORKSPACE_RUN_EMAIL_LENGTH = 320

type QuickCommandBase = Pick<WorkspaceRunQuickCommand, 'id' | 'label' | 'scope'>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(record)
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(record, key))
}

function clampReadyTimeoutSeconds(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_WORKSPACE_RUN_READY_TIMEOUT_SECONDS
  }
  const rounded = Math.round(value)
  return Math.min(
    MAX_WORKSPACE_RUN_READY_TIMEOUT_SECONDS,
    Math.max(MIN_WORKSPACE_RUN_READY_TIMEOUT_SECONDS, rounded)
  )
}

function normalizeReadyPort(value: unknown): number | undefined {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value.trim())
        : Number.NaN
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 65535) {
    return undefined
  }
  return numeric
}

function normalizeService(input: unknown): WorkspaceRunService | null {
  if (!isRecord(input)) {
    return null
  }
  const record = input
  if (typeof record.command !== 'string') {
    return null
  }
  const readyPort = normalizeReadyPort(record.readyPort)
  const readyPortEnv = normalizeReadyPortEnv(record.readyPortEnv)
  const service: WorkspaceRunService = {
    label:
      typeof record.label === 'string'
        ? record.label.trim().slice(0, MAX_SERVICE_LABEL_LENGTH)
        : '',
    command: record.command.trimEnd().slice(0, MAX_SERVICE_COMMAND_LENGTH)
  }
  if (readyPort !== undefined) {
    service.readyPort = readyPort
  }
  if (readyPortEnv !== undefined) {
    service.readyPortEnv = readyPortEnv
  }
  return service
}

function normalizeReadyPortEnv(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^[A-Z][A-Z0-9_]{0,63}$/.test(value)) {
    return undefined
  }
  return value
}

function normalizeOptionalText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  return trimmed.slice(0, maxLength)
}

function normalizeAutoLogin(value: unknown): WorkspaceRunLoginConfig | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const record = value
  if (typeof record.email !== 'string') {
    return undefined
  }
  const login: WorkspaceRunLoginConfig = {
    email: record.email.trim().slice(0, MAX_WORKSPACE_RUN_EMAIL_LENGTH)
  }
  const emailSelector = normalizeOptionalText(
    record.emailSelector,
    MAX_WORKSPACE_RUN_SELECTOR_LENGTH
  )
  const passwordSelector = normalizeOptionalText(
    record.passwordSelector,
    MAX_WORKSPACE_RUN_SELECTOR_LENGTH
  )
  const submitSelector = normalizeOptionalText(
    record.submitSelector,
    MAX_WORKSPACE_RUN_SELECTOR_LENGTH
  )
  const successSelector = normalizeOptionalText(
    record.successSelector,
    MAX_WORKSPACE_RUN_SELECTOR_LENGTH
  )
  if (emailSelector) {
    login.emailSelector = emailSelector
  }
  if (passwordSelector) {
    login.passwordSelector = passwordSelector
  }
  if (submitSelector) {
    login.submitSelector = submitSelector
  }
  if (successSelector) {
    login.successSelector = successSelector
  }
  return login
}

export function normalizeWorkspaceRunQuickCommand(
  record: Record<string, unknown>,
  base: QuickCommandBase
): WorkspaceRunQuickCommand {
  const services = (Array.isArray(record.services) ? record.services : [])
    .map(normalizeService)
    .filter((service): service is WorkspaceRunService => service !== null)
    .slice(0, MAX_WORKSPACE_RUN_SERVICES)
  const browserPath = normalizeOptionalText(
    record.browserPath,
    MAX_WORKSPACE_RUN_BROWSER_PATH_LENGTH
  )
  const browserServiceIndex =
    typeof record.browserServiceIndex === 'number' &&
    Number.isInteger(record.browserServiceIndex) &&
    record.browserServiceIndex >= 0 &&
    record.browserServiceIndex < services.length
      ? record.browserServiceIndex
      : undefined
  const autoLogin = normalizeAutoLogin(record.autoLogin)
  return {
    ...base,
    action: 'workspace-run',
    services,
    readyTimeoutSeconds: clampReadyTimeoutSeconds(record.readyTimeoutSeconds),
    openBrowser: record.openBrowser === true,
    ...(browserServiceIndex !== undefined ? { browserServiceIndex } : {}),
    ...(browserPath ? { browserPath } : {}),
    ...(autoLogin ? { autoLogin } : {})
  }
}

function serviceKeys(service: WorkspaceRunService): readonly string[] {
  const keys = ['label', 'command']
  if (service.readyPort !== undefined) {
    keys.push('readyPort')
  }
  if (service.readyPortEnv !== undefined) {
    keys.push('readyPortEnv')
  }
  return keys
}

function isNormalizedService(value: unknown, expected: WorkspaceRunService): boolean {
  if (!isRecord(value)) {
    return false
  }
  return (
    hasExactKeys(value, serviceKeys(expected)) &&
    value.label === expected.label &&
    value.command === expected.command &&
    (expected.readyPort === undefined || value.readyPort === expected.readyPort) &&
    (expected.readyPortEnv === undefined || value.readyPortEnv === expected.readyPortEnv)
  )
}

function loginKeys(login: WorkspaceRunLoginConfig): string[] {
  const keys = ['email']
  if (login.emailSelector !== undefined) {
    keys.push('emailSelector')
  }
  if (login.passwordSelector !== undefined) {
    keys.push('passwordSelector')
  }
  if (login.submitSelector !== undefined) {
    keys.push('submitSelector')
  }
  if (login.successSelector !== undefined) {
    keys.push('successSelector')
  }
  return keys
}

function isNormalizedAutoLogin(value: unknown, expected: WorkspaceRunLoginConfig): boolean {
  if (!isRecord(value)) {
    return false
  }
  return (
    hasExactKeys(value, loginKeys(expected)) &&
    value.email === expected.email &&
    value.emailSelector === expected.emailSelector &&
    value.passwordSelector === expected.passwordSelector &&
    value.submitSelector === expected.submitSelector &&
    value.successSelector === expected.successSelector
  )
}

function workspaceRunKeys(expected: WorkspaceRunQuickCommand): string[] {
  const keys = ['id', 'label', 'action', 'scope', 'services', 'readyTimeoutSeconds', 'openBrowser']
  if (expected.browserServiceIndex !== undefined) {
    keys.push('browserServiceIndex')
  }
  if (expected.browserPath !== undefined) {
    keys.push('browserPath')
  }
  if (expected.autoLogin !== undefined) {
    keys.push('autoLogin')
  }
  return keys
}

export function isNormalizedWorkspaceRunQuickCommand(
  value: unknown,
  expected: WorkspaceRunQuickCommand
): boolean {
  if (!isRecord(value)) {
    return false
  }
  const command = value
  if (!hasExactKeys(command, workspaceRunKeys(expected))) {
    return false
  }
  if (
    command.action !== 'workspace-run' ||
    command.readyTimeoutSeconds !== expected.readyTimeoutSeconds ||
    command.openBrowser !== expected.openBrowser ||
    command.browserServiceIndex !== expected.browserServiceIndex ||
    command.browserPath !== expected.browserPath ||
    !Array.isArray(command.services) ||
    command.services.length !== expected.services.length ||
    expected.services.some(
      (service, index) => !isNormalizedService(command.services?.[index], service)
    )
  ) {
    return false
  }
  if (expected.autoLogin) {
    return isNormalizedAutoLogin(command.autoLogin, expected.autoLogin)
  }
  return command.autoLogin === undefined
}

export function workspaceRunCommandSummary(command: WorkspaceRunQuickCommand): string {
  return command.services
    .map((service) => service.command.trim())
    .filter((text) => text.length > 0)
    .join(' · ')
}
