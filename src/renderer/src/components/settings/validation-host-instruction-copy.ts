import { translate } from '@/i18n/i18n'
import { searchKeywords } from './settings-search-keywords'

export function getValidationHostInstructionTitle(): string {
  return translate(
    'auto.components.settings.validationHostInstruction.title',
    'Where agents run validation'
  )
}

export function getValidationHostInstructionDescription(): string {
  return translate(
    'auto.components.settings.validationHostInstruction.description',
    'Appended to the conflict-resolution prompts Orca sends an agent, so heavy checks run on a remote box instead of this machine. Leave empty to append nothing.'
  )
}

export function getValidationHostInstructionPlaceholder(): string {
  return translate(
    'auto.components.settings.validationHostInstruction.placeholder',
    'Run the full suite on the remote validation box, not on this machine.'
  )
}

export function getValidationHostInstructionSearchKeywords(): string[] {
  return searchKeywords([
    {
      key: 'auto.components.settings.validationHostInstruction.search.validation',
      fallback: 'validation'
    },
    { key: 'auto.components.settings.validationHostInstruction.search.host', fallback: 'host' },
    { key: 'auto.components.settings.validationHostInstruction.search.remote', fallback: 'remote' },
    {
      key: 'auto.components.settings.validationHostInstruction.search.offload',
      fallback: 'offload'
    },
    { key: 'auto.components.settings.validationHostInstruction.search.tests', fallback: 'tests' },
    {
      key: 'auto.components.settings.validationHostInstruction.search.conflicts',
      fallback: 'conflicts'
    }
  ])
}
