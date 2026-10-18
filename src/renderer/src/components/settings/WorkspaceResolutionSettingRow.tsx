import React from 'react'
import { translate } from '@/i18n/i18n'
import type { WorkspaceStatusRuleResolution } from '../../../../shared/workspace-status-rule-config'
import { SettingsRow, SettingsSegmentedControl } from './SettingsFormControls'

/** What Orca does with a workspace whose pull request has run its course. */
export function WorkspaceResolutionSettingRow({
  label,
  description,
  value,
  onChange
}: {
  label: string
  description: string
  value: WorkspaceStatusRuleResolution
  onChange: (value: WorkspaceStatusRuleResolution) => void
}): React.JSX.Element {
  return (
    <SettingsRow
      alignTop
      label={label}
      description={description}
      control={
        <SettingsSegmentedControl<WorkspaceStatusRuleResolution>
          size="sm"
          value={value}
          onChange={onChange}
          ariaLabel={label}
          options={[
            {
              value: 'none',
              label: translate('auto.components.settings.prRules.resolution.none', 'Keep')
            },
            {
              value: 'archive',
              label: translate('auto.components.settings.prRules.resolution.archive', 'Archive')
            },
            {
              value: 'delete',
              label: translate('auto.components.settings.prRules.resolution.delete', 'Delete')
            }
          ]}
        />
      }
    />
  )
}
