import {
  LANGUAGE_SERVER_LANGUAGES,
  languageServerOptions
} from '../../../../shared/language-server'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import { RENDERER_LANGUAGE_SERVERS } from '@/lib/language-server-languages'
import { translateSearchKeyword } from './settings-search-keywords'

export const getLanguageServersSearchEntries = createLocalizedCatalog(() => {
  const shared = [
    ...translateSearchKeyword('languageServers.search.languageServer', 'language server'),
    ...translateSearchKeyword('languageServers.search.goToDefinition', 'go to definition'),
    ...translateSearchKeyword('languageServers.search.hover', 'hover'),
    ...translateSearchKeyword('languageServers.search.references', 'references'),
    ...translateSearchKeyword('languageServers.search.lsp', 'lsp', { englishOnly: true })
  ]
  return LANGUAGE_SERVER_LANGUAGES.map((language) => ({
    title: RENDERER_LANGUAGE_SERVERS[language].label(),
    description: RENDERER_LANGUAGE_SERVERS[language].description(),
    keywords: [
      ...shared,
      language,
      ...Object.values(languageServerOptions(language)).flatMap((server) => [
        server.name,
        server.command
      ])
    ]
  }))
})
