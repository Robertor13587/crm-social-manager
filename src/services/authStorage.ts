/**
 * authStorage.ts
 * Servizio centralizzato per la gestione di tutti i dati di autenticazione
 * e sessione salvati in localStorage / sessionStorage.
 *
 * Vantaggi:
 * - Unico punto di accesso → facile trovare/cambiare le chiavi
 * - try/catch centralizzati → non si ripetono in ogni componente
 * - Tipizzazione corretta → niente `any` sparso nel codebase
 */

// ─── Chiavi ──────────────────────────────────────────────────────────────────

const KEYS = {
  JWT_TOKEN: 'jwt_token',
  ROLE: 'role',
  USER: 'user',
  META_LINKED: 'metaLinked',
  META_OAUTH_START: 'metaOAuthStartAt',
  POST_LOGIN_REDIRECT: 'postLoginRedirect',
  POST_OAUTH_REDIRECT: 'postOAuthRedirect',
} as const

// ─── Tipi ─────────────────────────────────────────────────────────────────────

export interface StoredUser {
  id: string | number
  email: string
  role: string
  name?: string
  [key: string]: unknown
}

// ─── Helpers interni ─────────────────────────────────────────────────────────

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

function lsRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {}
}

function ssGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function ssSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value)
  } catch {}
}

function ssRemove(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {}
}

// ─── JWT Token ────────────────────────────────────────────────────────────────

export const authStorage = {
  // ── Token JWT ───────────────────────────────────────────────────────────────

  getToken(): string | null {
    return lsGet(KEYS.JWT_TOKEN)
  },

  setToken(token: string): void {
    lsSet(KEYS.JWT_TOKEN, token)
  },

  removeToken(): void {
    lsRemove(KEYS.JWT_TOKEN)
  },

  hasToken(): boolean {
    const t = lsGet(KEYS.JWT_TOKEN)
    return !!t && t.length > 0
  },

  // ── Utente ──────────────────────────────────────────────────────────────────

  getUser(): StoredUser | null {
    // localStorage: sopravvive ai full-page reload causati dall'OAuth Meta
    const raw = lsGet(KEYS.USER)
    if (!raw) return null
    try {
      return JSON.parse(raw) as StoredUser
    } catch {
      return null
    }
  },

  setUser(user: StoredUser): void {
    try {
      lsSet(KEYS.USER, JSON.stringify(user))
    } catch {}
  },

  removeUser(): void {
    lsRemove(KEYS.USER)
  },

  // ── Ruolo ───────────────────────────────────────────────────────────────────

  getRole(): string {
    // localStorage: sopravvive ai full-page reload causati dall'OAuth Meta
    return lsGet(KEYS.ROLE) || 'user'
  },

  setRole(role: string): void {
    lsSet(KEYS.ROLE, role)
  },

  removeRole(): void {
    lsRemove(KEYS.ROLE)
  },

  // ── Meta OAuth ──────────────────────────────────────────────────────────────

  isMetaLinked(): boolean {
    return ssGet(KEYS.META_LINKED) === '1'
  },

  setMetaLinked(linked: boolean): void {
    if (linked) {
      ssSet(KEYS.META_LINKED, '1')
      lsRemove(KEYS.META_OAUTH_START)
    } else {
      ssRemove(KEYS.META_LINKED)
      lsRemove(KEYS.META_OAUTH_START)
    }
  },

  isMetaOAuthInProgress(): boolean {
    const raw = lsGet(KEYS.META_OAUTH_START)
    const startedAt = raw ? Number(raw) : NaN
    return Number.isFinite(startedAt) && Date.now() - startedAt < 20 * 60 * 1000
  },

  startMetaOAuth(): void {
    lsSet(KEYS.META_OAUTH_START, String(Date.now()))
  },

  clearMetaOAuth(): void {
    lsRemove(KEYS.META_OAUTH_START)
    ssRemove(KEYS.META_LINKED)
  },

  // ── Redirect post-login / post-OAuth ────────────────────────────────────────

  getPostLoginRedirect(): string | null {
    return lsGet(KEYS.POST_LOGIN_REDIRECT)
  },

  setPostLoginRedirect(path: string): void {
    lsSet(KEYS.POST_LOGIN_REDIRECT, path)
  },

  clearPostLoginRedirect(): void {
    lsRemove(KEYS.POST_LOGIN_REDIRECT)
  },

  getPostOAuthRedirect(): string | null {
    return lsGet(KEYS.POST_OAUTH_REDIRECT)
  },

  setPostOAuthRedirect(path: string): void {
    lsSet(KEYS.POST_OAUTH_REDIRECT, path)
  },

  clearPostOAuthRedirect(): void {
    lsRemove(KEYS.POST_OAUTH_REDIRECT)
  },

  // ── Logout completo ─────────────────────────────────────────────────────────

  /**
   * Rimuove tutti i dati di sessione/autenticazione.
   * Da chiamare al logout.
   */
  clearAll(): void {
    lsRemove(KEYS.JWT_TOKEN)
    lsRemove(KEYS.META_OAUTH_START)
    lsRemove(KEYS.POST_LOGIN_REDIRECT)
    lsRemove(KEYS.POST_OAUTH_REDIRECT)
    lsRemove(KEYS.USER)
    lsRemove(KEYS.ROLE)
    ssRemove(KEYS.META_LINKED)
  },

  // ── Save session dopo login ─────────────────────────────────────────────────

  /**
   * Salva token + utente in un'unica operazione atomica dopo il login.
   */
  saveSession(token: string, user: StoredUser): void {
    authStorage.setToken(token)
    authStorage.setUser(user)
    authStorage.setRole(user.role || 'user')
  },
}
