import { useState, useEffect } from 'react'
import { getSystemStats } from '../utils/api'

// Module-level cache: survives re-renders and hook re-subscriptions.
// First render immediately returns last known data instead of null.
let _cachedStats = null

export function useSystemStats(interval = 3000) {
  const [stats, setStats] = useState(_cachedStats)

  useEffect(() => {
    const poll = async () => {
      try {
        const d = await getSystemStats()
        if (!d.error) {
          _cachedStats = d        // persist across hook instances
          setStats(d)
        }
      } catch (_) {}
    }
    poll()
    const id = setInterval(poll, interval)
    return () => clearInterval(id)
  }, [interval])

  return stats
}
