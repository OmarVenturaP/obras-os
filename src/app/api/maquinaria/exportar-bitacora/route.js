import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import path from 'path'

async function getSupabaseAndProfile() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { get(name) { return cookieStore.get(name)?.value } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase: null, profile: null }

  const { data: profile } = await supabase
    .from('dat_personal_area')
    .select('id_empresa, rol')
    .eq('auth_user_id', user.id)
    .single()

  return { supabase, profile }
}

export async function GET(request) {
  try {
    const { supabase, profile } = await getSupabaseAndProfile()
    if (!supabase || !profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const idMaquinaria = searchParams.get('id_maquinaria')
    const idMantenimiento = searchParams.get('id_mantenimiento')

    if (!idMaquinaria) {
      return NextResponse.json({ error: 'Falta ID de maquinaria' }, { status: 400 })
    }

    // 1. Obtener datos de la maquinaria con relación a obra
    const { data: maqData, error: maqError } = await supabase
      .from('dat_maquinaria')
      .select('*, cat_obras(nombre_obra)')
      .eq('id_maquinaria', idMaquinaria)
      .single()

    if (maqError || !maqData) {
      return NextResponse.json({ error: 'Maquinaria no encontrada.' }, { status: 404 })
    }

    // 2. Obtener datos del mantenimiento si se proporcionó id
    let mantenimiento = null
    if (idMantenimiento) {
      const { data: mttoData } = await supabase
        .from('dat_mantenimiento_maquinaria')
        .select('*')
        .eq('id_mantenimiento', idMantenimiento)
        .single()
      if (mttoData) mantenimiento = mttoData
    }

    // 3. Formatear datos para reemplazo en plantilla
    const formatFecha = (d) => {
      if (!d) return ''
      const date = new Date(d)
      return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`
    }

    const data = {
      num_economico: maqData.num_economico || '',
      tipo: (maqData.tipo || 'N/A').toUpperCase(),
      marca: maqData.marca || '',
      modelo: maqData.modelo || '',
      serie: maqData.serie || '',
      anio: maqData.anio || '',
      placa: maqData.placa || '',
      color: maqData.color || '',
      tipo_unidad: (maqData.tipo_unidad || '').toUpperCase(),
      horometro_actual: maqData.horometro || '0',
      contratista: maqData.cat_obras?.nombre_obra || '',
      proximo_mantenimiento: formatFecha(maqData.fecha_proximo_mantenimiento),
      fecha_ingreso: formatFecha(maqData.fecha_ingreso_obra),
      // Datos del servicio
      fecha_mantenimiento: mantenimiento ? formatFecha(mantenimiento.fecha_mantenimiento) : '',
      tipo_mantenimiento: mantenimiento ? mantenimiento.tipo_mantenimiento : '',
      horometro_mantenimiento: (() => {
        if (!mantenimiento || mantenimiento.horometro_mantenimiento === null) {
          return maqData.tipo_unidad === 'equipo' ? 'N/A' : ''
        }
        const h = mantenimiento.horometro_mantenimiento
        if (maqData.tipo_unidad === 'equipo') return 'N/A'
        if (maqData.tipo_unidad === 'maquinaria') return `${Number(h).toFixed(2)} HRS`
        if (maqData.tipo_unidad === 'vehiculo') return `${Math.round(h)} KM`
        return String(h)
      })(),
      observaciones_mantenimiento: mantenimiento ? (mantenimiento.observaciones || '') : '',
      realizado_por: mantenimiento ? (mantenimiento.realizado_por || '') : '',
      folio_mtto: mantenimiento ? String(mantenimiento.folio_mtto || '').padStart(5, '0') : ''
    }

    // 4. Cargar plantilla Excel y reemplazar tags
    const templatePath = path.join(process.cwd(), 'public', 'plantillas', '12_PLAN_SERVICIO.xlsx')
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(templatePath)

    workbook.eachSheet((worksheet) => {
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          if (cell.value) {
            // Texto plano
            if (typeof cell.value === 'string') {
              let text = cell.value
              Object.keys(data).forEach(key => {
                const tag = `{${key}}`
                if (text.includes(tag)) {
                  text = text.split(tag).join(data[key])
                }
              })
              cell.value = text
            }
            // Rich Text
            else if (cell.value.richText) {
              cell.value.richText.forEach(rt => {
                if (rt.text) {
                  Object.keys(data).forEach(key => {
                    const tag = `{${key}}`
                    if (rt.text.includes(tag)) {
                      rt.text = rt.text.split(tag).join(data[key])
                    }
                  })
                }
              })
              cell.value = { richText: cell.value.richText }
            }
          }
        })
      })
    })

    const outputBuffer = await workbook.xlsx.writeBuffer()

    return new Response(outputBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Bitacora_${maqData.num_economico || 'equipo'}_${Date.now()}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Error exportando bitácora:', error)
    return NextResponse.json({ error: 'Error interno al generar documento' }, { status: 500 })
  }
}
