'use client'
import { useState } from 'react'

export function PrButton({ alertId }: { alertId: string }) {
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'skipped' | 'error'>('idle')
  const [url, setUrl] = useState('')
  const [reason, setReason] = useState('')
  const go = async () => {
    setState('working')
    const res = await fetch('/api/pro/pr', { method: 'POST', body: JSON.stringify({ alertId }) })
    const json = await res.json()
    if (!res.ok) setState('error')
    else if (json.skipped) {
      setReason(json.reason)
      setState('skipped')
    } else {
      setUrl(json.prUrl)
      setState('done')
    }
  }
  if (state === 'done') return <a href={url}>✅ Ver PR de cumplimiento</a>
  if (state === 'skipped') return <p>Esta norma no obliga a cambiar tu código: {reason}</p>
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
