import { translate } from '@/i18n/i18n'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import type { SettingsSearchEntry } from './settings-search'

export const getChatPromptMarksTitle = (): string =>
  translate('components.settings.nativeChat.promptMarksTitle', 'Prompt marks')

export const getChatPromptMarksSearchEntry = createLocalizedCatalog((): SettingsSearchEntry => ({
  targetSectionId: 'chat-prompt-marks',
  title: getChatPromptMarksTitle(),
  description: translate(
    'components.settings.nativeChat.promptMarksCopy',
    'Attach an instruction to the message you send. It works with every model, and it is separate from Ask mode.'
  ),
  keywords: [
    translate('components.settings.nativeChat.promptMarksSearchSimplify', 'simplify'),
    translate('components.settings.nativeChat.promptMarksSearchExplain', 'explain')
  ]
}))
