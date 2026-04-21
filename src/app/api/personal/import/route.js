import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getLimit } from '@/lib/planLimits'

export async function POST(request) {
  console.log(">>>>>>>> PETICION RECIBIDA EN /api/personal/import <<<<<<<<")
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
  console.log("Supabase Client Inicializado.")

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log("Error: Usuario no autenticado.")
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  console.log("Usuario autenticado:", user.id)

  const { data: profile } = await supabase
    .from('dat_personal_area')
    .select('id_empresa, cat_empresas(plan_suscripcion)')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) {
    console.log("Error: Perfil no encontrado.")
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }
  
  const plan = profile.cat_empresas?.plan_suscripcion || 'free'
  const maxEmployees = getLimit(plan, 'maxEmployees')
  console.log(`Plan detectado: ${plan}, Límite: ${maxEmployees}`)

  const formData = await request.formData()
  const file = formData.get('file')
  console.log("FormData recibido con archivo:", file?.name)
  
  if (!file) return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 })

  try {
    const bytes = await file.arrayBuffer()
    console.log("Bytes leídos:", bytes.byteLength)
    
    // Usar Uint8Array para mayor compatibilidad en Node 22+ y Turbopack
    const workbook = XLSX.read(new Uint8Array(bytes), { type: 'array' })
    console.log("XLSX parsed correctamente.")
    
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    if (!worksheet) {
      console.log("Error: No se encontró la hoja en el libro.")
      throw new Error("El archivo Excel no contiene una hoja válida.")
    }

    // Verificación de rango (para evitar cuelgues con archivos "glitcheados" de Excel)
    const originalRange = worksheet['!ref'] || 'A1:Z1000'
    console.log(`Rango original detectado: ${originalRange}`)
    
    // Si el Excel tiene un rango absurdo (como A1:XFD1048576), lo limitamos para seguridad
    let parseRange = originalRange
    try {
        const decoded = XLSX.utils.decode_range(originalRange)
        if (decoded.e.r > 1000) {
            console.log("Advertencia: El rango reportado es demasiado grande. Limitando a 1000 filas por seguridad.")
            parseRange = { s: { r: 0, c: 0 }, e: { r: 1000, c: 30 } }
        }
    } catch (e) { parseRange = { s: { r: 0, c: 0 }, e: { r: 1000, c: 30 } } }

    // Convertir a JSON empezando desde la fila 5 (recal-hse style)
    console.log("Iniciando conversión a JSON...")
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, 
      defval: null,
      range: parseRange
    })
    console.log(`Excel convertido: ${rawData.length} filas procesadas.`)
    
    const workersToInsert = []
    let emptyCount = 0

    for (let i = 4; i < rawData.length; i++) {
      const row = rawData[i]
      
      // Si llegamos a 10 filas completamente vacías consecutivas, asumimos fin de archivo
      if (!row || row.length === 0 || !row[1]) {
        emptyCount++
        if (emptyCount > 10) break
        continue
      }
      
      emptyCount = 0 // Reset si encontramos datos

      const nombreCompleto = String(row[1] || '').trim()
      const puesto = String(row[2] || '').trim()
      const nss = String(row[3] || '').replace(/\D/g, '').substring(0, 11)
      
      // Función robusta para fechas (números de Excel o strings DD/MM/YYYY)
      const parseExcelDate = (val) => {
        if (!val) return null
        
        // Caso 1: Número de serie de Excel
        if (typeof val === 'number') {
            try {
               return new Date((val - 25569) * 86400000).toISOString().split('T')[0]
            } catch (e) { return null }
        }
        
        // Caso 2: String tipo DD/MM/YYYY o DD-MM-YYYY
        if (typeof val === 'string' && (val.includes('/') || val.includes('-'))) {
            const separator = val.includes('/') ? '/' : '-'
            const parts = val.split(separator)
            if (parts.length === 3) {
                const day = parts[0].padStart(2, '0')
                const month = parts[1].padStart(2, '0')
                const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2]
                // Validar si el primer bloque es el año (YYYY-MM-DD)
                if (parts[0].length === 4) return `${parts[0]}-${month}-${day}` // Ya está en formato SQL
                return `${year}-${month}-${day}` // Convertir de DD/MM/YYYY a YYYY-MM-DD
            }
        }
        
        return val
      }

      const fechaIngreso = parseExcelDate(row[5])
      const fechaAlta = parseExcelDate(row[6])
      
      const esForaneo = String(row[9] || '').toUpperCase() === 'X'
      const origen = esForaneo ? 'Foráneo' : 'Local'

      workersToInsert.push({
        id_empresa: profile.id_empresa,
        nombre: nombreCompleto,
        puesto: puesto,
        nss: nss,
        fecha_ingreso_obra: fechaIngreso,
        fecha_alta_imss: fechaAlta,
        activo: true,
        creado_por: user.id
      })
    }

    console.log(`Filas válidas mapeadas: ${workersToInsert.length}`)

    if (workersToInsert.length === 0) return NextResponse.json({ error: 'No se encontraron trabajadores válidos en el archivo' }, { status: 400 })

    // >>> CANDADO DE PLAN <<<
    const { count: currentWorkersCount } = await supabase
      .from('dat_fuerza_trabajo')
      .select('*', { count: 'exact', head: true })
      .eq('id_empresa', profile.id_empresa)
      .eq('activo', true)

    if (currentWorkersCount + workersToInsert.length > maxEmployees) {
      return NextResponse.json({ 
        error: `Límite de plan excedido. Tu plan ${plan.toUpperCase()} permite hasta ${maxEmployees} empleados activos. Actualmente tienes ${currentWorkersCount}.`,
        code: 'PLAN_LIMIT_REACHED'
      }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('dat_fuerza_trabajo')
      .insert(workersToInsert)
      .select()

    if (error) {
       console.error('Error DB Insert:', error)
       throw error
    }

    return NextResponse.json({ success: true, count: data.length })
  } catch (error) {
    console.error('Error importación FT:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
