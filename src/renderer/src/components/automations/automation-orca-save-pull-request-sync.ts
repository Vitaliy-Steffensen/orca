import { getAutomationKind, type AutomationUpdateInput } from '../../../../shared/automations-types'
import { saveExistingAutomation } from './automation-orca-save-operations'
import type { AutomationSaveContext } from './automation-save-context'

/** Saves a pull-request sync record. Returns true when the draft is that kind, including a no-op create. */
export async function savePullRequestSyncAutomation(
  context: AutomationSaveContext,
  rrule: string,
  now: number
): Promise<boolean> {
  const { local, destination, pageRefresh } = context
  const {
    draft,
    editingAutomationId,
    editingRowKey,
    automations,
    setAutomations,
    selectAutomationId,
    setSelectedRowKey,
    setSelectedAutomationRunPageId,
    setCreateOpen,
    setEditorNotice
  } = local
  const { automationHostTarget, invalidateRowHost } = destination
  if (getAutomationKind(draft) !== 'pull_request_sync') {
    return false
  }
  if (editingAutomationId === null) {
    return true
  }
  const currentAutomation =
    automations.find((automation) => automation.id === editingAutomationId) ?? null
  const updates: AutomationUpdateInput = {
    name: draft.name,
    enabled: draft.enabled !== false
  }
  if (!currentAutomation || currentAutomation.rrule !== rrule) {
    updates.rrule = rrule
    updates.dtstart = now
  }
  const saved = await saveExistingAutomation(
    context,
    editingAutomationId,
    currentAutomation,
    updates,
    undefined,
    automationHostTarget,
    editingRowKey
  )
  if (!saved.ok) {
    setEditorNotice(saved.notice)
    return true
  }
  const automation = saved.value
  invalidateRowHost(editingRowKey, 'definition')
  setAutomations((current) => {
    const next = current.filter((entry) => entry.id !== automation.id)
    return [...next, automation].sort((left, right) => left.name.localeCompare(right.name))
  })
  await pageRefresh.refresh()
  if (editingRowKey) {
    setSelectedAutomationRunPageId(null)
    setSelectedRowKey(editingRowKey)
  }
  selectAutomationId(automation.id)
  setCreateOpen(false)
  return true
}
