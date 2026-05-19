import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import path from 'path'

const MESES = {
  1: 'ENERO', 2: 'FEBRERO', 3: 'MARZO', 4: 'ABRIL', 5: 'MAYO', 6: 'JUNIO',
  7: 'JULIO', 8: 'AGOSTO', 9: 'SEPTIEMBRE', 10: 'OCTUBRE', 11: 'NOVIEMBRE', 12: 'DICIEMBRE'
}

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
    const mes = searchParams.get('mes')
    const anio = searchParams.get('anio')
    const tipoUnidad = searchParams.get('tipo_unidad') || 'todos'

    const getTitulo = (tipo) => {
      switch (tipo) {
        case 'maquinaria': return 'MAQUINARIA'
        case 'equipo': return 'EQUIPO'
        case 'herramienta': return 'HERRAMIENTA'
        case 'vehiculo': return 'VEHÍCULOS'
        default: return 'MAQUINARIA Y EQUIPO'
      }
    }

    const tituloUnidad = getTitulo(tipoUnidad)
    const periodoTexto = (mes && anio) ? `PERIODO: ${MESES[parseInt(mes)]} DE ${anio}` : 'PERIODO NO ESPECIFICADO'

    const templatePath = path.join(process.cwd(), 'public', 'plantillas', '11_PROG_UTILIZACION.xlsx')
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(templatePath)
    const worksheet = workbook.getWorksheet(1)

    worksheet.getCell('E2').value = periodoTexto

    // Query con filtros
    let query = supabase
      .from('dat_maquinaria')
      .select('*, cat_obras(nombre_obra)')
      .order('fecha_ingreso_obra', { ascending: false })

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

    if (tipoUnidad !== 'todos') {
      query = query.eq('tipo_unidad', tipoUnidad)
    }

    const { data: rows, error } = await query
    if (error) throw error

    let currentRow = 5
    let index = 1
    const toUpper = (val) => val ? String(val).toUpperCase() : 'N/A'

    for (let i = 0; i < rows.length; i++) {
      const maquina = rows[i]

      if (i > 0) {
        worksheet.spliceRows(currentRow, 0, [])
      }

      const row = worksheet.getRow(currentRow)
      row.height = 157

      row.getCell('A').value = index
      row.getCell('B').value = toUpper(maquina.tipo)
      const marcaModelo = `${maquina.marca || ''} / ${maquina.modelo || ''}`.trim()
      row.getCell('C').value = toUpper(marcaModelo)
      row.getCell('D').value = toUpper(maquina.color)
      row.getCell('E').value = toUpper(maquina.num_economico)

      if (maquina.fecha_ingreso_obra) {
        const date = new Date(maquina.fecha_ingreso_obra)
        const mesStr = date.getUTCMonth() + 1
        row.getCell('F').value = `${MESES[mesStr]} / ${date.getUTCFullYear()}`
      } else {
        row.getCell('F').value = '-'
      }

      row.getCell('G').value = maquina.fecha_baja ? 'INACTIVO' : 'ACTIVO'
      row.getCell('H').value = toUpper(maquina.actividad || 'SIN REGISTRO')
      row.getCell('I').value = toUpper(maquina.frente || 'SIN REGISTRO')

      if (maquina.imagen_url) {
        try {
          const imageResponse = await fetch(maquina.imagen_url)
          const arrayBuffer = await imageResponse.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const imageId = workbook.addImage({ buffer, extension: 'jpeg' })
          worksheet.addImage(imageId, {
            tl: { col: 9.7, row: currentRow - 0.95 },
            ext: { width: 200, height: 200 },
            editAs: 'oneCell'
          })
        } catch (imgError) {
          row.getCell('J').value = 'Error al cargar imagen'
        }
      } else {
        row.getCell('J').value = 'Sin evidencia'
      }

      // Copiar estilos de la fila base
      if (i > 0) {
        const filaBase = worksheet.getRow(5)
        filaBase.eachCell({ includeEmpty: true }, (baseCell, colNumber) => {
          if (colNumber <= 10) {
            row.getCell(colNumber).style = JSON.parse(JSON.stringify(baseCell.style))
            row.getCell(colNumber).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
          }
        })
      } else {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        })
      }

      currentRow++
      index++
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const nombreArchivo = `11. PROGRAMA DE UTILIZACION DE ${tituloUnidad} ${periodoTexto}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    })
  } catch (error) {
    console.error('Error al exportar utilización:', error)
    return NextResponse.json({ success: false, error: 'Error al generar el archivo Excel.' }, { status: 500 })
  }
}
