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

// --- GET: Listar Maquinaria con filtros y cálculos ---
export async function GET(request) {
  try {
    const { supabase, user, profile } = await getSupabaseAndProfile()
    if (!supabase || !profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const idObra = searchParams.get('obra')
    const tipoUnidad = searchParams.get('tipo_unidad')
    const busqueda = searchParams.get('busqueda')
    const mes = searchParams.get('mes')
    const anio = searchParams.get('anio')

    // Construir query base
    let query = supabase
      .from('dat_maquinaria')
      .select(`
        *,
        cat_obras ( nombre_obra )
      `)
      .order('fecha_ingreso_obra', { ascending: false })

    // Filtros de período: si hay mes/año, mostramos equipos activos en ese período
    if (mes && anio) {
      const lastDay = new Date(anio, mes, 0).getDate()
      const mesStr = String(mes).padStart(2, '0')
      const endDate = `${anio}-${mesStr}-${lastDay}`
      const startDate = `${anio}-${mesStr}-01`
      query = query
        .lte('fecha_ingreso_obra', endDate)
        .or(`fecha_baja.is.null,fecha_baja.gte.${startDate}`)
    } else {
      query = query.is('fecha_baja', null)
    }

    if (idObra) query = query.eq('id_obra', idObra)
    if (tipoUnidad && tipoUnidad !== 'todos') query = query.eq('tipo_unidad', tipoUnidad)
    if (busqueda) {
      query = query.or(
        `num_economico.ilike.%${busqueda}%,tipo.ilike.%${busqueda}%,marca.ilike.%${busqueda}%,modelo.ilike.%${busqueda}%,serie.ilike.%${busqueda}%,placa.ilike.%${busqueda}%`
      )
    }

    const { data: rows, error } = await query
    if (error) throw error

    // Obtener historial de mantenimiento más reciente para cada equipo
    const ids = rows.map(r => r.id_maquinaria)
    let mantenimientoMap = {}

    if (ids.length > 0) {
      // Obtener el último mantenimiento por equipo
      const { data: mantData } = await supabase
        .from('dat_mantenimiento_maquinaria')
        .select('id_maquinaria, fecha_mantenimiento, horometro_mantenimiento, realizado_por')
        .in('id_maquinaria', ids)
        .order('fecha_mantenimiento', { ascending: false })

      if (mantData) {
        for (const m of mantData) {
          if (!mantenimientoMap[m.id_maquinaria]) {
            mantenimientoMap[m.id_maquinaria] = m
          }
        }
      }
    }

    // Horómetros por período si aplica
    let horometroMap = {}
    if (mes && anio && ids.length > 0) {
      const periodo = `${anio}-${String(mes).padStart(2, '0')}`
      const { data: horData } = await supabase
        .from('dat_horometros_maquinaria')
        .select('id_maquinaria, horometro_final, fecha_proximo_mantenimiento')
        .in('id_maquinaria', ids)
        .eq('periodo', periodo)

      if (horData) {
        for (const h of horData) {
          horometroMap[h.id_maquinaria] = h
        }
      }
    }

    // Cálculos de estado de mantenimiento
    const dataConCalculos = rows.map(maquina => {
      const horPeriodo = horometroMap[maquina.id_maquinaria]
      const horometroActual = horPeriodo?.horometro_final ?? maquina.horometro ?? 0
      const fechaProxima = horPeriodo?.fecha_proximo_mantenimiento ?? maquina.fecha_proximo_mantenimiento
      const ultimoMtto = mantenimientoMap[maquina.id_maquinaria] || null

      let horasRestantes = null
      let estadoMantenimiento = 'N/A'

      if (maquina.intervalo_mantenimiento && horometroActual !== null) {
        const horometroBase = ultimoMtto?.horometro_mantenimiento || 0
        const horasUsadas = horometroActual - horometroBase
        horasRestantes = maquina.intervalo_mantenimiento - horasUsadas

        if (horasRestantes <= 0) estadoMantenimiento = 'Vencido'
        else if (horasRestantes <= 50) estadoMantenimiento = 'Próximo'
        else estadoMantenimiento = 'Óptimo'
      }

      return {
        ...maquina,
        horometro_actual: horometroActual,
        fecha_proximo_mantenimiento: fechaProxima,
        horas_restantes: horasRestantes,
        estado_mantenimiento: estadoMantenimiento,
        ultima_fecha_mantenimiento: ultimoMtto?.fecha_mantenimiento || null,
        ultimo_horometro_mantenimiento: ultimoMtto?.horometro_mantenimiento || null,
        responsable_ultimo_mantenimiento: ultimoMtto?.realizado_por || null,
        nombre_obra: maquina.cat_obras?.nombre_obra || null
      }
    })

    return NextResponse.json({ success: true, data: dataConCalculos })
  } catch (error) {
    console.error('Error en GET Maquinaria:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// --- POST: Nueva Maquinaria ---
export async function POST(request) {
  try {
    const { supabase, user, profile } = await getSupabaseAndProfile()
    if (!supabase || !profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const formData = await request.formData()

    const extractField = (key) => {
      const val = formData.get(key)
      return (!val || String(val).trim() === '' || val === 'null') ? null : String(val).trim()
    }

    const tipo = extractField('tipo')
    const marca = extractField('marca')
    const fecha_ingreso_obra = extractField('fecha_ingreso_obra')

    if (!tipo || !marca || !fecha_ingreso_obra) {
      return NextResponse.json({
        success: false,
        error: 'Los campos Tipo, Marca y Fecha de Ingreso son obligatorios.'
      }, { status: 400 })
    }

    // Validar duplicado de serie
    const serie = extractField('serie')
    if (serie) {
      const { data: existeSerie } = await supabase
        .from('dat_maquinaria')
        .select('marca, modelo')
        .eq('serie', serie)
        .eq('id_empresa', profile.id_empresa)
        .limit(1)

      if (existeSerie && existeSerie.length > 0) {
        return NextResponse.json({
          success: false,
          error: `Ese número de serie ya pertenece al equipo: ${existeSerie[0].marca} / ${existeSerie[0].modelo || 'S/N'}. No puedes duplicarlo.`
        }, { status: 400 })
      }
    }

    // Subir imagen a Supabase Storage si viene
    let imagen_url = null
    const file = formData.get('imagen')
    if (file && typeof file !== 'string' && file.size > 0) {
      try {
        const ext = file.name.split('.').pop()
        const filePath = `${profile.id_empresa}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('maquinaria')
          .upload(filePath, file, { contentType: file.type, upsert: false })

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('maquinaria').getPublicUrl(filePath)
          imagen_url = urlData.publicUrl
        }
      } catch (imgError) {
        console.error('Error subiendo imagen:', imgError)
      }
    }

    const payload = {
      id_empresa: profile.id_empresa,
      id_obra: extractField('id_obra'),
      tipo_unidad: extractField('tipo_unidad') || 'maquinaria',
      tipo,
      marca,
      modelo: extractField('modelo'),
      anio: extractField('anio') ? parseInt(extractField('anio')) : null,
      color: extractField('color'),
      num_economico: extractField('num_economico'),
      serie,
      placa: extractField('placa'),
      horometro: extractField('horometro') ? parseFloat(extractField('horometro')) : 0,
      horometro_inicial: extractField('horometro_inicial') ? parseFloat(extractField('horometro_inicial')) : 0,
      intervalo_mantenimiento: extractField('intervalo_mantenimiento') ? parseFloat(extractField('intervalo_mantenimiento')) : null,
      fecha_proximo_mantenimiento: extractField('fecha_proximo_mantenimiento'),
      fecha_ingreso_obra,
      actividad: extractField('actividad'),
      frente: extractField('frente'),
      imagen_url,
      creado_por: user.id
    }

    const { data, error } = await supabase.from('dat_maquinaria').insert([payload]).select()
    if (error) throw error

    return NextResponse.json({ success: true, data: data[0], imagen_url })
  } catch (error) {
    console.error('Error en POST Maquinaria:', error)
    return NextResponse.json({ success: false, error: error.message || 'Error al guardar.' }, { status: 500 })
  }
}

// --- PUT: Editar Maquinaria ---
export async function PUT(request) {
  try {
    const { supabase, user, profile } = await getSupabaseAndProfile()
    if (!supabase || !profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const formData = await request.formData()

    const extractField = (key) => {
      const val = formData.get(key)
      return (!val || String(val).trim() === '' || val === 'null') ? null : String(val).trim()
    }

    const id_maquinaria = extractField('id_maquinaria')
    const tipo = extractField('tipo')
    const marca = extractField('marca')
    const fecha_ingreso_obra = extractField('fecha_ingreso_obra')

    if (!id_maquinaria || !tipo || !marca || !fecha_ingreso_obra) {
      return NextResponse.json({
        success: false,
        error: 'Los campos Tipo, Marca y Fecha de Ingreso son obligatorios.'
      }, { status: 400 })
    }

    // Validar duplicado de serie (excluyendo el equipo actual)
    const serie = extractField('serie')
    if (serie) {
      const { data: existeSerie } = await supabase
        .from('dat_maquinaria')
        .select('tipo, marca')
        .eq('serie', serie)
        .eq('id_empresa', profile.id_empresa)
        .neq('id_maquinaria', id_maquinaria)
        .limit(1)

      if (existeSerie && existeSerie.length > 0) {
        return NextResponse.json({
          success: false,
          error: `Ese número de serie ya pertenece al equipo: ${existeSerie[0].tipo} / ${existeSerie[0].marca}. No puedes duplicarlo.`
        }, { status: 400 })
      }
    }

    // Imagen
    let imagen_url = extractField('imagen_url_actual')
    const file = formData.get('imagen')
    if (file && typeof file !== 'string' && file.size > 0) {
      try {
        const ext = file.name.split('.').pop()
        const filePath = `${profile.id_empresa}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('maquinaria')
          .upload(filePath, file, { contentType: file.type, upsert: false })

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('maquinaria').getPublicUrl(filePath)
          imagen_url = urlData.publicUrl
        }
      } catch (imgError) {
        console.error('Error subiendo imagen en edición:', imgError)
      }
    }

    const payload = {
      id_obra: extractField('id_obra'),
      tipo_unidad: extractField('tipo_unidad'),
      tipo,
      marca,
      modelo: extractField('modelo'),
      anio: extractField('anio') ? parseInt(extractField('anio')) : null,
      color: extractField('color'),
      num_economico: extractField('num_economico') || 'S/N',
      serie,
      placa: extractField('placa'),
      horometro: extractField('horometro') ? parseFloat(extractField('horometro')) : 0,
      horometro_inicial: extractField('horometro_inicial') ? parseFloat(extractField('horometro_inicial')) : 0,
      intervalo_mantenimiento: extractField('intervalo_mantenimiento') ? parseFloat(extractField('intervalo_mantenimiento')) : null,
      fecha_proximo_mantenimiento: extractField('fecha_proximo_mantenimiento'),
      fecha_ingreso_obra,
      actividad: extractField('actividad'),
      frente: extractField('frente'),
      imagen_url
    }

    const { error } = await supabase
      .from('dat_maquinaria')
      .update(payload)
      .eq('id_maquinaria', id_maquinaria)

    if (error) throw error
    return NextResponse.json({ success: true, mensaje: 'Actualizado correctamente' })
  } catch (error) {
    console.error('Error en PUT Maquinaria:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// --- PATCH: Dar de Baja ---
export async function PATCH(request) {
  try {
    const { supabase, profile } = await getSupabaseAndProfile()
    if (!supabase || !profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id_maquinaria, fecha_baja } = await request.json()

    if (!id_maquinaria || !fecha_baja) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const { error } = await supabase
      .from('dat_maquinaria')
      .update({ fecha_baja, activo: false })
      .eq('id_maquinaria', id_maquinaria)

    if (error) throw error
    return NextResponse.json({ success: true, mensaje: 'Equipo dado de baja' })
  } catch (error) {
    console.error('Error en PATCH Maquinaria:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
