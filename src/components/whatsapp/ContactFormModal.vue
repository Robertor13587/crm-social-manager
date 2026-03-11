<template>
  <div v-if="visible" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
    <div class="card w-full max-w-3xl mx-4">
      <h3 class="text-lg font-semibold text-slate-900 mb-4">
        {{ mode === 'create' ? 'Nuovo Contatto WhatsApp' : 'Modifica Contatto' }}
      </h3>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <input type="text" class="input-field w-full" v-model="localData.name" placeholder="Mario Rossi" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Telefono (E.164)</label>
          <input
            type="text"
            class="input-field w-full"
            v-model="localData.phone"
            placeholder="+39..."
            :disabled="mode === 'edit'"
          />
          <p v-if="mode === 'edit'" class="text-xs text-gray-500 mt-1">Il numero di telefono non può essere modificato.</p>
        </div>
        <div class="md:col-span-3">
          <label class="block text-sm font-medium text-gray-700 mb-1">Tag</label>
          <input type="text" class="input-field w-full" v-model="localData.tag" placeholder="Es. Cliente, Lead..." />
        </div>

        <!-- Excel fields (edit mode only) -->
        <div v-if="mode === 'edit' && localData.excelData" class="pt-2 md:col-span-3">
          <h4 class="text-sm font-semibold text-gray-900 mb-2">Campi Excel</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label class="block text-xs font-medium text-gray-700 mb-1">COGNOME</label><input type="text" class="input-field w-full" v-model="localData.excelData.cognome" /></div>
            <div><label class="block text-xs font-medium text-gray-700 mb-1">NOME</label><input type="text" class="input-field w-full" v-model="localData.excelData.nome" /></div>
            <div><label class="block text-xs font-medium text-gray-700 mb-1">ATTIVITA'</label><input type="text" class="input-field w-full" v-model="localData.excelData.attivita" /></div>
            <div><label class="block text-xs font-medium text-gray-700 mb-1">ANNO</label><input type="text" class="input-field w-full" v-model="localData.excelData.anno" /></div>
            <div><label class="block text-xs font-medium text-gray-700 mb-1">PROVENIENZA</label><input type="text" class="input-field w-full" v-model="localData.excelData.provenienza" /></div>
            <div><label class="block text-xs font-medium text-gray-700 mb-1">NUMERO TELEFONO</label><input type="text" class="input-field w-full" v-model="localData.excelData.numero_telefono" /></div>
            <div><label class="block text-xs font-medium text-gray-700 mb-1">EMAIL</label><input type="text" class="input-field w-full" v-model="localData.excelData.email" /></div>
            <div><label class="block text-xs font-medium text-gray-700 mb-1">MESSAGGIO</label><input type="text" class="input-field w-full" v-model="localData.excelData.messaggio" /></div>
            <div><label class="block text-xs font-medium text-gray-700 mb-1">RISPOSTA</label><input type="text" class="input-field w-full" v-model="localData.excelData.risposta" /></div>
            <div class="md:col-span-3"><label class="block text-xs font-medium text-gray-700 mb-1">NOTA DI CAMPIONATO</label><input type="text" class="input-field w-full" v-model="localData.excelData.nota_di_campionato" /></div>
            <div><label class="block text-xs font-medium text-gray-700 mb-1">CONTATTO</label><input type="text" class="input-field w-full" v-model="localData.excelData.contatto" /></div>
            <div><label class="block text-xs font-medium text-gray-700 mb-1">NOTE</label><input type="text" class="input-field w-full" v-model="localData.excelData.note" /></div>
          </div>
        </div>
      </div>

      <div class="mt-6 flex justify-end space-x-3">
        <button class="btn-secondary" @click="emit('close')">Annulla</button>
        <button class="btn-primary" @click="emit('save', localData)">
          {{ mode === 'create' ? 'Crea' : 'Salva Modifiche' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  mode: 'create' | 'edit'
  contactData: { id?: string; name: string; phone: string; tag: string; excelData?: any | null }
}>()

const emit = defineEmits<{
  'save': [data: typeof props.contactData]
  'close': []
}>()

// Local copy so edits don't mutate parent state until save
const localData = reactive({ ...props.contactData, excelData: props.contactData.excelData ? { ...props.contactData.excelData } : null })

watch(() => props.contactData, (val) => {
  Object.assign(localData, val)
  localData.excelData = val.excelData ? { ...val.excelData } : null
}, { deep: true })
</script>
