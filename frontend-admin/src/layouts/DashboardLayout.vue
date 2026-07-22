<script setup lang="ts">
import { ref, provide } from 'vue'
import Sidebar from './Sidebar.vue'
import TopBar from './TopBar.vue'
import LowBalanceAlert from '@/components/ui/LowBalanceAlert.vue'

const sidebarOpen = ref(false)
const sidebarExpanded = ref(true) // desktop expanded state

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function toggleSidebarExpanded() {
  sidebarExpanded.value = !sidebarExpanded.value
}

function closeSidebar() {
  sidebarOpen.value = false
}

provide('toggleSidebar', toggleSidebar)
provide('toggleSidebarExpanded', toggleSidebarExpanded)
provide('closeSidebar', closeSidebar)
provide('sidebarExpanded', sidebarExpanded)
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
    <!-- Mobile overlay -->
    <Transition name="fade">
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
        @click="closeSidebar"
      />
    </Transition>

    <!-- Sidebar -->
    <Sidebar
      :open="sidebarOpen"
      :expanded="sidebarExpanded"
      @close="closeSidebar"
    />

    <!-- Main content area -->
    <div class="flex flex-1 flex-col min-w-0">
      <TopBar
        @menu-click="toggleSidebar"
        @toggle-expand="toggleSidebarExpanded"
      />

      <LowBalanceAlert />

      <!-- Scrollable page content -->
      <main
        class="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8"
        :style="{ paddingBottom: '2rem' }"
      >
        <slot />
      </main>
    </div>
  </div>
</template>
