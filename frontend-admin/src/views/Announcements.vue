<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToastStore } from '@/stores/toast'
import adminApi from '@/services/api'
import AppIcon from '@/components/ui/AppIcon.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { trackAnnouncementEvent } from '@/composables/useAdminAnalytics'

const toast = useToastStore()

interface Announcement {
  _id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'promo'
  is_active: boolean
  link_url?: string
  link_label?: string
  dismissible: boolean
  starts_at?: string
  expires_at?: string
  created_at: string
}

const loading = ref(true)
const announcements = ref<Announcement[]>([])
const showForm = ref(false)
const editing = ref<Announcement | null>(null)
const saving = ref(false)
const deleting = ref<string | null>(null)
const confirmDelete = ref<string | null>(null)

// Form state
const form = ref({
  title: '',
  message: '',
  type: 'info' as Announcement['type'],
  is_active: true,
  link_url: '',
  link_label: '',
  dismissible: true,
  starts_at: '',
  expires_at: '',
})

const typeOptions = [
  { value: 'info', label: 'Info', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
  { value: 'warning', label: 'Warning', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  { value: 'success', label: 'Success', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  { value: 'promo', label: 'Promo', color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400' },
]

async function fetchAnnouncements() {
  loading.value = true
  try {
    const { data } = await adminApi.getAnnouncements()
    announcements.value = data?.announcements || []
  } catch (err) {
    toast.error('Failed to load announcements', err instanceof Error ? err.message : '')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = {
    title: '',
    message: '',
    type: 'info',
    is_active: true,
    link_url: '',
    link_label: '',
    dismissible: true,
    starts_at: '',
    expires_at: '',
  }
  showForm.value = true
}

function openEdit(ann: Announcement) {
  editing.value = ann
  form.value = {
    title: ann.title,
    message: ann.message,
    type: ann.type,
    is_active: ann.is_active,
    link_url: ann.link_url || '',
    link_label: ann.link_label || '',
    dismissible: ann.dismissible,
    starts_at: ann.starts_at ? ann.starts_at.slice(0, 16) : '',
    expires_at: ann.expires_at ? ann.expires_at.slice(0, 16) : '',
  }
  showForm.value = true
}

async function handleSave() {
  if (!form.value.title.trim() || !form.value.message.trim()) {
    toast.warning('Title and message are required')
    return
  }

  saving.value = true
  try {
    const payload = {
      title: form.value.title.trim(),
      message: form.value.message.trim(),
      type: form.value.type,
      is_active: form.value.is_active,
      link_url: form.value.link_url.trim() || undefined,
      link_label: form.value.link_label.trim() || undefined,
      dismissible: form.value.dismissible,
      starts_at: form.value.starts_at ? new Date(form.value.starts_at).toISOString() : undefined,
      expires_at: form.value.expires_at ? new Date(form.value.expires_at).toISOString() : undefined,
    }

    if (editing.value) {
      await adminApi.updateAnnouncement(editing.value._id, payload)
      toast.success('Announcement updated')
      trackAnnouncementEvent('update', {
        announcementId: editing.value._id,
        title: payload.title,
        type: payload.type,
      })
    } else {
      await adminApi.createAnnouncement(payload)
      toast.success('Announcement created')
      trackAnnouncementEvent('create', {
        title: payload.title,
        type: payload.type,
      })
    }

    showForm.value = false
    editing.value = null
    await fetchAnnouncements()
  } catch (err) {
    toast.error('Failed to save announcement', err instanceof Error ? err.message : '')
  } finally {
    saving.value = false
  }
}

async function handleToggle(id: string) {
  const ann = announcements.value.find((a) => a._id === id)
  const wasActive = ann?.is_active
  try {
    await adminApi.toggleAnnouncement(id)
    await fetchAnnouncements()
    toast.success('Announcement toggled')
    trackAnnouncementEvent('toggle', {
      announcementId: id,
      title: ann?.title,
      type: ann?.type,
      wasActive,
      newActive: !wasActive,
    })
  } catch (err) {
    toast.error('Failed to toggle announcement', err instanceof Error ? err.message : '')
  }
}

async function handleDelete(id: string) {
  const ann = announcements.value.find((a) => a._id === id)
  deleting.value = id
  try {
    await adminApi.deleteAnnouncement(id)
    announcements.value = announcements.value.filter((a) => a._id !== id)
    toast.success('Announcement deleted')
    trackAnnouncementEvent('delete', {
      announcementId: id,
      title: ann?.title,
      type: ann?.type,
    })
  } catch (err) {
    toast.error('Failed to delete announcement', err instanceof Error ? err.message : '')
  } finally {
    deleting.value = null
    confirmDelete.value = null
  }
}

function getTypeStyle(type: string) {
  return typeOptions.find((t) => t.value === type)?.color || typeOptions[0].color
}

onMounted(fetchAnnouncements)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold font-heading text-slate-900 dark:text-white">Announcements</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage site-wide announcement banners displayed to all customers</p>
      </div>
      <button class="btn btn-primary flex items-center gap-2" @click="openCreate">
        <AppIcon name="plus" :size="16" />
        Create
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <LoadingSkeleton v-for="i in 3" :key="i" type="card" />
    </div>

    <!-- Empty state -->
    <div v-else-if="announcements.length === 0" class="card p-12 text-center">
      <AppIcon name="inbox" :size="48" class="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
      <h3 class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">No announcements yet</h3>
      <p class="text-xs text-slate-400 dark:text-slate-500 mb-4">Create your first announcement banner to display on the main site</p>
      <button class="btn btn-primary" @click="openCreate">Create Announcement</button>
    </div>

    <!-- Announcement cards -->
    <div v-else class="space-y-3">
      <div
        v-for="ann in announcements"
        :key="ann._id"
        class="card p-5 flex items-start gap-4 transition-all duration-150 hover:shadow-md group"
        :class="{ 'opacity-50': !ann.is_active }"
      >
        <!-- Status indicator -->
        <div
          class="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
          :class="ann.is_active ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30' : 'bg-slate-300 dark:bg-slate-600'"
        />

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full" :class="getTypeStyle(ann.type)">
              {{ ann.type }}
            </span>
            <h3 class="text-sm font-semibold text-slate-900 dark:text-white truncate">{{ ann.title }}</h3>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{{ ann.message }}</p>
          <div class="flex items-center gap-3 mt-2 text-[10px] text-slate-400 dark:text-slate-500">
            <span v-if="ann.starts_at">Starts: {{ new Date(ann.starts_at).toLocaleDateString() }}</span>
            <span v-if="ann.expires_at">Expires: {{ new Date(ann.expires_at).toLocaleDateString() }}</span>
            <span v-if="ann.link_url">Has link</span>
            <span :class="ann.dismissible ? '' : 'font-semibold'">{{ ann.dismissible ? 'Dismissible' : 'Persistent' }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            :title="ann.is_active ? 'Deactivate' : 'Activate'"
            @click="handleToggle(ann._id)"
          >
            <AppIcon :name="ann.is_active ? 'eye-off' : 'eye'" :size="16" />
          </button>
          <button
            class="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Edit"
            @click="openEdit(ann)"
          >
            <AppIcon name="edit" :size="16" />
          </button>
          <button
            class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Delete"
            :disabled="deleting === ann._id"
            @click="confirmDelete = ann._id"
          >
            <AppIcon v-if="deleting !== ann._id" name="trash" :size="16" />
            <span v-else class="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin block" />
          </button>
        </div>
      </div>
    </div>

    <!-- Form slide-over panel -->
    <Teleport to="body">
      <Transition name="panel-slide">
        <div v-if="showForm" class="fixed inset-0 z-50 flex justify-end">
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" @click="showForm = false" />

          <!-- Panel -->
          <div class="relative w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto">
            <div class="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700/50 px-6 py-4 flex items-center justify-between">
              <h2 class="text-base font-semibold text-slate-900 dark:text-white">
                {{ editing ? 'Edit Announcement' : 'Create Announcement' }}
              </h2>
              <button class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" @click="showForm = false">
                <AppIcon name="x" :size="18" />
              </button>
            </div>

            <div class="p-6 space-y-5">
              <!-- Title -->
              <div>
                <label class="form-label">Title <span class="text-red-400">*</span></label>
                <input v-model="form.title" type="text" class="form-input" placeholder="e.g. Site Maintenance Tonight" maxlength="120" />
              </div>

              <!-- Message -->
              <div>
                <label class="form-label">Message <span class="text-red-400">*</span></label>
                <textarea v-model="form.message" class="form-input min-h-[80px]" placeholder="Brief announcement message…" maxlength="500" />
                <p class="form-help">{{ form.message.length }} / 500</p>
              </div>

              <!-- Type + Active row -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Type</label>
                  <select v-model="form.type" class="form-input">
                    <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
                <div class="flex items-end pb-2">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input v-model="form.is_active" type="checkbox" class="rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500" />
                    <span class="text-sm text-slate-700 dark:text-slate-300">Active immediately</span>
                  </label>
                </div>
              </div>

              <!-- Link -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Link URL (optional)</label>
                  <input v-model="form.link_url" type="url" class="form-input" placeholder="https://…" />
                </div>
                <div>
                  <label class="form-label">Link Label</label>
                  <input v-model="form.link_label" type="text" class="form-input" placeholder="Learn More" maxlength="60" />
                </div>
              </div>

              <!-- Dismissible toggle -->
              <div class="flex items-center gap-2">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="form.dismissible" type="checkbox" class="rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500" />
                  <span class="text-sm text-slate-700 dark:text-slate-300">Dismissible (user can close)</span>
                </label>
              </div>

              <!-- Date range -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Start at (optional)</label>
                  <input v-model="form.starts_at" type="datetime-local" class="form-input" />
                </div>
                <div>
                  <label class="form-label">Expire at (optional)</label>
                  <input v-model="form.expires_at" type="datetime-local" class="form-input" />
                </div>
              </div>

              <!-- Preview -->
              <div class="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Preview</p>
                <div
                  class="px-4 py-3 rounded-lg text-sm flex items-center gap-3"
                  :class="{
                    'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300': form.type === 'info',
                    'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300': form.type === 'warning',
                    'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300': form.type === 'success',
                    'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300': form.type === 'promo',
                  }"
                >
                  <AppIcon
                    :name="form.type === 'warning' ? 'warning' : form.type === 'success' ? 'check' : form.type === 'promo' ? 'star' : 'info'"
                    :size="18"
                    class="flex-shrink-0"
                  />
                  <div class="flex-1 min-w-0">
                    <p class="font-medium truncate">{{ form.title || 'Title' }}</p>
                    <p class="text-xs opacity-80 truncate">{{ form.message || 'Message' }}</p>
                  </div>
                  <button v-if="form.dismissible" class="flex-shrink-0 opacity-60 hover:opacity-100">
                    <AppIcon name="x" :size="14" />
                  </button>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-3 pt-2">
                <button class="btn btn-primary flex-1 flex items-center justify-center gap-2" :disabled="saving" @click="handleSave">
                  <span v-if="saving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {{ saving ? 'Saving…' : editing ? 'Update' : 'Create' }}
                </button>
                <button class="btn btn-ghost" @click="showForm = false">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete confirmation -->
    <ConfirmDialog
      :open="!!confirmDelete"
      title="Delete Announcement"
      message="Are you sure? This cannot be undone."
      variant="danger"
      confirm-label="Delete"
      @confirm="confirmDelete ? handleDelete(confirmDelete) : null"
      @cancel="confirmDelete = null"
    />
  </div>
</template>

<style scoped>
.panel-slide-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-slide-leave-active {
  transition: all 0.2s ease-in;
}
.panel-slide-enter-from > div:last-child,
.panel-slide-leave-to > div:last-child {
  transform: translateX(100%);
}
.panel-slide-enter-from > div:first-child,
.panel-slide-leave-to > div:first-child {
  opacity: 0;
}
</style>
