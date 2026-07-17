import { defineStore } from 'pinia'
import type { TranslationKey } from '@/i18n/translations'
import { en } from '@/i18n/translations'

export const useI18nStore = defineStore('i18n', () => {
  function t(key: TranslationKey): string {
    return en[key] || key
  }

  return { t }
})
