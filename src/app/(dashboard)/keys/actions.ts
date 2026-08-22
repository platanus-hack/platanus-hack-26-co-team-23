'use server'
import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { generateApiKey } from '@/lib/api-keys'

export async function createKey(_prev: { raw?: string; error?: string } | null, formData: FormData) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Inicia sesión para generar keys' }

  const name = String(formData.get('name') ?? '').trim() || 'default'
  const { raw, prefix, hash } = generateApiKey()
  const { data: company } = await supabase.from('companies').select('id').eq('owner_user_id', user.id).maybeSingle()
  const { error } = await supabase.from('api_keys').insert({
    owner_user_id: user.id, company_id: company?.id ?? null,
    name, key_prefix: prefix, key_hash: hash,
  })
  if (error) return { error: 'No se pudo crear la key' }
  revalidatePath('/keys')
  return { raw } // se muestra UNA vez — solo persistimos el hash
}

export async function revokeKey(formData: FormData) {
  const supabase = await createServerSupabase()
  await supabase.from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', String(formData.get('id')))
  revalidatePath('/keys')
}
