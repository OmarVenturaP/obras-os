import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

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
  if (!user) return new Response('No autorizado', { status: 401 })

  const { searchParams } = new URL(request.url)
  const subcontratista = searchParams.get('subcontratista')
  
  let query = supabase
    .from('dat_fuerza_trabajo')
    .select('*, cat_subcontratistas(razon_social)')
    .order('apellido_paterno', { ascending: true })

  if (subcontratista && subcontratista !== 'all') {
    query = query.eq('id_subcontratista', subcontratista)
  }

  const { data, error } = await query
  if (error) return new Response(error.message, { status: 500 })

  const excelData = data.map(w => ({
    'No. Empleado': w.numero_empleado || 'S/N',
    'Nombre(s)': w.nombre,
    'Apellido Paterno': w.apellido_paterno || '',
    'Apellido Materno': w.apellido_materno || '',
    'Nombre Completo': w.nombre_completo,
    'NSS': w.nss || '',
    'CURP': w.curp || '',
    'Puesto / Categoría': w.puesto || '',
    'Contratista': w.cat_subcontratistas?.razon_social || 'PERSONAL INTERNO',
    'Fecha Ingreso': w.fecha_ingreso_obra || '',
    'Estatus': w.activo ? 'ACTIVO' : 'BAJA',
    'Fecha Baja': w.fecha_baja || '',
    'Motivo Baja': w.motivo_baja || ''
  }))

  const worksheet = XLSX.utils.json_to_sheet(excelData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Fuerza de Trabajo')
  
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Disposition': `attachment; filename="Fuerza_Trabajo_ObrasOS_${new Date().toISOString().split('T')[0]}.xlsx"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  })
}
