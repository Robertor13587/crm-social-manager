<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl">Template</h1>
      <button class="btn-primary" @click="openCreate">
        <Plus class="w-4 h-4" />
        Nuovo template
      </button>
    </div>

    <!-- Filtri -->
    <div class="flex flex-wrap gap-3">
      <input
        v-model="search"
        type="text"
        placeholder="Cerca template…"
        class="input-field max-w-xs"
      />
      <select v-model="filterCategory" class="input-field max-w-xs">
        <option value="">Tutte le categorie</option>
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
    </div>

    <!-- Stato caricamento -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <span class="w-3 h-3 rounded-full bg-primary-600 animate-ping mr-3"></span>
      <span class="text-slate-500">Caricamento template…</span>
    </div>

    <div v-else-if="error" class="card border-red-200 bg-red-50 text-red-700 text-sm">
      {{ error }}
    </div>

    <!-- Lista template vuota -->
    <div v-else-if="filtered.length === 0" class="card flex flex-col items-center justify-center py-16 text-center">
      <FileText class="w-12 h-12 text-slate-300 mb-3" />
      <p class="text-slate-500 font-medium">Nessun template trovato</p>
      <p class="text-slate-400 text-sm mt-1">Crea il primo template per iniziare</p>
    </div>

    <!-- Griglia template -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="tpl in filtered"
        :key="tpl.id"
        class="card group cursor-pointer hover:border-primary-300 hover:shadow-md transition-all"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="min-w-0">
            <p class="font-semibold text-slate-800 truncate">{{ tpl.name }}</p>
            <span class="inline-block mt-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {{ tpl.category }}
            </span>
          </div>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
            <button class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="Modifica" @click.stop="openEdit(tpl)">
              <Pencil class="w-4 h-4" />
            </button>
            <button class="p-1.5 rounded-lg hover:bg-red-50 text-red-400" title="Elimina" @click.stop="confirmDelete(tpl)">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
        <p class="text-sm text-slate-600 line-clamp-3 whitespace-pre-wrap">{{ tpl.content }}</p>
        <div class="mt-3 flex items-center gap-2">
          <span
            :class="[
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              tpl.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
            ]"
          >
            <span :class="['w-1.5 h-1.5 rounded-full', tpl.is_active ? 'bg-emerald-500' : 'bg-slate-400']"></span>
            {{ tpl.is_active ? 'Attivo' : 'Inattivo' }}
          </span>
          <span v-if="tpl.language" class="text-xs text-slate-400 uppercase">{{ tpl.language }}</span>
        </div>
      </div>
    </div>

    <!-- Modal crea/modifica -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div class="w-full max-w-lg bg-white rounded-2xl shadow-xl" @click.stop>
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <h2 class="text-lg font-semibold text-slate-800">{{ editing ? 'Modifica template' : 'Nuovo template' }}</h2>
          <button class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" @click="closeModal">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="px-6 py-4 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input v-model="form.name" type="text" class="input-field" placeholder="es. benvenuto_cliente" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
            <input v-model="form.category" type="text" class="input-field" placeholder="es. Marketing, Supporto…" list="categories-list" />
            <datalist id="categories-list">
              <option v-for="cat in categories" :key="cat" :value="cat" />
            </datalist>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Lingua</label>
            <select v-model="form.language" class="input-field">
              <option value="it">Italiano (it)</option>
              <option value="en">English (en)</option>
              <option value="es">Español (es)</option>
              <option value="fr">Français (fr)</option>
              <option value="de">Deutsch (de)</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Contenuto *</label>
            <textarea
              v-model="form.content"
              rows="5"
              class="input-field resize-none"
              placeholder="Testo del template. Usa {{1}}, {{2}}… per i parametri."
            ></textarea>
          </div>
          <label class="flex items-center gap-2 cursor-pointer">
            <input v-model="form.is_active" type="checkbox" class="w-4 h-4 rounded accent-primary-600" />
            <span class="text-sm text-slate-700">Template attivo</span>
          </label>
          <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
        </div>
        <div class="flex items-center justify-end gap-3 px-6 pb-5 pt-2 border-t border-slate-100">
          <button class="btn-secondary" @click="closeModal">Annulla</button>
          <button class="btn-primary disabled:opacity-60" :disabled="saving" @click="save">
            {{ saving ? 'Salvataggio…' : 'Salva' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal conferma eliminazione -->
    <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div class="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
        <h2 class="text-lg font-semibold text-slate-800 mb-2">Elimina template</h2>
        <p class="text-slate-500 text-sm mb-6">
          Vuoi eliminare il template <strong>{{ deleteTarget.name }}</strong>? L'operazione non è reversibile.
        </p>
        <div class="flex items-center justify-end gap-3">
          <button class="btn-secondary" @click="deleteTarget = null">Annulla</button>
          <button class="btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500 disabled:opacity-60" :disabled="deleting" @click="deleteTemplate">
            {{ deleting ? 'Eliminazione…' : 'Elimina' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Pencil, Trash2, X, FileText } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/composables/useToast'

const { showToast } = useToast()

interface Template {
  id: string
  name: string
  category: string
  content: string
  language: string
  is_active: boolean
  meta_id?: string
  status?: string
}

const templates = ref<Template[]>([])
const loading = ref(false)
const error = ref('')
const search = ref('')
const filterCategory = ref('')
const showModal = ref(false)
const editing = ref<Template | null>(null)
const saving = ref(false)
const formError = ref('')
const deleteTarget = ref<Template | null>(null)
const deleting = ref(false)

const defaultForm = (): Omit<Template, 'id'> => ({
  name: '',
  category: '',
  content: '',
  language: 'it',
  is_active: true,
})
const form = ref(defaultForm())

const categories = computed(() => {
  const cats = new Set(templates.value.map((t) => t.category).filter(Boolean))
  return Array.from(cats).sort()
})

const filtered = computed(() => {
  let list = templates.value
  if (filterCategory.value) list = list.filter((t) => t.category === filterCategory.value)
  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase()
    list = list.filter((t) => t.name.toLowerCase().includes(q) || t.content.toLowerCase().includes(q))
  }
  return list
})

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const { data, error: err } = await supabase
      .from('templates')
      .select('id, name, category, content, language, is_active, meta_id, status')
      .order('name')
    if (err) throw err
    templates.value = data || []
  } catch {
    error.value = 'Impossibile caricare i template'
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editing.value = null
  form.value = defaultForm()
  formError.value = ''
  showModal.value = true
}

const openEdit = (tpl: Template) => {
  editing.value = tpl
  form.value = { name: tpl.name, category: tpl.category, content: tpl.content, language: tpl.language || 'it', is_active: tpl.is_active }
  formError.value = ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editing.value = null
}

const save = async () => {
  formError.value = ''
  if (!form.value.name.trim()) { formError.value = 'Il nome è obbligatorio'; return }
  if (!form.value.category.trim()) { formError.value = 'La categoria è obbligatoria'; return }
  if (!form.value.content.trim()) { formError.value = 'Il contenuto è obbligatorio'; return }

  saving.value = true
  try {
    let err: any = null
    if (editing.value) {
      const { error: e } = await supabase
        .from('templates')
        .update({ ...form.value, updated_at: new Date().toISOString() })
        .eq('id', editing.value.id)
      err = e
    } else {
      const { error: e } = await supabase
        .from('templates')
        .insert({ ...form.value })
      err = e
    }
    if (err) {
      formError.value = err.message || 'Errore salvataggio'
      return
    }
    showToast(editing.value ? 'Template aggiornato' : 'Template creato', 'success')
    closeModal()
    await load()
  } catch {
    formError.value = 'Errore di connessione'
  } finally {
    saving.value = false
  }
}

const confirmDelete = (tpl: Template) => {
  deleteTarget.value = tpl
}

const deleteTemplate = async () => {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    const { error: err } = await supabase
      .from('templates')
      .delete()
      .eq('id', deleteTarget.value.id)
    if (err) {
      showToast(err.message || 'Errore eliminazione', 'error')
      return
    }
    showToast('Template eliminato', 'success')
    templates.value = templates.value.filter((t) => t.id !== deleteTarget.value!.id)
    deleteTarget.value = null
  } catch {
    showToast('Errore di connessione', 'error')
  } finally {
    deleting.value = false
  }
}

onMounted(load)
</script>
