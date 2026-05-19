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

// GET: Historial de mantenimiento de un equipo
export async function GET(request) {
  try {
    const { supabase, profile } = await getSupabaseAndProfile()
    if (!supabase || !profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id_maquinaria = searchParams.get('id_maquinaria')

    if (!id_maquinaria) {
      return NextResponse.json({ error: 'Falta el ID de la maquinaria.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('dat_mantenimiento_maquinaria')
      .select('*')
      .eq('id_maquinaria', id_maquinaria)
      .order('fecha_mantenimiento', { ascending: false })

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error al obtener historial:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST: Nuevo registro de mantenimiento
export async function POST(request) {
  try {
    const { supabase, user, profile } = await getSupabaseAndProfile()
    if (!supabase || !profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { id_maquinaria, fecha_mantenimiento, tipo_mantenimiento, horometro_mantenimiento, observaciones, realizado_por } = body

    if (!id_maquinaria || !fecha_mantenimiento || !tipo_mantenimiento) {
      return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 })
    }

    // Generar folio consecutivo por empresa
    let folioFinal = null
    try {
      const { data: maqData } = await supabase
        .from('dat_maquinaria')
        .select('id_empresa')
        .eq('id_maquinaria', id_maquinaria)
        .single()

      if (maqData) {
        // Obtener max folio de todos los mantenimientos de maquinaria de esa empresa
        const { data: allMaq } = await supabase
          .from('dat_maquinaria')
          .select('id_maquinaria')
          .eq('id_empresa', maqData.id_empresa)

        if (allMaq && allMaq.length > 0) {
          const maqIds = allMaq.map(m => m.id_maquinaria)
          const { data: folioData } = await supabase
            .from('dat_mantenimiento_maquinaria')
            .select('folio_mtto')
            .in('id_maquinaria', maqIds)
            .not('folio_mtto', 'is', null)
            .order('folio_mtto', { ascending: false })
            .limit(1)

          const maxFolio = folioData && folioData.length > 0 ? folioData[0].folio_mtto : 100
          folioFinal = maxFolio + 1
          if (folioFinal <= 100) folioFinal = 101
        }
      }
    } catch (folioErr) {
      console.error('Error generando folio:', folioErr)
    }

    const horometroFinal = horometro_mantenimiento ? parseFloat(horometro_mantenimiento) : null

    const { data, error } = await supabase
      .from('dat_mantenimiento_maquinaria')
      .insert([{
        id_maquinaria,
        fecha_mantenimiento,
        tipo_mantenimiento,
        horometro_mantenimiento: horometroFinal,
        observaciones: observaciones || null,
        realizado_por: realizado_por || null,
        folio_mtto: folioFinal
      }])
      .select()

    if (error) throw error

    // Cálculo automático de próximo mantenimiento
    try {
      const { data: maquinaData } = await supabase
        .from('dat_maquinaria')
        .select('tipo_unidad')
        .eq('id_maquinaria', id_maquinaria)
        .single()

      if (maquinaData) {
        const { tipo_unidad } = maquinaData
        let fechaProxima = null
        const baseDate = new Date(fecha_mantenimiento)

        if (tipo_unidad === 'maquinaria') {
          // +36 días naturales
          fechaProxima = new Date(baseDate)
          fechaProxima.setDate(fechaProxima.getDate() + 36)
        } else if (tipo_unidad === 'equipo' || tipo_unidad === 'vehiculo') {
          // +3 meses
          fechaProxima = new Date(baseDate)
          fechaProxima.setMonth(fechaProxima.getMonth() + 3)
        }

        if (fechaProxima) {
          const yyyy = fechaProxima.getUTCFullYear()
          const mm = String(fechaProxima.getUTCMonth() + 1).padStart(2, '0')
          const dd = String(fechaProxima.getUTCDate()).padStart(2, '0')
          const fechaSQL = `${yyyy}-${mm}-${dd}`

          await supabase
            .from('dat_maquinaria')
            .update({ fecha_proximo_mantenimiento: fechaSQL })
            .eq('id_maquinaria', id_maquinaria)

          // Sincronizar en tabla de horómetros
          const periodo = fecha_mantenimiento.substring(0, 7)
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
                fecha_proximo_mantenimiento: fechaSQL,
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
                fecha_proximo_mantenimiento: fechaSQL,
                registrado_por: user.id
              }])
          }
        }
      }
    } catch (calcError) {
      console.error('Error calculando próxima fecha:', calcError)
    }

    return NextResponse.json({
      success: true,
      mensaje: 'Mantenimiento registrado correctamente',
      id: data?.[0]?.id_mantenimiento
    })
  } catch (error) {
    console.error('Error al guardar mantenimiento:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// PUT: Actualizar registro de mantenimiento
export async function PUT(request) {
  try {
    const { supabase, user, profile } = await getSupabaseAndProfile()
    if (!supabase || !profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { id_mantenimiento, fecha_mantenimiento, tipo_mantenimiento, horometro_mantenimiento, observaciones, realizado_por } = body

    if (!id_mantenimiento || !fecha_mantenimiento || !tipo_mantenimiento) {
      return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 })
    }

    const horometroFinal = horometro_mantenimiento ? parseFloat(horometro_mantenimiento) : null

    const { error } = await supabase
      .from('dat_mantenimiento_maquinaria')
      .update({
        fecha_mantenimiento,
        tipo_mantenimiento,
        horometro_mantenimiento: horometroFinal,
        observaciones: observaciones || null,
        realizado_por: realizado_por || null
      })
      .eq('id_mantenimiento', id_mantenimiento)

    if (error) throw error

    // Recalcular fecha próxima
    try {
      const { data: mttoData } = await supabase
        .from('dat_mantenimiento_maquinaria')
        .select('id_maquinaria')
        .eq('id_mantenimiento', id_mantenimiento)
        .single()

      if (mttoData) {
        const { data: maquinaData } = await supabase
          .from('dat_maquinaria')
          .select('tipo_unidad')
          .eq('id_maquinaria', mttoData.id_maquinaria)
          .single()

        if (maquinaData) {
          const { tipo_unidad } = maquinaData
          let fechaProxima = null
          const baseDate = new Date(fecha_mantenimiento)

          if (tipo_unidad === 'maquinaria') {
            fechaProxima = new Date(baseDate)
            fechaProxima.setDate(fechaProxima.getDate() + 36)
          } else if (tipo_unidad === 'equipo' || tipo_unidad === 'vehiculo') {
            fechaProxima = new Date(baseDate)
            fechaProxima.setMonth(fechaProxima.getMonth() + 3)
          }

          if (fechaProxima) {
            const yyyy = fechaProxima.getUTCFullYear()
            const mm = String(fechaProxima.getUTCMonth() + 1).padStart(2, '0')
            const dd = String(fechaProxima.getUTCDate()).padStart(2, '0')
            const fechaSQL = `${yyyy}-${mm}-${dd}`

            await supabase
              .from('dat_maquinaria')
              .update({ fecha_proximo_mantenimiento: fechaSQL })
              .eq('id_maquinaria', mttoData.id_maquinaria)
          }
        }
      }
    } catch (calcError) {
      console.error('Error recalculando próxima fecha al editar:', calcError)
    }

    return NextResponse.json({ success: true, mensaje: 'Mantenimiento actualizado correctamente' })
  } catch (error) {
    console.error('Error al actualizar mantenimiento:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE: Eliminar registro de mantenimiento
export async function DELETE(request) {
  try {
    const { supabase, profile } = await getSupabaseAndProfile()
    if (!supabase || !profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Falta el ID del mantenimiento.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('dat_mantenimiento_maquinaria')
      .delete()
      .eq('id_mantenimiento', id)

    if (error) throw error
    return NextResponse.json({ success: true, mensaje: 'Registro eliminado correctamente' })
  } catch (error) {
    console.error('Error al eliminar mantenimiento:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
