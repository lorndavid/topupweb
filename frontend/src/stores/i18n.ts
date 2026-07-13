import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Locale, TranslationKey } from '@/i18n/translations'
import { en, km } from '@/i18n/translations'

export const useI18nStore = defineStore('i18n', () => {
  const locale = ref<Locale>(
    (localStorage.getItem('locale') as Locale) || 'en'
  )

  const translations = computed(() => (locale.value === 'en' ? en : km))

  function t(key: TranslationKey): string {
    return translations.value[key] || key
  }

  function setLocale(l: Locale) {
    locale.value = l
    localStorage.setItem('locale', l)
  }

  function toggleLocale() {
    setLocale(locale.value === 'en' ? 'km' : 'en')
  }

  return { locale, translations, t, setLocale, toggleLocale }
})
