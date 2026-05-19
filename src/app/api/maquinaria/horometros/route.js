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

// GET: Historial de horómetros de un equipo
export async function GET(request) {
  try {
    const { supabase, profile } = await getSupabaseAndProfile()
    if (!supabase || !profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id_maquinaria = searchParams.get('id_maquinaria')

    if (!id_maquinaria) {
      return NextResponse.json({ error: 'Falta id_maquinaria' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('dat_horometros_maquinaria')
      .select('*')
      .eq('id_maquinaria', id_maquinaria)
      .order('periodo', { ascending: true })

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error en GET Horómetros:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST: Upsert masivo de horómetros por período
export async function POST(request) {
  try {
    const { supabase, user, profile } = await getSupabaseAndProfile()
    if (!supabase || !profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { id_maquinaria, registros } = body

    if (!id_maquinaria || !registros || !Array.isArray(registros)) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    let mostRecentPeriod = ''
    let mostRecentHorometro = null
    let mostRecentProximoMtto = null

    for (const reg of registros) {
      const { periodo, horometro_final, fecha_proximo_mantenimiento } = reg

      const valHorometro = (horometro_final !== '' && horometro_final !== null && horometro_final !== undefined)
        ? parseFloat(horometro_final) : null
      const valFecha = (fecha_proximo_mantenimiento !== '' && fecha_proximo_mantenimiento !== null && fecha_proximo_mantenimiento !== undefined)
        ? fecha_proximo_mantenimiento : null

      // Upsert: intentar actualizar, si no existe, insertar
      const { data: existing } = await supabase
        .from('dat_horometros_maquinaria')
        .select('id')
        .eq('id_maquinaria', id_maquinaria)
        .eq('periodo', periodo)
        .limit(1)

      if (existing && existing.length > 0) {
        await supabase
          .from('dat_horometros_maquinaria')
          .update({
            horometro_final: valHorometro,
            fecha_proximo_mantenimiento: valFecha,
            registrado_por: user.id
          })
          .eq('id', existing[0].id)
      } else {
        await supabase
          .from('dat_horometros_maquinaria')
          .insert([{
            id_maquinaria,
            id_empresa: profile.id_empresa,
            periodo,
            horometro_final: valHorometro,
            fecha_proximo_mantenimiento: valFecha,
            registrado_por: user.id
          }])
      }

      // Rastrear el período más reciente
      if (periodo > mostRecentPeriod && (valHorometro !== null || valFecha !== null)) {
        mostRecentPeriod = periodo
        mostRecentHorometro = valHorometro
        mostRecentProximoMtto = valFecha
      }
    }

    // Actualizar la ficha principal de maquinaria con el dato más reciente
    if (mostRecentPeriod !== '') {
      const updatePayload = {}
      if (mostRecentHorometro !== null) updatePayload.horometro = mostRecentHorometro
      if (mostRecentProximoMtto !== null) updatePayload.fecha_proximo_mantenimiento = mostRecentProximoMtto

      if (Object.keys(updatePayload).length > 0) {
        await supabase
          .from('dat_maquinaria')
          .update(updatePayload)
          .eq('id_maquinaria', id_maquinaria)
      }
    }

    return NextResponse.json({ success: true, mensaje: 'Historial actualizado correctamente' })
  } catch (error) {
    console.error('Error en POST Horómetros:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
