import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const busqueda = searchParams.get('busqueda') || ''
  const subcontratista = searchParams.get('subcontratista') || ''
  const soloActivos = searchParams.get('soloActivos') === 'true'

  let query = supabase
    .from('dat_fuerza_trabajo')
    .select('*, cat_subcontratistas(razon_social)')
    .order('fecha_registro', { ascending: false })

  if (busqueda) {
    query = query.or(`nombre.ilike.%${busqueda}%,nss.ilike.%${busqueda}%,curp.ilike.%${busqueda}%`)
  }

  if (subcontratista && subcontratista !== 'all') {
    query = query.eq('id_subcontratista', subcontratista)
  }

  if (soloActivos) {
    query = query.eq('activo', true)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value }
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()

  const { data: profile } = await supabase
    .from('dat_personal_area')
    .select('id_empresa')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const { data, error } = await supabase
    .from('dat_fuerza_trabajo')
    .insert([{ ...body, id_empresa: profile.id_empresa, creado_por: user.id }])
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PUT(request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value }
      }
    }
  )

  const body = await request.json()
  const { id_trabajador, ...updates } = body
  
  const { data, error } = await supabase
    .from('dat_fuerza_trabajo')
    .update(updates)
    .eq('id_trabajador', id_trabajador)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
