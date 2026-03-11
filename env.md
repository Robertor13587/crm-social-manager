# Environment Variables — CRM Social Manager

> ⚠️ **ATTENZIONE**: Questo file è solo documentazione. Non inserire mai credenziali reali qui.
> Tutte le variabili vanno impostate nel file `.env.local` (non versionato) o nel pannello del server.

---

## Variabili Frontend (Vite — prefisso `VITE_`)

```env
# URL del backend API Node.js
VITE_BACKEND_BASE_URL=https://your-api-domain.com

# URL del server n8n per i workflow
VITE_N8N_BASE_URL=https://your-n8n-domain.com

# Timeout delle richieste in ms (default: 15000)
VITE_REQUEST_TIMEOUT_MS=15000
```

---

## Variabili Backend (`scripts/crm_api_server.js`)

```env
# Server
NODE_ENV=production
PORT=8787

# CORS — dominio del frontend
FRONTEND_ORIGIN=https://your-frontend-domain.com

# Database MySQL / MariaDB
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
DB_POOL_SIZE=10

# JWT — usare segreti casuali lunghi (min 64 char)
JWT_SECRET=<genera con: openssl rand -hex 32>
JWT_REFRESH_SECRET=<genera con: openssl rand -hex 32>

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=<token dalla Meta Business Suite>
WHATSAPP_PHONE_NUMBER_ID=<ID numero telefono>
WHATSAPP_BUSINESS_ACCOUNT_ID=<ID account business>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<token personalizzato>

# Instagram (Meta)
INSTAGRAM_APP_ID=<App ID da developers.facebook.com>
INSTAGRAM_APP_SECRET=<App Secret — NON condividere mai>
INSTAGRAM_REDIRECT_URI=https://your-api-domain.com/api/instagram/oauth/callback
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=<token personalizzato>

# Facebook Page API
FACEBOOK_PAGE_ID=<ID pagina Facebook>
FACEBOOK_PAGE_ACCESS_TOKEN=<Page Access Token — NON condividere mai>
FACEBOOK_WEBHOOK_VERIFY_TOKEN=<token personalizzato>
FACEBOOK_APP_SECRET=<App Secret — NON condividere mai>

# n8n
N8N_BASE_URL=https://your-n8n-domain.com
N8N_API_KEY=<API key n8n>

# Encryption
ENCRYPTION_KEY=<genera con: openssl rand -hex 32>

# Logging
LOG_LEVEL=info
```

---

## Come generare segreti sicuri

```bash
# JWT secrets, encryption key, ecc.
openssl rand -hex 32

# Oppure con Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Setup

1. Copia `.env.example` in `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Compila tutti i valori in `.env.local`
3. **Non committare mai `.env.local` o `.env` con credenziali reali**

---

## Note di sicurezza

- I token Meta (WhatsApp, Instagram, Facebook) vanno ottenuti dalla [Meta Business Suite](https://business.facebook.com/)
- Ruota periodicamente i JWT secrets e i token API
- In produzione, usa un secrets manager (es. AWS Secrets Manager, Vault, Supabase Secrets)
