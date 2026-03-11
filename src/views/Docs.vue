<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl">Documentazione</h1>
        <p class="mt-1 text-sm text-gray-500">Guida rapida per utilizzare la piattaforma e capire i vincoli Meta.</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <div class="card space-y-3">
          <h2 class="text-xl font-semibold text-gray-900">1. Come iniziare</h2>
          <p class="text-sm text-gray-700">
            Accedi con le credenziali fornite e parti dalla Dashboard per avere una panoramica di messaggi e conversazioni attive.
          </p>
          <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li><span class="font-medium">Dashboard:</span> controlla volume messaggi e eventuali cali anomali.</li>
            <li><span class="font-medium">Sezioni canale:</span> usa Gestione WhatsApp / Instagram / Facebook per lavorare sui singoli canali.</li>
            <li><span class="font-medium">Collega Meta:</span> se Instagram/Facebook non mostrano dati, collega prima l’account Meta.</li>
          </ul>
        </div>

        <div class="card space-y-3">
          <h2 class="text-xl font-semibold text-gray-900">2. Prima di vedere i dati</h2>
          <p class="text-sm text-gray-700">
            WhatsApp, Instagram e Facebook dipendono da workflow esterni (n8n) e dalle autorizzazioni Meta. Se una sezione risulta vuota, di solito manca uno di questi passaggi.
          </p>
          <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li><span class="font-medium">n8n raggiungibile:</span> se n8n è offline, la piattaforma non può caricare conversazioni e profili.</li>
            <li><span class="font-medium">Autorizzazioni Meta:</span> concedi i permessi richiesti al primo collegamento.</li>
            <li><span class="font-medium">Pagina corretta:</span> usa una Pagina Facebook con Instagram Business collegato (per i DM IG).</li>
          </ul>

          <h3 class="mt-4 text-sm font-semibold text-gray-800">Login Meta (Instagram/Facebook)</h3>
          <ol class="list-decimal list-inside text-sm text-gray-700 space-y-1">
            <li>Apri la sidebar e clicca <span class="font-medium">Collega account Meta</span> in basso.</li>
            <li>Accedi a Facebook/Meta e seleziona la Pagina corretta (quella collegata all’IG Business).</li>
            <li>Conferma i permessi richiesti e completa il flusso fino al ritorno in piattaforma.</li>
            <li>Controlla che nella sidebar compaia il nome della Pagina con il pallino verde.</li>
            <li>Riapri <span class="font-medium">Gestione Instagram</span> e <span class="font-medium">Gestione Facebook</span> e aggiorna la pagina se necessario.</li>
          </ol>

          <h3 class="mt-4 text-sm font-semibold text-gray-800">Gestione WhatsApp</h3>
          <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li><span class="font-medium">Rubrica:</span> crea o modifica contatti, assegna tag e note.</li>
            <li><span class="font-medium">Chat:</span> rispondi ai messaggi, consulta lo storico, invia template.</li>
            <li><span class="font-medium">Invio massivo:</span> seleziona segmenti di contatti e invia un template personalizzato.</li>
          </ul>

          <h3 class="mt-4 text-sm font-semibold text-gray-800">Gestione Instagram e Facebook</h3>
          <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li>Consulta DM/conversazioni e rispondi direttamente dalla piattaforma.</li>
            <li>Se vedi errori di autorizzazione o dati vuoti, ripeti il collegamento Meta dalla sidebar.</li>
          </ul>
        </div>

        <div class="card space-y-3">
          <h2 class="text-xl font-semibold text-gray-900">3. Cosa dipende da Meta</h2>
          <p class="text-sm text-gray-700">
            Alcune funzioni non dipendono solo dalla piattaforma, ma dalle autorizzazioni e dallo stato di revisione dell’app su Meta.
          </p>
          <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li><span class="font-medium">Revisione app:</span> finché l’app è in revisione, invii e statistiche possono essere parziali.</li>
            <li><span class="font-medium">Permessi WhatsApp:</span> invio fuori finestra 24h è possibile solo tramite template approvati.</li>
            <li><span class="font-medium">Permessi Instagram/Facebook:</span> lettura DM, invio messaggi e metriche dipendono dai permessi concessi.</li>
            <li><span class="font-medium">Webhook:</span> se i webhook non sono attivi o approvati, gli aggiornamenti possono arrivare in ritardo o non arrivare.</li>
          </ul>
        </div>

        <div class="card space-y-3">
          <h2 class="text-xl font-semibold text-gray-900">4. Cosa fare in caso di problemi</h2>
          <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li>Verifica dalla Dashboard se i dati stanno arrivando (messaggi oggi, conversazioni attive).</li>
            <li>Controlla le sezioni WhatsApp/Instagram/Facebook per vedere eventuali banner di revisione Meta.</li>
            <li>Se messaggi o template non partono, prendi nota di data/ora e canale interessato.</li>
          </ul>
          <p class="text-sm text-gray-700">
            Quando contatti il supporto, indica sempre:
          </p>
          <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li>Data e ora del problema.</li>
            <li>Canale coinvolto (WhatsApp, Instagram, Facebook).</li>
            <li>Screenshot della schermata con eventuali messaggi di errore.</li>
          </ul>
        </div>
      </div>

      <div class="space-y-4">
        <div class="card space-y-2 border-primary-200 bg-primary-50/70 shadow-md">
          <div class="inline-flex items-center space-x-2 text-[11px] font-semibold uppercase tracking-wide text-primary-800 mb-1">
            <span class="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></span>
            <span>Attenzione Meta</span>
          </div>
          <h3 class="text-sm font-semibold text-gray-900">Riepilogo vincoli Meta</h3>
          <ul class="list-disc list-inside text-xs text-gray-700 space-y-1">
            <li>WhatsApp: finestra 24h per messaggi testuali, template fuori finestra.</li>
            <li>Instagram: DM solo verso utenti che hanno interagito di recente.</li>
            <li>Facebook: invio e lettura DM dipendono dai permessi pagina.</li>
            <li>Revisione app in corso può limitare temporaneamente alcune funzioni.</li>
          </ul>
        </div>

        <div class="card space-y-2 border-emerald-200 bg-emerald-50/80 shadow-md">
          <div class="inline-flex items-center space-x-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 mb-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Consigli operativi</span>
          </div>
          <h3 class="text-sm font-semibold text-gray-900">Buone pratiche</h3>
          <ul class="list-disc list-inside text-xs text-gray-700 space-y-1">
            <li>Controlla la Dashboard all’inizio e alla fine della giornata.</li>
            <li>Usa i template per campagne ripetitive e messaggi fuori finestra.</li>
            <li>Mantieni la rubrica contatti aggiornata con tag e note.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>
