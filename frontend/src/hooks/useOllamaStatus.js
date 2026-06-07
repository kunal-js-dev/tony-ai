import { useState, useEffect } from 'react'
import { getOllamaStatus } from '../utils/api'

export function useOllamaStatus() {
  const [status, setStatus] = useState({ online: false, models: [] })

  useEffect(() => {
    const check = async () => {
      try {
        const d = await getOllamaStatus()
        setStatus(d)
      } catch (_) {
        setStatus({ online: false, models: [] })
      }
    }
    check()
    const id = setInterval(check, 12000)
    return () => clearInterval(id)
  }, [])

  return status
}
