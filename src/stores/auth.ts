import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { authStorage, type StoredUser } from '@/services/authStorage'
import { useInstagramStore } from './instagram'
import { useFacebookStore } from './facebook'
import { useWhatsAppStore } from './whatsapp'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token:      authStorage.getToken(),
    user:       authStorage.getUser(),
    role:       authStorage.getRole(),
    metaLinked: authStorage.isMetaLinked(),
  }),

  getters: {
    isAuthenticated:     (state) => !!state.token,
    isMetaOAuthInProgress: () => authStorage.isMetaOAuthInProgress(),
  },

  actions: {
    // ── Supabase Auth ──────────────────────────────────────────────────────────

    /**
     * Login via Supabase Auth.
     * Salva il token nella store e in authStorage (mantiene compat router guard).
     * Lancia un errore con messaggio localizzato in caso di fallimento.
     */
    async login(email: string, password: string): Promise<void> {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message?.toLowerCase().includes('invalid login')) {
          throw new Error('Credenziali non valide')
        }
        throw new Error(error.message || 'Errore durante il login')
      }
      if (!data.session || !data.user) throw new Error('Risposta autenticazione non valida')

      let name = (data.user.user_metadata?.name as string) || ''
      let role = (data.user.user_metadata?.role as string) || ''

      // Se auth.users.user_metadata non ha name/role, legge da public.users
      if (!name || !role) {
        const { data: pubUser } = await supabase
          .from('users')
          .select('name, role')
          .eq('email', email)
          .single()
        if (pubUser) {
          name = name || (pubUser.name as string) || ''
          role = role || (pubUser.role as string) || 'user'
        }
      }

      const user: StoredUser = {
        id:    data.user.id,
        email: data.user.email!,
        role:  role || 'user',
        name,
      }
      this.saveSession(data.session.access_token, user)
    },

    /**
     * Cambia la password dell'utente autenticato.
     * Verifica prima la password attuale ri-autenticando l'utente.
     */
    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
      const email = this.user?.email
      if (!email) throw new Error('Utente non autenticato')

      // Verifica password attuale
      const { error: verifyErr } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
      if (verifyErr) throw new Error('Password attuale non corretta')

      // Aggiorna password
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw new Error(error.message || 'Errore aggiornamento password')
    },

    /**
     * Inizializza il listener Supabase per mantenere il token in sync.
     * Da chiamare una volta in main.ts (o App.vue).
     * Gestisce: login/logout remoti, token refresh automatico.
     */
    initAuthListener(): void {
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session) {
            let name = (session.user.user_metadata?.name as string) || ''
            let role = (session.user.user_metadata?.role as string) || ''

            // Se auth.users.user_metadata non ha name/role, controlla prima lo
            // storage locale (evita query extra su TOKEN_REFRESHED), poi public.users
            if (!name || !role) {
              const stored = authStorage.getUser()
              if (stored && stored.email === session.user.email && stored.name && stored.role && stored.role !== 'user') {
                name = name || stored.name
                role = role || stored.role
              } else {
                const { data: pubUser } = await supabase
                  .from('users')
                  .select('name, role')
                  .eq('email', session.user.email!)
                  .single()
                if (pubUser) {
                  name = name || (pubUser.name as string) || ''
                  role = role || (pubUser.role as string) || 'user'
                }
              }
            }

            const user: StoredUser = {
              id:    session.user.id,
              email: session.user.email!,
              role:  role || 'user',
              name,
            }
            // aggiorna token in authStorage (usato dal router guard)
            authStorage.setToken(session.access_token)
            authStorage.setUser(user)
            authStorage.setRole(user.role)
            this.token = session.access_token
            this.user  = user
            this.role  = user.role
          }
        } else if (event === 'SIGNED_OUT') {
          this.clearPlatformStores()
          authStorage.clearAll()
          this.token     = null
          this.user      = null
          this.role      = 'user'
          this.metaLinked = false
        }
      })
    },

    // ── Session helpers (compat con componenti esistenti) ──────────────────────

    saveSession(token: string, user: StoredUser) {
      authStorage.saveSession(token, user)
      this.token = token
      this.user  = user
      this.role  = user.role || 'user'
    },

    setToken(token: string) {
      authStorage.setToken(token)
      this.token = token
    },

    setMetaLinked(linked: boolean) {
      authStorage.setMetaLinked(linked)
      this.metaLinked = linked
    },

    startMetaOAuth() {
      authStorage.startMetaOAuth()
    },

    setPostLoginRedirect(path: string)  { authStorage.setPostLoginRedirect(path) },
    clearPostLoginRedirect()            { authStorage.clearPostLoginRedirect() },
    getPostLoginRedirect()              { return authStorage.getPostLoginRedirect() },

    setPostOAuthRedirect(path: string)  { authStorage.setPostOAuthRedirect(path) },
    clearPostOAuthRedirect()            { authStorage.clearPostOAuthRedirect() },
    getPostOAuthRedirect()              { return authStorage.getPostOAuthRedirect() },

    /**
     * Resetta tutti gli store delle piattaforme Meta (WhatsApp, Instagram, Facebook).
     * Elimina dati in memoria: conversazioni, messaggi, profili, ecc.
     * I token Meta in Supabase vengono mantenuti (sono credenziali aziendali condivise).
     */
    clearPlatformStores() {
      useInstagramStore().$reset()
      useFacebookStore().$reset()
      useWhatsAppStore().$reset()
    },

    async logout() {
      // Prima puliamo i dati in memoria per evitare che rimangano accessibili
      this.clearPlatformStores()
      await supabase.auth.signOut()
      authStorage.clearAll()
      this.token      = null
      this.user       = null
      this.role       = 'user'
      this.metaLinked = false
      // Disconnette Meta: resetta lo stato reattivo in tutti i composable
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('meta:unlinked'))
      }
    },
  },
})
