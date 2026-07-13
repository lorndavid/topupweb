<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import { useI18nStore } from '@/stores/i18n'

const i18n = useI18nStore()
const isDark = ref(false)

function toggleDark() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

function applyLocaleClasses(locale: string) {
  // Update html lang attribute for :lang() CSS selectors
  document.documentElement.lang = locale
  // Toggle body class for explicit font overrides
  document.body.classList.toggle('locale-km', locale === 'km')
}

// Watch locale changes to apply Khmer fonts
watch(() => i18n.locale, (newLocale) => {
  applyLocaleClasses(newLocale)
}, { immediate: true })

onMounted(() => {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }

})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <Navbar :is-dark="isDark" @toggle-dark="toggleDark" />
    <main class="flex-1">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <Footer />
    <ToastContainer />
  </div>
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
