'use client'
import { useActionState } from 'react'
import { createKey } from './actions'

export function CreateKeyForm() {
  const [state, action, pending] = useActionState(createKey, null)
  return (
    <div style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
      <form action={action} style={{ display: 'flex', gap: 8 }}>
        <input name="name" placeholder="Nombre (ej: agente interno)" style={{ flex: 1 }} />
        <button type="submit" disabled={pending}>{pending ? 'Generando…' : '➕ Generar API key'}</button>
      </form>
      {state?.raw && (
        <div style={{ border: '1px solid #34d399', borderRadius: 8, padding: 12, background: '#f0fdf4' }}>
          <strong>Tu key — cópiala ahora, no se vuelve a mostrar:</strong>
          <code style={{ display: 'block', marginTop: 6, wordBreak: 'break-all' }}>{state.raw}</code>
          <small>Úsala con header <code>x-api-key</code>, o en el MCP: <code>COMPLAI_API_KEY={'{tu key}'}</code></small>
        </div>
      )}
      {state?.error && <p style={{ color: 'crimson' }}>{state.error}</p>}
    </div>
  )
}
