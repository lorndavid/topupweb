<script setup lang="ts">
import { useI18nStore } from '@/stores/i18n'
const i18n = useI18nStore()
</script>

<template>
  <footer class="border-t border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Brand -->
        <div class="space-y-3">
          <router-link to="/" class="flex items-center gap-2 group">
            <div class="w-8 h-8 rounded-lg overflow-hidden shadow-md group-hover:shadow-primary-500/20 transition-all duration-300 group-hover:scale-105">
              <img
                src="/logo.png"
                alt="VidTopUp"
                class="w-full h-full object-contain bg-white dark:bg-surface-900"
              />
            </div>
            <span class="font-semibold text-surface-900 dark:text-surface-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">VidTopUp</span>
          </router-link>
          <p class="text-sm text-surface-500 dark:text-surface-400">
            {{ i18n.t('footer.tagline') }}
          </p>
        </div>

        <!-- Quick Links -->
        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-surface-900 dark:text-surface-100 uppercase tracking-wider">Quick Links</h3>
          <ul class="space-y-2">
            <li>
              <router-link to="/" class="text-sm text-surface-500 dark:text-surface-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors">
                {{ i18n.t('footer.home') }}
              </router-link>
            </li>
            <li>
              <a href="#" class="text-sm text-surface-500 dark:text-surface-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors">
                {{ i18n.t('footer.support') }}
              </a>
            </li>
            <li>
              <a href="#" class="text-sm text-surface-500 dark:text-surface-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors">
                {{ i18n.t('footer.faq') }}
              </a>
            </li>
          </ul>
        </div>

        <!-- Payment Methods -->
        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-surface-900 dark:text-surface-100 uppercase tracking-wider">Payment Methods</h3>
          <div class="flex items-center gap-3">
            <div class="px-3 py-1.5 bg-surface-100 dark:bg-surface-800 rounded-lg text-xs font-medium text-surface-600 dark:text-surface-400">
              Bakong KHQR
            </div>
            <div class="px-3 py-1.5 bg-surface-100 dark:bg-surface-800 rounded-lg text-xs font-medium text-surface-600 dark:text-surface-400">
              ABA Pay
            </div>
          </div>
        </div>
      </div>

      <div class="mt-8 pt-6 border-t border-surface-200 dark:border-surface-700">
        <p class="text-center text-xs text-surface-400 dark:text-surface-500">
          &copy; {{ new Date().getFullYear() }} VidTopUp. {{ i18n.t('footer.copyright') }}
        </p>
      </div>
    </div>
  </footer>
</template>
