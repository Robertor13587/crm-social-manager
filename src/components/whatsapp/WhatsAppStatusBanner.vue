<template>
  <div class="card">
    <div class="flex items-start gap-3">
      <div class="mt-0.5 h-9 w-9 rounded-2xl bg-yellow-100 text-yellow-700 flex items-center justify-center">
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l6.518 11.59c.75 1.334-.213 2.99-1.742 2.99H3.48c-1.53 0-2.492-1.656-1.743-2.99l6.52-11.59zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-8a1 1 0 00-.993.883L9 6v4a1 1 0 00.883.993L10 11a1 1 0 00.993-.883L11 10V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
      </div>
      <div class="min-w-0">
        <h3 class="text-sm font-semibold text-slate-900">Comunicazione Meta — Revisione WhatsApp in corso</h3>
        <div class="mt-2 text-sm text-slate-700 space-y-2">
          <p>Numero WhatsApp {{ displayNumber || 'non disponibile' }} ({{ verifiedName || 'senza nome verificato' }}) in stato {{ status || 'PENDING' }}. Alcune funzionalità sono temporaneamente limitate finché l'approvazione non è completata.</p>
          <ul class="list-disc list-inside">
            <li>Messaggi testuali consentiti solo nella finestra di 24h; usa template se fuori finestra.</li>
            <li>Template (HSM) disponibili dopo approvazione; la consegna può essere differita durante la revisione.</li>
            <li>Dati e conversazioni sono mostrati dal database locale e verranno sincronizzati dopo l'approvazione.</li>
          </ul>
          <p class="font-semibold text-slate-900">Prossimi passi</p>
          <ul class="list-disc list-inside">
            <li>Completa la Business Verification e la configurazione del numero nel pannello Meta.</li>
            <li>Invia template per approvazione e verifica il Display Name del numero.</li>
            <li>Attiva i webhook e verifica la firma di sicurezza; assicurati di rispettare le policy.</li>
          </ul>
          <p>Tempi medi di approvazione: 1–3 giorni lavorativi. Riceverai una notifica via email.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  status: string
  displayNumber: string
  verifiedName: string
}>()
</script>
