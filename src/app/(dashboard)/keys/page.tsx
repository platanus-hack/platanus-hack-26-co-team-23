import { createServerSupabase } from '@/lib/supabase/server'
import { CreateKeyForm } from './create-key-form'
import { revokeKey } from './actions'

export default async function Keys() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p style={{ padding: 24 }}>Inicia sesión para gestionar tus API keys (<a href="/login">login</a>).</p>

  const { data: keys } = await supabase.from('api_keys')
    .select('id, name, key_prefix, created_at, last_used_at, revoked_at')
    .order('created_at', { ascending: false })

  return (
    <div style={{ display: 'grid', gap: 16, padding: 24, maxWidth: 720 }}>
      <h2>API Keys — acceso MCP</h2>
      <p>Con tu key, cualquier agente consulta la normativa: <code>claude mcp add complai --env COMPLAI_API_KEY=cai_... -- npx -y complai-mcp</code></p>
      <CreateKeyForm />
      <table style={{ borderCollapse: 'collapse' }}>
        <thead><tr style={{ textAlign: 'left' }}><th>Nombre</th><th>Key</th><th>Creada</th><th>Último uso</th><th></th></tr></thead>
        <tbody>
          {(keys ?? []).map((k) => (
            <tr key={k.id} style={{ opacity: k.revoked_at ? 0.45 : 1, borderTop: '1px solid #ddd' }}>
              <td>{k.name}</td>
              <td><code>{k.key_prefix}…</code></td>
              <td>{k.created_at?.slice(0, 10)}</td>
              <td>{k.last_used_at?.slice(0, 16).replace('T', ' ') ?? '—'}</td>
              <td>
                {k.revoked_at ? 'revocada' : (
                  <form action={revokeKey}><input type="hidden" name="id" value={k.id} /><button type="submit">Revocar</button></form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
