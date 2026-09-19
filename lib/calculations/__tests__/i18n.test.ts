import { describe, it, expect } from 'vitest'
import en from '../../i18n/locales/en.json'
import hi from '../../i18n/locales/hi.json'

describe('Bilingual Localization (i18n) Parity & Dictionary Integrity', () => {
  it('ensures every key in English dictionary exists in Hindi dictionary', () => {
    const enKeys = Object.keys(en)
    const hiKeys = Object.keys(hi)

    enKeys.forEach(key => {
      expect(hiKeys).toContain(key)
      expect((hi as Record<string, string>)[key]).toBeTruthy()
    })
  })

  it('ensures essential civil contracting terminology is accurately translated in Hindi', () => {
    expect(hi['contractor.muster']).toContain('हाजिरी')
    expect(hi['contractor.mason']).toBe('मिस्त्री')
    expect(hi['contractor.labour']).toContain('मजदूर')
    expect(hi['contractor.khata']).toContain('खाता')
    expect(hi['contractor.diesel_log']).toContain('डीजल')
    expect(hi['contractor.store']).toContain('स्टोर')
  })
})

