'use client'
import { useState } from 'react'

export function PrButton({ alertId }: { alertId: string }) {
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [url, setUrl] = useState('')
  const go = async () => {
    setState('working')
    const res = await fetch('/api/pro/pr', { method: 'POST', body: JSON.stringify({ alertId }) })
    const json = await res.json()
    if (res.ok) {
      setUrl(json.prUrl)
      setState('done')
    } else setState('error')
  }
  if (state === 'done') return <a href={url}>✅ Ver PR de cumplimiento</a>
  return (
    <button onClick={go} disabled={state === 'working'}>
      {state === 'working'
        ? 'Analizando tu código…'
        : state === 'error'
          ? 'Falló — reintentar'
          : '⚙️ Generar PR de cumplimiento (PRO)'}
    </button>
  )
}
