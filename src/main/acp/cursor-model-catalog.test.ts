import { describe, expect, it } from 'vitest'
import { parseCursorAcpModelListing } from './cursor-model-catalog'

const LISTING = [
  '\u001b[2mAvailable models\u001b[0m',
  '',
  '\u001b[32mauto\u001b[0m \u001b[2m- Auto\u001b[0m \u001b[2m(current, default)\u001b[0m',
  '\u001b[36mcomposer-2.5\u001b[0m \u001b[2m- Composer 2.5\u001b[0m',
  '',
  '\u001b[2mTip: use --model <id> to switch.\u001b[0m'
].join('\n')

describe('parseCursorAcpModelListing', () => {
  it('reads ids, labels and the configured default from the models command', () => {
    expect(parseCursorAcpModelListing(LISTING)).toEqual([
      { id: 'auto', label: 'Auto', isDefault: true, efforts: [] },
      { id: 'composer-2.5', label: 'Composer 2.5', isDefault: false, efforts: [] }
    ])
  })

  it('returns nothing for an empty or signed-out listing', () => {
    expect(parseCursorAcpModelListing('')).toEqual([])
    expect(parseCursorAcpModelListing('No models available for this account.')).toEqual([])
  })
})
