import React from 'react'
import { Textarea } from '@/components/ui/textarea'
import type { GlobalSettings } from '../../../../shared/global-settings-types'
import { SettingsRow } from './SettingsFormControls'
import {
  getValidationHostInstructionDescription,
  getValidationHostInstructionPlaceholder,
  getValidationHostInstructionTitle
} from './validation-host-instruction-copy'

export function ValidationHostInstructionSetting({
  settings,
  updateSettings
}: {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void | Promise<void>
}): React.JSX.Element {
  const title = getValidationHostInstructionTitle()
  return (
    <section className="space-y-3">
      <SettingsRow
        alignTop
        label={title}
        description={getValidationHostInstructionDescription()}
        control={
          <Textarea
            aria-label={title}
            value={settings.validationHostInstruction ?? ''}
            placeholder={getValidationHostInstructionPlaceholder()}
            onChange={(event) => updateSettings({ validationHostInstruction: event.target.value })}
            className="h-40 w-[320px]"
          />
        }
      />
    </section>
  )
}
