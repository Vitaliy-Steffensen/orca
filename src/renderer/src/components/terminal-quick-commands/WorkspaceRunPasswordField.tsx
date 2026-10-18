import { useEffect, useState } from 'react'
import { translate } from '@/i18n/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function WorkspaceRunPasswordField({ commandId }: { commandId: string }): React.JSX.Element {
  const [password, setPassword] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    void window.api.workspaceRunCredentials.has(commandId).then((hasPassword) => {
      if (!cancelled) {
        setSaved(hasPassword)
      }
    })
    return () => {
      cancelled = true
    }
  }, [commandId])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>
          {translate(
            'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.password',
            'Password'
          )}
        </Label>
        <span className="text-[11px] text-muted-foreground">
          {saved
            ? translate(
                'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.passwordSaved',
                'Saved'
              )
            : translate(
                'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.passwordMissing',
                'Not set'
              )}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="password"
          value={password}
          autoComplete="new-password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder={translate(
            'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.passwordPlaceholder',
            'Write-only. Never shown again.'
          )}
        />
        <Button
          type="button"
          variant="outline"
          disabled={password.trim().length === 0}
          onClick={() => {
            const next = password
            void window.api.workspaceRunCredentials.set(commandId, next).then(() => {
              setPassword('')
              setSaved(true)
            })
          }}
        >
          {translate(
            'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.savePassword',
            'Save'
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={!saved}
          onClick={() => {
            void window.api.workspaceRunCredentials.clear(commandId).then(() => {
              setPassword('')
              setSaved(false)
            })
          }}
        >
          {translate(
            'auto.components.terminal.quick.commands.WorkspaceRunCommandEditor.clearPassword',
            'Clear'
          )}
        </Button>
      </div>
    </div>
  )
}
