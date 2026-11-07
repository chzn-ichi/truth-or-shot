import { useEffect } from 'react'

export function useKeepAwake(enabled) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return

    let lock = null
    let cancelled = false

    async function acquire() {
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          sentinel.release()
          return
        }
        lock = sentinel
      } catch {
        /* denied (for example battery saver), nothing to do */
      }
    }

    // The browser drops the lock whenever the tab is hidden, so ask again on return
    function onVisible() {
      if (document.visibilityState === 'visible') acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release()
    }
  }, [enabled])
}