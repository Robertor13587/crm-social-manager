import { ref, onMounted } from 'vue'
import { isMetaLinked, isMetaOAuthInProgress } from '@/utils/api'
import { getFbPage } from '@/services/metaApiService'

// Shared state
const isConnected = ref(isMetaLinked())
const isConnecting = ref(isMetaOAuthInProgress())
const isValidating = ref(false)
const needsReconnect = ref(false)
let _wasConnected = isMetaLinked()

// Listeners to keep state in sync with api.ts events
if (typeof window !== 'undefined') {
  window.addEventListener('meta:linked', () => {
    isConnected.value = true
    isConnecting.value = false
    needsReconnect.value = false
    _wasConnected = true
  })

  window.addEventListener('meta:unlinked', () => {
    const wasConnected = _wasConnected
    isConnected.value = false
    isConnecting.value = false
    _wasConnected = false
    // Show reconnect banner if the token expired while user was connected
    if (wasConnected) needsReconnect.value = true
  })
}

export const useMetaConnection = () => {
  const checkConnection = () => {
    isConnected.value = isMetaLinked()
    isConnecting.value = isMetaOAuthInProgress()
    return isConnected.value
  }

  /**
   * Performs a server-side validation of the Meta connection.
   * Leverages apiFetch's built-in mechanism to update meta:linked/unlinked state based on response.
   */
  const validateConnection = async () => {
    if (isValidating.value) return isConnected.value
    
    // If we are not locally linked and not connecting, no need to validate server-side (unless we want to check if we missed a login)
    // But usually validation is to check if an existing session is still valid.
    if (!isConnected.value && !isConnecting.value) return false

    isValidating.value = true
    try {
      // Use a lightweight FB page fetch to probe validity.
      await getFbPage()
    } catch (err) {
      // Network errors or aborts are ignored here; we keep the current state.
      // Auth errors are handled by apiFetch internals via events.
    } finally {
      isValidating.value = false
      checkConnection() // Sync final state
    }
    return isConnected.value
  }

  // Optional: Auto-check on mount (overkill if we trust events, but safe)
  onMounted(() => {
    checkConnection()
  })

  const dismissReconnect = () => { needsReconnect.value = false }

  return {
    isConnected,
    isConnecting,
    isValidating,
    needsReconnect,
    checkConnection,
    validateConnection,
    dismissReconnect
  }
}
