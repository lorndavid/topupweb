<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'
import { initAdminAnalytics } from '@/composables/useAdminAnalytics'

const route = useRoute()
const theme = useThemeStore()

onMounted(() => {
  theme.init()
  initAdminAnalytics()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
    <!-- Blank layout (login page) -->
    <router-view v-if="route.meta.layout === 'blank'" />

    <!-- Dashboard layout (all other pages) -->
    <DashboardLayout v-else>
      <router-view />
    </DashboardLayout>

    <!-- Global toast notifications -->
    <ToastContainer />
  </div>
</template>
