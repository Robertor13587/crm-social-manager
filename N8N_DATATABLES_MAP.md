# n8n DataTables — Mappa campi e checklist (IG / FB / WA)

Generato: 2025-12-21

Fonti nel repository:
- `IG_WORKFLOWS_REPORT.txt`
- `FB_WORKFLOWS_REPORT.txt`
- `WA_WORKFLOWS_REPORT.txt`
- `n8n-update-wa-send-template.json`
- `n8n-update-wa-incoming.json`
- `scripts/push-meta-profile-workflow.mjs`
- `patch_send_media_token.cjs`
- `endpoint_tests_results.txt`
- `docs/api_v2_standard.md`
- `env.md`

## 1) Obiettivo

Ricostruire i **nomi delle colonne** che devono esistere nelle DataTable n8n per far funzionare:
- Instagram (profilo, media, commenti, DM inbox)
- Facebook (profilo/insights + Messenger inbox)
- WhatsApp (invio + inbound + DB log)

Nota: campi come `updated_time`, `username`, `name`, `followers_count`, ecc. sono **output** delle API Meta o del DB, non colonne di configurazione.

---

## 2) Schema consigliato DataTables (operativo)

### 2.0 Login Meta (OAuth) → cosa deve finire in DataTables

Fonte flusso OAuth (frontend):
- redirect: `.../webhook/crm/instagram/oauth/callback` in `src/components/layout/AppSidebar.vue:202-211` e `src/views/instagram/InstagramManager.vue:59-66`
- scope richiesti: `pages_show_list`, `pages_read_engagement`, `pages_messaging`, `instagram_basic`, `instagram_manage_messages`, `instagram_manage_comments` in `src/components/layout/AppSidebar.vue:202-211`

Il workflow n8n di callback OAuth deve:
- fare exchange del `code` → token (idealmente long-lived)
- recuperare la/le pagine disponibili e il relativo `PAGE_ACCESS_TOKEN`
- recuperare l’`IG_USER_ID` collegato alla pagina scelta
- salvare/aggiornare questi dati nelle DataTables IG/FB (una riga per account)

Campi DataTable necessari per considerare l’account “collegato”:
- Instagram: `PAGE_ID`, `PAGE_ACCESS_TOKEN`, `IG_USER_ID` (opzionale `IG_ACCESS_TOKEN` se mantieni workflow legacy)
- Facebook: `PAGE_ID`, `PAGE_ACCESS_TOKEN`

Campi consigliati (non obbligatori, ma utili per manutenzione e refresh token):
- `META_USER_ACCESS_TOKEN` (string) — user token long-lived con cui rigenerare page token
- `META_USER_ACCESS_TOKEN_EXPIRES_AT` (datetime/string ISO) — scadenza user token
- `TOKEN_UPDATED_AT` (datetime/string ISO) — ultima rotazione/refresh token
- `PAGE_NAME` (string) e/o `IG_USERNAME` (string) — label coerenti tra UI e DataTable

### 2.1 DataTable: Social CRM - Instagram

**Minimo richiesto (tutte le funzioni IG + DM):**
- `IG_USER_ID` (string) — Instagram Business Account ID
- `PAGE_ID` (string) — Page ID collegata a IG (necessaria per conversazioni/DM)
- `PAGE_ACCESS_TOKEN` (string) — Page access token (necessario per conversazioni/DM; usato anche come token “canonico” dove possibile)

**Compatibilità / fallback (workflow legacy):**
- `IG_ACCESS_TOKEN` (string) — usato dai workflow profilo/media/commenti; in alcuni punti è fallback di `PAGE_ACCESS_TOKEN`

**Consigliati per multi-account e robustezza:**
- `ACCOUNT_LABEL` (string) — nome leggibile (es. “Brand A”)
- `PAGE_NAME` (string) — nome pagina FB collegata (solo UX/debug)
- `IG_USERNAME` (string) — utile per evitare logica hard-coded nei participants (vedi nota su `cloud_creative_studio` in `IG_WORKFLOWS_REPORT.txt:133`)
- `TOKEN_UPDATED_AT` (datetime/string ISO) — ultima rotazione/refresh token

**Regola multi-account (come risulta dai workflow):**
- `account` in query (1-based) seleziona la riga DataTable per `conversations/messages/send` (`IG_WORKFLOWS_REPORT.txt:131-132`)
- gli altri endpoint sembrano usare sempre la “prima riga”

### 2.2 DataTable: Social CRM - Facebook

**Minimo richiesto (tutte le funzioni FB):**
- `PAGE_ID` (string)
- `PAGE_ACCESS_TOKEN` (string)

**Consigliati:**
- `ACCOUNT_LABEL` (string)

### 2.3 DataTable: Social CRM - WhatsApp

**Minimo richiesto (standard v2 + centralizzazione config):**
- `WA_PHONE_NUMBER_ID` (string) — usato per chiamare `/{WA_PHONE_NUMBER_ID}/messages`
- `WA_BUSINESS_ACCOUNT_ID` (string) — utile per endpoint “phone numbers” / gestione WABA (standardizzato in `docs/api_v2_standard.md:465-481`)
- `ACCESS_TOKEN` (string) — token Cloud API (Bearer)

**Evidenza DataTable ID (da export):**
- DataTable ID: `ZKTXLqvrcy80SQG0` (workflow template: `n8n-update-wa-send-template.json:7`)

**Nota multi-config:**
- se un “Get row(s)” restituisce più righe e poi fai merge by position, puoi inviare più volte o mescolare config (`WA_WORKFLOWS_REPORT.txt:107-108`)

---

## 3) Mappa endpoint → campi DataTable richiesti

### 3.1 Instagram (IG) — Webhook CRM + interni

Fonte: `IG_WORKFLOWS_REPORT.txt`

| Workflow | Metodo + Path | Cosa fa | Campi DataTable |
|---|---|---|---|
| IG - Account Info | GET `/webhook/crm/instagram/account` | Profilo + contatori | `IG_USER_ID`, `IG_ACCESS_TOKEN` |
| IG – Get Profile & Followers | GET `/webhook/crm/instagram/profile` | Profilo (include biography) | `IG_USER_ID`, `IG_ACCESS_TOKEN` |
| IG - Stats | GET `/webhook/crm/instagram/stats` | Contatori base | `IG_USER_ID`, `PAGE_ACCESS_TOKEN` (fallback `IG_ACCESS_TOKEN`) |
| IG - Media | GET `/webhook/crm/instagram/media` | Lista media (raw) | `IG_USER_ID`, `IG_ACCESS_TOKEN` |
| IG - Media List | GET `/webhook/crm/instagram/media/list` | Media con paging `after` + `next_cursor` | `IG_USER_ID`, `IG_ACCESS_TOKEN` |
| IG - Media Comments | GET `/webhook/crm/instagram/media/comments` | Commenti per media | `IG_ACCESS_TOKEN` |
| IG – Import Comments | POST `/webhook/internal/instagram/comments/import` | Import commenti → upsert contatti | `IG_ACCESS_TOKEN` |
| IG – Upsert Contact | POST `/webhook/internal/instagram/contact/upsert` | Upsert su MySQL `ig_contacts` | nessuno (usa body) |
| IG – List Contacts | GET `/webhook/crm/instagram/contacts` | Lista contatti da DB | nessuno |
| IG - Contact Enrich | POST `/webhook/internal/instagram/contact/enrich` | Dettaglio contatto da DB | nessuno |
| IG – List Conversation | GET `/webhook/crm/instagram/conversations` | Lista thread DM (via Page) | `PAGE_ID`, `PAGE_ACCESS_TOKEN` (multi-account `account`) |
| IG – Get Messages | GET `/webhook/crm/instagram/messages` | Messaggi DM + paging | `PAGE_ACCESS_TOKEN` (multi-account `account`) |
| IG – Send Message | POST `/webhook/crm/instagram/send` | Invia DM testo/media | `PAGE_ID`, `PAGE_ACCESS_TOKEN` (multi-account `account`) |
| IG - Insights | GET `/webhook/crm/instagram/insights` | Insights account | `IG_USER_ID`, `PAGE_ACCESS_TOKEN` (fallback `IG_ACCESS_TOKEN`) |
| IG Webhook – Events | GET `/webhook/crm/instagram/webhook` | Verify (hub.challenge) + eventi | n/a |

Parametri principali lato frontend:
- `conversations`: `account`, `limit`, `after`, `before` (`IG_WORKFLOWS_REPORT.txt:70-75`)
- `messages`: `thread_id`, `limit`, `after`, `before`, `account` (`IG_WORKFLOWS_REPORT.txt:78-81`)
- `send`: body `recipient_id`, `text?`, `attachment_url?`, e `account` (`IG_WORKFLOWS_REPORT.txt:83-87`)

### 3.2 Facebook (FB) — Webhook CRM

Fonte: `FB_WORKFLOWS_REPORT.txt`

| Workflow | Metodo + Path | Cosa fa | Campi DataTable |
|---|---|---|---|
| FB – Get Page Profile | GET `/webhook/crm/facebook/profile` | Profilo pagina (raw) | `PAGE_ID`, `PAGE_ACCESS_TOKEN` |
| FB - Stats | GET `/webhook/crm/facebook/stats` | Contatori base | `PAGE_ID`, `PAGE_ACCESS_TOKEN` |
| FB - Insights | GET `/webhook/crm/facebook/insights` | Insights pagina | `PAGE_ID`, `PAGE_ACCESS_TOKEN` |
| FB - List Conversations | GET `/webhook/crm/facebook/conversations` | Lista conversazioni | `PAGE_ID`, `PAGE_ACCESS_TOKEN` |
| FB - Get Messages | GET `/webhook//crm/facebook/messages` | Messaggi thread (nota doppio slash) | `PAGE_ACCESS_TOKEN` |
| FB - Send Message | POST `/webhook/crm/facebook/messages/send` | Invia Messenger | `PAGE_ACCESS_TOKEN` |

Nota pratica:
- alcuni workflow usano `Authorization: Bearer ...`, altri `access_token=...` in query (`FB_WORKFLOWS_REPORT.txt:58-60`)

### 3.3 WhatsApp (WA) — Webhook CRM + Meta + interni

Fonte: `WA_WORKFLOWS_REPORT.txt`, `n8n-update-wa-*.json`, `patch_send_media_token.cjs`

| Workflow | Metodo + Path | Cosa fa | Campi DataTable |
|---|---|---|---|
| WA - Verifica WebHook | GET `/webhook/meta/whatsapp/webhook` | Verify Meta (hub.challenge) | n/a (verify token è in workflow/Meta) |
| WA - Incoming (POST) | POST `/webhook/meta/whatsapp/webhook` | Ricezione eventi WA → DB + log | n/a |
| WA - Inbound | POST `/webhook/internal/whatsapp/inbound` | Normalizza inbound → log interno | n/a |
| WA - Message Log | POST `/webhook/internal/whatsapp/message/log` | Inserisce record in `wa_messages` | n/a |
| WA API - Send Message | POST `/webhook/crm/whatsapp/send` | Invio testo Cloud API | `WA_PHONE_NUMBER_ID` (+ `ACCESS_TOKEN` se non usi credenziali n8n) |
| WA API - Send Media | POST `/webhook/crm/whatsapp/send-media` | Invio media Cloud API | `WA_PHONE_NUMBER_ID`, `ACCESS_TOKEN` (Bearer da DataTable in `patch_send_media_token.cjs:41`) |
| WA - Send Template | POST `/webhook/crm/whatsapp/send-template` | Invio template Cloud API | `WA_PHONE_NUMBER_ID` (config letta da DataTable in `n8n-update-wa-send-template.json:7-9`) |
| WA API - List Messages | GET `/webhook/crm/whatsapp/messages` | Legge da `wa_messages` | n/a |
| WA - List Conversations | GET `/webhook/crm/whatsapp/conversations` | Aggrega conversazioni da `wa_messages` | n/a |
| WA API - Create Contact | POST `/webhook/crm/whatsapp/contact/create` | Upsert in `wa_contacts` | n/a |
| WA API - List Contacts | GET `/webhook/crm/whatsapp/contacts` | Legge `wa_contacts` | n/a |

Evidenza inbound template workflow:
- Lettura config: nodo DataTable `Get WA Config` con ID `ZKTXLqvrcy80SQG0` (`n8n-update-wa-send-template.json:7`)
- Validazione campi: fallisce se manca `WA_PHONE_NUMBER_ID` (`n8n-update-wa-send-template.json:9`)

---

## 4) Checklist “in 2 minuti” (cosa creare/riempire)

### Instagram
- DataTable “Social CRM - Instagram” esiste e contiene almeno 1 riga.
- Colonne minime: `IG_USER_ID`, `PAGE_ID`, `PAGE_ACCESS_TOKEN`.
- (Se alcuni endpoint legacy falliscono) aggiungi `IG_ACCESS_TOKEN` come fallback.
- Il workflow `GET /webhook/crm/instagram/oauth/callback` deve scrivere questi campi nella riga corretta (una per account).
- Se multi-account: aggiungi 1 riga per account e usa `account=1..N` su:
  - `/webhook/crm/instagram/conversations`
  - `/webhook/crm/instagram/messages`
  - `/webhook/crm/instagram/send`

### Facebook
- DataTable “Social CRM - Facebook”: `PAGE_ID`, `PAGE_ACCESS_TOKEN`.
- Se usi lo stesso flusso OAuth Meta per FB, il callback deve aggiornare anche questa tabella (o la stessa riga condivisa, se hai scelto di unificare IG+FB).

### WhatsApp
- DataTable “Social CRM - WhatsApp”: `WA_PHONE_NUMBER_ID`, `WA_BUSINESS_ACCOUNT_ID`, `ACCESS_TOKEN`.
- Se usi credenziali n8n per i Bearer, `ACCESS_TOKEN` può diventare ridondante; però il patch `patch_send_media_token.cjs` si aspetta `ACCESS_TOKEN` nello scope item JSON.

---

## 5) Tracce “chat/log” e dati hardcoded trovati nel repo

### Tracce tecniche (non sono chat, ma audit utile)
- Report workflow: `IG_WORKFLOWS_REPORT.txt`, `FB_WORKFLOWS_REPORT.txt`, `WA_WORKFLOWS_REPORT.txt`
- Test endpoint: `endpoint_tests_results.txt` (generato da `scripts/test-endpoints.js`)
- Note/contratti: `docs/api_v2_standard.md`, `instagram.txt`

### Dati hardcoded / sensibili

1) `env.md` contiene valori che sembrano credenziali reali (da trattare come segreti):
- `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `INSTAGRAM_APP_SECRET`, `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`
- `N8N_API_KEY`
- `FACEBOOK_PAGE_ACCESS_TOKEN`, `FACEBOOK_WEBHOOK_VERIFY_TOKEN`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`

2) Verify token WhatsApp in documentazione:
- `docs/api-connections.md:124` usa `irk-whatsapp-token`
- `docs/configurazione-piattaforma.md:93` suggerisce lo stesso esempio

3) ID DataTable/progetto hardcoded negli export:
- `n8n-update-wa-send-template.json:7` include `ZKTXLqvrcy80SQG0` e path `/projects/QIovoss2uNaEI090/...`

4) Username hard-coded in workflow IG (segnalato nel report):
- `IG_WORKFLOWS_REPORT.txt:133` indica `cloud_creative_studio` per identificare “me” nei participants
