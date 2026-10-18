import { useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type {
  TerminalQuickCommand,
  WorkspaceRunLoginConfig,
  WorkspaceRunQuickCommand,
  WorkspaceRunService
} from '../../../../shared/terminal-quick-command-types'
import {
  DEFAULT_WORKSPACE_RUN_READY_TIMEOUT_SECONDS,
  MAX_WORKSPACE_RUN_SERVICES
} from '../../../../shared/workspace-run-quick-command'
import { createBrowserUuid } from '@/lib/browser-uuid'
import { translate } from '@/i18n/i18n'
import { WorkspaceRunPasswordField } from './WorkspaceRunPasswordField'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type WorkspaceRunCommandEditorProps = {
  draft: WorkspaceRunQuickCommand
  setDraft: Dispatch<SetStateAction<TerminalQuickCommand>>
}

function updateRun(
  setDraft: Dispatch<SetStateAction<TerminalQuickCommand>>,
  update: (current: WorkspaceRunQuickCommand) => WorkspaceRunQuickCommand
): void {
  setDraft((current) => (current.action === 'workspace-run' ? update(current) : current))
}

function patchLogin(
  current: WorkspaceRunLoginConfig | undefined,
  patch: Partial<WorkspaceRunLoginConfig>
): WorkspaceRunLoginConfig {
  return {
    email: current?.email ?? '',
    ...(current?.emailSelector ? { emailSelector: current.emailSelector } : {}),
    ...(current?.passwordSelector ? { passwordSelector: current.passwordSelector } : {}),
    ...(current?.submitSelector ? { submitSelector: current.submitSelector } : {}),
    ...(current?.successSelector ? { successSelector: current.successSelector } : {}),
    ...patch
  }
}

export function WorkspaceRunCommandEditor({
  draft,
  setDraft
}: WorkspaceRunCommandEditorProps): React.JSX.Element {
  const [selectorsOpen, setSelectorsOpen] = useState(false)
  const rowIds = useRef<string[]>([])
  const rowDraftId = useRef(draft.id)
  if (rowDraftId.current !== draft.id) {
    rowDraftId.current = draft.id
    rowIds.current = []
  }
  const services = draft.services.length > 0 ? draft.services : [{ label: '', command: '' }]
  const rowKey = (index: number): string => {
    while (rowIds.current.length <= index) {
      rowIds.current.push(createBrowserUuid())
    }
    const id = rowIds.current[index]
    if (!id) {
      throw new Error('Workspace Run row id was not assigned')
    }
    return id
  }
  const noReadyPort = services.every((service) => service.readyPort === undefined)

  const setServices = (next: WorkspaceRunService[]): void => {
    updateRun(setDraft, (current) => ({ ...current, services: next }))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>
          {translate(
            'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.services',
            'Services'
          )}
        </Label>
        {services.map((service, index) => (
          <div
            key={rowKey(index)}
            className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1.4fr)_5.5rem_auto] items-center gap-2"
          >
            <Input
              value={service.label}
              aria-label={translate(
                'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.serviceLabel',
                'Service label'
              )}
              placeholder={translate(
                'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.serviceLabelPlaceholder',
                'Backend'
              )}
              onChange={(event) => {
                const next = services.map((entry, entryIndex) =>
                  entryIndex === index ? { ...entry, label: event.target.value } : entry
                )
                setServices(next)
              }}
            />
            <Input
              value={service.command}
              aria-label={translate(
                'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.serviceCommand',
                'Service command'
              )}
              placeholder={translate(
                'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.serviceCommandPlaceholder',
                'pnpm dev'
              )}
              onChange={(event) => {
                const next = services.map((entry, entryIndex) =>
                  entryIndex === index ? { ...entry, command: event.target.value } : entry
                )
                setServices(next)
              }}
            />
            <Input
              value={service.readyPort ?? ''}
              inputMode="numeric"
              aria-label={translate(
                'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.readyPort',
                'Ready port'
              )}
              placeholder={translate(
                'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.readyPortPlaceholder',
                'Port'
              )}
              onChange={(event) => {
                const raw = event.target.value.trim()
                const port = raw === '' ? undefined : Number(raw)
                const next = services.map((entry, entryIndex) => {
                  if (entryIndex !== index) {
                    return entry
                  }
                  if (port === undefined) {
                    const { readyPort: _readyPort, ...rest } = entry
                    return rest
                  }
                  return { ...entry, readyPort: port }
                })
                setServices(next)
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={translate(
                'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.removeService',
                'Remove service'
              )}
              onClick={() => {
                rowIds.current.splice(index, 1)
                setServices(services.filter((_, entryIndex) => entryIndex !== index))
              }}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={services.length >= MAX_WORKSPACE_RUN_SERVICES}
          onClick={() => setServices([...services, { label: '', command: '' }])}
        >
          <Plus />
          {translate(
            'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.addService',
            'Add service'
          )}
        </Button>
        {noReadyPort ? (
          <p className="text-[11px] text-muted-foreground">
            {translate(
              'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.noReadyPort',
              'No ready port set — reports running 3s after launch.'
            )}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>
            {translate(
              'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.timeout',
              'Ready timeout (seconds)'
            )}
          </Label>
          <Input
            inputMode="numeric"
            value={draft.readyTimeoutSeconds ?? DEFAULT_WORKSPACE_RUN_READY_TIMEOUT_SECONDS}
            onChange={(event) => {
              const next = Number(event.target.value)
              updateRun(setDraft, (current) => ({
                ...current,
                readyTimeoutSeconds: Number.isFinite(next) ? next : current.readyTimeoutSeconds
              }))
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>
            {translate(
              'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.browserPath',
              'Browser path'
            )}
          </Label>
          <Input
            value={draft.browserPath ?? ''}
            placeholder="/login"
            onChange={(event) => {
              const browserPath = event.target.value
              updateRun(setDraft, (current) => ({
                ...current,
                ...(browserPath ? { browserPath } : { browserPath: undefined })
              }))
            }}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={draft.openBrowser === true}
          onCheckedChange={(checked) => {
            updateRun(setDraft, (current) => ({ ...current, openBrowser: checked === true }))
          }}
        />
        {translate(
          'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.openBrowser',
          'Open in browser when the stack is up'
        )}
      </label>

      <div className="space-y-3 rounded-md border border-border p-3">
        <div className="space-y-2">
          <Label>
            {translate(
              'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.email',
              'Login email'
            )}
          </Label>
          <Input
            value={draft.autoLogin?.email ?? ''}
            autoComplete="off"
            placeholder="ada@example.com"
            onChange={(event) => {
              const email = event.target.value
              updateRun(setDraft, (current) => ({
                ...current,
                autoLogin:
                  email || current.autoLogin ? patchLogin(current.autoLogin, { email }) : undefined
              }))
            }}
          />
        </div>
        <WorkspaceRunPasswordField commandId={draft.id} />
        <p className="text-[11px] text-muted-foreground">
          {translate(
            'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.loginHint',
            'Leave the email empty to open the app without signing in. The password stays on this computer.'
          )}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setSelectorsOpen((open) => !open)}
        >
          {translate(
            'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.advancedSelectors',
            'Advanced selectors'
          )}
        </Button>
        {selectorsOpen ? (
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                key: 'emailSelector' as const,
                label: translate(
                  'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.emailSelector',
                  'Email selector'
                )
              },
              {
                key: 'passwordSelector' as const,
                label: translate(
                  'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.passwordSelector',
                  'Password selector'
                )
              },
              {
                key: 'submitSelector' as const,
                label: translate(
                  'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.submitSelector',
                  'Submit selector'
                )
              },
              {
                key: 'successSelector' as const,
                label: translate(
                  'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.successSelector',
                  'Success selector'
                )
              }
            ].map((field) => (
              <div key={field.key} className="space-y-1">
                <Label>{field.label}</Label>
                <Input
                  value={draft.autoLogin?.[field.key] ?? ''}
                  onChange={(event) => {
                    const value = event.target.value
                    updateRun(setDraft, (current) => ({
                      ...current,
                      autoLogin: patchLogin(current.autoLogin, {
                        [field.key]: value || undefined
                      })
                    }))
                  }}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
