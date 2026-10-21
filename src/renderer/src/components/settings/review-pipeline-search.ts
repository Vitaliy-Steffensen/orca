import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from './settings-search-keywords'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'

export const getReviewPipelinePaneSearchEntries = createLocalizedCatalog(() => [
  {
    title: translate('auto.components.settings.reviewPipeline.search.title', 'Review pipeline'),
    description: translate(
      'auto.components.settings.reviewPipeline.search.description',
      'The skill and prompt behind an agent review: grouped files, screenshots, and findings staged on the diff.'
    ),
    keywords: [
      ...translateSearchKeyword('auto.components.settings.reviewPipeline.search.review', 'review'),
      ...translateSearchKeyword(
        'auto.components.settings.reviewPipeline.search.pipeline',
        'pipeline'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.reviewPipeline.search.codeReview',
        'code review'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.reviewPipeline.search.pullRequest',
        'pull request'
      ),
      ...translateSearchKeyword('auto.components.settings.reviewPipeline.search.diff', 'diff'),
      ...translateSearchKeyword(
        'auto.components.settings.reviewPipeline.search.findings',
        'findings'
      ),
      ...translateSearchKeyword('auto.components.settings.reviewPipeline.search.prompt', 'prompt'),
      ...translateSearchKeyword('auto.components.settings.reviewPipeline.search.skill', 'skill')
    ]
  }
])
