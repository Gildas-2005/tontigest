import { useEffect, useState } from 'react'

/* Enregistre le service worker de la PWA TontiGest. */
export function useServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
}

/* Expose l'événement beforeinstallprompt : retourne un bouton d'installation
   tant que l'app n'est pas installée, null sinon (déjà installée ou non supporté). */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  useEffect(() => {
    const h = (e) => { e.preventDefault(); setDeferred(e) }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])
  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
  }
  return deferred ? install : null
}
