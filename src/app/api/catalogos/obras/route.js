import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function getSupabaseAndProfile() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { get(name) { return cookieStore.get(name)?.value } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase: null, user: null, profile: null }

  const { data: profile } = await supabase
    .from('dat_personal_area')
    .select('id_empresa, rol')
    .eq('auth_user_id', user.id)
    .single()

  return { supabase, user, profile }
}

// GET: Listar obras activas de la empresa
export async function GET() {
  const { supabase, profile } = await getSupabaseAndProfile()
  if (!supabase || !profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('cat_obras')
    .select('*')
    .eq('activa', true)
    .order('nombre_obra')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

// POST: Crear nueva obra
export async function POST(request) {
  const { supabase, profile } = await getSupabaseAndProfile()
  if (!supabase || !profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { nombre_obra, ubicacion, descripcion } = body

  if (!nombre_obra || !nombre_obra.trim()) {
    return NextResponse.json({ error: 'El nombre de la obra es obligatorio.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('cat_obras')
    .insert([{
      id_empresa: profile.id_empresa,
      nombre_obra: nombre_obra.trim(),
      ubicacion: ubicacion?.trim() || null,
      descripcion: descripcion?.trim() || null
    }])
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
