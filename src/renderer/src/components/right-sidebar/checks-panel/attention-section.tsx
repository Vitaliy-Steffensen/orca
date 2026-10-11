import React, { useState } from 'react'
import { translate } from '@/i18n/i18n'
import { SectionHeader } from '../source-control/listing/section-header'

// Fork: the PR panel's failing-checks / merge-conflict triage and conflict files as one section.
export function PrAttentionSection({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div>
      <SectionHeader
        label={translate('prPanelSections.attention', 'Needs attention')}
        isCollapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
      />
      {collapsed ? null : children}
    </div>
  )
}
