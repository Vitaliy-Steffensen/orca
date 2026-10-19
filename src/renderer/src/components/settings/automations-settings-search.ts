import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from './settings-search-keywords'

export const getAutomationsSettingsSearchEntries = createLocalizedCatalog(() => [
  {
    title: translate('auto.components.settings.automations.showButton', 'Show Automations Button'),
    description: translate(
      'auto.components.settings.automations.showButtonDescription',
      'Show the Automations shortcut in the sidebar.'
    ),
    keywords: [
      ...translateSearchKeyword(
        'auto.components.settings.automations.keywordAutomations',
        'automations'
      ),
      ...translateSearchKeyword('auto.components.settings.automations.keywordSchedule', 'schedule'),
      ...translateSearchKeyword('auto.components.settings.automations.keywordAgent', 'agent'),
      ...translateSearchKeyword('auto.components.settings.automations.keywordRuns', 'runs')
    ]
  },
  {
    title: translate(
      'auto.components.settings.prRules.scheduledBy',
      'Scheduled by the Pull request sync automation'
    ),
    description: translate(
      'auto.components.settings.prRules.scheduledByDescription',
      'When it runs, and whether it runs, is on the Automations page. The rules below are what each check does.'
    ),
    keywords: [
      ...translateSearchKeyword(
        'auto.components.settings.automations.keywordPullRequest',
        'pull request'
      ),
      ...translateSearchKeyword('auto.components.settings.automations.keywordReview', 'review'),
      ...translateSearchKeyword(
        'auto.components.settings.automations.keywordBoardColumn',
        'board column'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.automations.keywordStatusRules',
        'status rules'
      )
    ]
  }
])
