import { translate } from '@/i18n/i18n'
import type { WorktreeCardPropertyOption } from './sidebar-workspace-option-items'

export const LINEAR_TITLE_CARD_PROPERTY_OPTION: WorktreeCardPropertyOption = {
  id: 'linear-title',
  properties: ['linear-title'],
  get label() {
    return translate(
      'auto.components.sidebar.SidebarWorkspaceOptionsMenu.linearTitle',
      'Linear title'
    )
  }
}

export const DIFF_CARD_PROPERTY_OPTION: WorktreeCardPropertyOption = {
  id: 'diff',
  properties: ['diff'],
  get label() {
    return translate('auto.components.sidebar.SidebarWorkspaceOptionsMenu.diff', 'Diff size')
  }
}

export const DIFF_MIX_CARD_PROPERTY_OPTION: WorktreeCardPropertyOption = {
  id: 'diff-mix',
  properties: ['diff-mix'],
  get label() {
    return translate(
      'auto.components.sidebar.SidebarWorkspaceOptionsMenu.diffMix',
      'Frontend / backend mix'
    )
  }
}

export const LINEAR_PRIORITY_CARD_PROPERTY_OPTION: WorktreeCardPropertyOption = {
  id: 'linear-priority',
  properties: ['linear-priority'],
  get label() {
    return translate(
      'auto.components.sidebar.SidebarWorkspaceOptionsMenu.linearPriority',
      'Linear priority'
    )
  }
}

export const STACK_CARD_PROPERTY_OPTION: WorktreeCardPropertyOption = {
  id: 'stack',
  properties: ['stack'],
  get label() {
    return translate('auto.components.sidebar.SidebarWorkspaceOptionsMenu.stack', 'GitHub stack')
  }
}

export const UNRESOLVED_COMMENTS_CARD_PROPERTY_OPTION: WorktreeCardPropertyOption = {
  id: 'unresolved-comments',
  properties: ['unresolved-comments'],
  get label() {
    return translate(
      'auto.components.sidebar.SidebarWorkspaceOptionsMenu.unresolvedComments',
      'Unresolved comments'
    )
  }
}

export const PR_OPEN_AGE_CARD_PROPERTY_OPTION: WorktreeCardPropertyOption = {
  id: 'pr-open-age',
  properties: ['pr-open-age'],
  get label() {
    return translate(
      'auto.components.sidebar.SidebarWorkspaceOptionsMenu.prOpenAge',
      'Pull request age'
    )
  }
}

export const REVIEW_FACT_CARD_PROPERTY_OPTIONS: WorktreeCardPropertyOption[] = [
  LINEAR_PRIORITY_CARD_PROPERTY_OPTION,
  DIFF_CARD_PROPERTY_OPTION,
  DIFF_MIX_CARD_PROPERTY_OPTION,
  STACK_CARD_PROPERTY_OPTION,
  UNRESOLVED_COMMENTS_CARD_PROPERTY_OPTION,
  PR_OPEN_AGE_CARD_PROPERTY_OPTION
]

export const PR_AUTHOR_CARD_PROPERTY_OPTION: WorktreeCardPropertyOption = {
  id: 'pr-author',
  properties: ['pr-author'],
  get label() {
    return translate('auto.components.sidebar.SidebarWorkspaceOptionsMenu.prAuthor', 'PR author')
  }
}

export const RUN_CARD_PROPERTY_OPTION: WorktreeCardPropertyOption = {
  id: 'run',
  properties: ['run'],
  get label() {
    return translate('auto.components.sidebar.SidebarWorkspaceOptionsMenu.run', 'Run')
  }
}
