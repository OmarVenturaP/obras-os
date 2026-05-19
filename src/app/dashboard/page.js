"use client"

import { useState, useEffect, useMemo } from 'react'
import { 
  Tractor, Users, CalendarDays, ClipboardList, 
  Settings, ShieldCheck, FileBarChart, Clock, Activity, Zap,
  PlusCircle, FileText, ArrowRight, MapPin, Building, Briefcase, Wrench, AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  // --- ESTADOS DE DATOS ---
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState(null)
  const [greeting, setGreeting] = useState('')
  const [activeTab, setActiveTab] = useState('obras') // obras, maquinaria, personal

  // --- CONTADORES Y LISTADOS ---
  const [obras, setObras] = useState([])
  const [maquinaria, setMaquinaria] = useState([])
  const [workersCount, setWorkersCount] = useState(0)
  const [reports, setReports] = useState([])
  const [stats, setStats] = useState({
    obrasActivas: 0,
    personalTotal: 0,
    maquinariaTotal: 0,
    maquinariaVencida: 0,
    informesHSE: 0
  })

  useEffect(() => {
    // Definir saludo
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Buenos días')
    else if (hour < 19) setGreeting('Buenas tardes')
    else setGreeting('Buenas noches')

    const fetchDashboardData = async () => {
      setLoading(true)
      try {
        // 1. Obtener sesión y perfil
        const { data: { session } } = await supabase.auth.getSession()
        let idEmpresa = null
        if (session) {
          const { data: profile } = await supabase
            .from('dat_personal_area')
            .select('nombre, rol, area, id_empresa, cat_empresas(nombre_comercial)')
            .eq('auth_user_id', session.user.id)
            .single()
          setUserData(profile)
          if (profile) idEmpresa = profile.id_empresa
        }

        // 2. Obtener Obras Activas de la empresa
        const { data: activeObras } = await supabase
          .from('cat_obras')
          .select('*')
          .eq('activa', true)
          .order('fecha_registro', { ascending: false })

        if (activeObras) setObras(activeObras)

        // 3. Obtener Maquinaria
        const { data: listMaq } = await supabase
          .from('dat_maquinaria')
          .select('*, cat_obras(nombre_obra)')
          .is('fecha_baja', null)
          .order('fecha_registro', { ascending: false })

        if (listMaq) {
          setMaquinaria(listMaq)
        }

        // 4. Obtener Fuerza de Trabajo (Personal activo)
        const { count: activeWorkers } = await supabase
          .from('dat_fuerza_trabajo')
          .select('*', { count: 'exact', head: true })
          .eq('activo', true)

        setWorkersCount(activeWorkers || 0)

        // 5. Obtener últimos Informes HSE
        const { data: listReports, count: totalReports } = await supabase
          .from('dat_informes_seguridad')
          .select('*', { count: 'exact' })
          .order('fecha_registro', { ascending: false })
          .limit(5)

        if (listReports) setReports(listReports)

        // 6. Calcular métricas consolidadas de maquinaria
        let vencidosCount = 0
        if (listMaq) {
          // Obtener el último mantenimiento de cada maquinaria para calcular si está vencido
          const ids = listMaq.map(m => m.id_maquinaria)
          if (ids.length > 0) {
            const { data: mttoData } = await supabase
              .from('dat_mantenimiento_maquinaria')
              .select('id_maquinaria, horometro_mantenimiento')
              .in('id_maquinaria', ids)
              .order('fecha_mantenimiento', { ascending: false })

            const mttoMap = {}
            if (mttoData) {
              mttoData.forEach(m => {
                if (!mttoMap[m.id_maquinaria]) mttoMap[m.id_maquinaria] = m
              })
            }

            listMaq.forEach(m => {
              if (m.intervalo_mantenimiento) {
                const horometroActual = m.horometro || 0
                const horometroBase = mttoMap[m.id_maquinaria]?.horometro_mantenimiento || 0
                const horasUsadas = horometroActual - horometroBase
                const restantes = m.intervalo_mantenimiento - horasUsadas
                if (restantes <= 0) vencidosCount++
              }
            })
          }
        }

        setStats({
          obrasActivas: activeObras?.length || 0,
          personalTotal: activeWorkers || 0,
          maquinariaTotal: listMaq?.length || 0,
          maquinariaVencida: vencidosCount,
          informesHSE: totalReports || 0
        })

      } catch (err) {
        console.error('Error al cargar datos del panel central:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const currentDate = new Date().toLocaleDateString('es-MX', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  })

  // Agrupación de Maquinaria por Estado
  const maqEstadoResumen = useMemo(() => {
    if (!maquinaria.length) return { optima: 0, proxima: 0, vencida: 0 }
    let optima = 0
    let proxima = 0
    let vencida = stats.maquinariaVencida

    optima = maquinaria.length - vencida
    return { optima, vencida }
  }, [maquinaria, stats.maquinariaVencida])

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-36">
      
      {/* ── 1. HERO EXECUTIVE BOARD (Midnight Flow) ── */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary via-[#145184]/95 to-blue-950 shadow-xl border border-white/10 p-8 md:p-10">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-md bg-white/5 backdrop-blur-md border border-white/10 text-white/70 text-[10px] font-black tracking-[0.05em] uppercase">
              <Clock className="w-3.5 h-3.5 text-accent" />
              <span>{currentDate}</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none uppercase">
              {loading ? 'Cargando...' : `${greeting},`} <br />
              <span className="text-accent underline decoration-white/10 underline-offset-8">
                {userData?.nombre?.split(' ')[0] || 'Encargado'}
              </span>
            </h1>
            <p className="mt-6 text-white/60 text-xs md:text-sm font-medium max-w-lg leading-relaxed">
              Consola Ejecutiva de <span className="text-white font-bold">{userData?.cat_empresas?.nombre_comercial || 'ObrasOS'}</span>. Visualiza el estado operativo, proyectos activos, fuerza de trabajo y control integral de maquinaria.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 gap-4 shrink-0 w-full lg:w-auto">
             <div className="p-5 glass rounded-lg text-center border border-white/5 hover:border-white/10 transition-all">
                <span className="text-3xl font-black text-white block tabular-nums">{stats.obrasActivas}</span>
                <span className="text-[8px] text-white/40 uppercase font-black tracking-widest mt-1 block">Obras Activas</span>
             </div>
             <div className="p-5 glass rounded-lg text-center border border-white/5 hover:border-white/10 transition-all">
                <span className="text-3xl font-black text-white block tabular-nums">{stats.personalTotal}</span>
                <span className="text-[8px] text-white/40 uppercase font-black tracking-widest mt-1 block">Personal Activo</span>
             </div>
             <div className="p-5 glass rounded-lg text-center border border-white/5 hover:border-accent/20 transition-all">
                <span className="text-3xl font-black text-accent block tabular-nums">{stats.maquinariaTotal}</span>
                <span className="text-[8px] text-accent/50 uppercase font-black tracking-widest mt-1 block">Unidades Maq</span>
             </div>
             <div className={`p-5 glass rounded-lg text-center border transition-all ${stats.maquinariaVencida > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-white/5'}`}>
                <span className={`text-3xl font-black block tabular-nums ${stats.maquinariaVencida > 0 ? 'text-red-400 animate-pulse' : 'text-white'}`}>{stats.maquinariaVencida}</span>
                <span className={`text-[8px] uppercase font-black tracking-widest mt-1 block ${stats.maquinariaVencida > 0 ? 'text-red-400/80' : 'text-white/40'}`}>Mtto Vencido</span>
             </div>
          </div>
        </div>
      </div>

      {/* ── 2. SECCIÓN PRINCIPAL GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: PANELES DYNAMICS (2/3 ancho) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TABS DE SELECCIÓN DE DATOS */}
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex gap-4">
              {[
                { id: 'obras', label: 'Proyectos Activos', icon: Building, count: stats.obrasActivas },
                { id: 'maquinaria', label: 'Estado de Equipos', icon: Tractor, count: stats.maquinariaTotal },
                { id: 'personal', label: 'Personal por Obra', icon: Users, count: stats.personalTotal }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 pb-2.5 px-1 border-b-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === tab.id 
                      ? 'border-accent text-primary dark:text-accent font-black' 
                      : 'border-transparent text-muted-foreground hover:text-foreground font-bold'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-muted text-[9px] font-bold tabular-nums text-muted-foreground">{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* CONTENIDO DINO DE TABS */}
          <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
            
            {/* TAB OBRAS */}
            {activeTab === 'obras' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#145184]/5 dark:bg-white/5 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Obra / Proyecto</th>
                      <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Ubicación</th>
                      <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Descripción</th>
                      <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">Registro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      Array(3).fill(0).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={4} className="px-6 py-6"><div className="h-4 bg-muted rounded w-full" /></td>
                        </tr>
                      ))
                    ) : obras.length > 0 ? (
                      obras.map((obra) => (
                        <tr key={obra.id_obra} className="hover:bg-primary/[0.02] dark:hover:bg-white/[0.01] transition-all">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-primary/10 dark:bg-white/5 flex items-center justify-center text-primary dark:text-accent">
                                <Building className="w-4 h-4" />
                              </div>
                              <span className="font-black text-foreground uppercase tracking-tight">{obra.nombre_obra}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-muted-foreground uppercase">{obra.ubicacion || 'No especificada'}</td>
                          <td className="px-6 py-4 text-muted-foreground max-w-[200px] truncate">{obra.descripcion || 'Sin descripción'}</td>
                          <td className="px-6 py-4 text-center tabular-nums font-bold text-muted-foreground/60">
                            {new Date(obra.fecha_registro).toLocaleDateString('es-MX')}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic font-bold uppercase tracking-widest">
                          No hay proyectos registrados activos en este momento.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB MAQUINARIA */}
            {activeTab === 'maquinaria' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#145184]/5 dark:bg-white/5 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Unidad / Económico</th>
                      <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Clasificación</th>
                      <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Proyecto</th>
                      <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Lectura Actual</th>
                      <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      Array(3).fill(0).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={5} className="px-6 py-6"><div className="h-4 bg-muted rounded w-full" /></td>
                        </tr>
                      ))
                    ) : maquinaria.length > 0 ? (
                      maquinaria.map((maq) => (
                        <tr key={maq.id_maquinaria} className="hover:bg-primary/[0.02] dark:hover:bg-white/[0.01] transition-all">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-black text-foreground uppercase tracking-tight">{maq.tipo}</span>
                              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Econ: {maq.num_economico || 'S/N'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[8px] font-black uppercase">
                              {maq.tipo_unidad}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-primary/80 dark:text-accent/80 uppercase">
                            {maq.cat_obras?.nombre_obra || 'SIN ASIGNAR'}
                          </td>
                          <td className="px-6 py-4 font-black tabular-nums">
                            {maq.horometro !== null ? Number(maq.horometro).toFixed(1) : '0.0'}{' '}
                            <span className="text-[9px] text-muted-foreground">{maq.tipo_unidad === 'vehiculo' ? 'KM' : 'HRS'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 inline-flex text-[9px] font-black rounded border ${
                              maq.fecha_proximo_mantenimiento 
                                ? 'bg-green-500/10 border-green-500/30 text-green-500'
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                            }`}>
                              {maq.fecha_proximo_mantenimiento ? 'PROGRAMADO' : 'PENDIENTE MTTO'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic font-bold uppercase tracking-widest">
                          Sin maquinaria en operación registrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB PERSONAL */}
            {activeTab === 'personal' && (
              <div className="p-8 text-center space-y-4">
                <Users className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                <div>
                  <h4 className="text-sm font-black uppercase text-foreground">Fuerza de Trabajo en Obra</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Hay un total de <span className="text-primary dark:text-accent font-black">{stats.personalTotal} trabajadores activos</span>. Accede al módulo central para auditar NSS, CURP, firmas y contratos por obra.
                  </p>
                </div>
                <Link href="/dashboard/personal" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded text-xs font-black uppercase tracking-widest hover:scale-102 transition-all">
                  <span>Ir a Gestión Personal</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

          </div>

        </div>

        {/* COLUMNA DERECHA: ACCIONES TÉCNICAS Y MONITOREO (1/3 ancho) */}
        <div className="space-y-6">
           
           {/* ACCESO RÁPIDO EJECUTIVO */}
           <div>
              <h2 className="text-[9px] font-black tracking-[0.2em] text-muted-foreground uppercase px-1 mb-3">Accesos Estructurales</h2>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { name: 'Gestión Personal', icon: Users, desc: 'Fuerza de trabajo, NSS, CURP y contratos', href: '/dashboard/personal', color: 'text-indigo-400 bg-indigo-500/5' },
                  { name: 'Control Maquinaria', icon: Tractor, desc: 'Bitácoras de mtto, horómetros y utilización', href: '/dashboard/maquinaria', color: 'text-accent bg-accent/5' },
                  { name: 'Control Asistencia', icon: MapPin, desc: 'Registros en vivo, kioskos y terminales', href: '/dashboard/asistencia', color: 'text-green-400 bg-green-500/5' },
                  { name: 'Configuración de Empresa', icon: Settings, desc: 'Límites de plan, usuarios y catálogos', href: '/dashboard/settings', color: 'text-gray-400 bg-gray-500/5' },
                ].map((mod) => (
                  <Link key={mod.name} href={mod.href} className="group block">
                    <div className="p-4 rounded-lg bg-card border border-border hover:border-primary/20 transition-all duration-200 flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${mod.color}`}>
                        <mod.icon className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-xs tracking-tight text-foreground">{mod.name}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{mod.desc}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1 self-center" />
                    </div>
                  </Link>
                ))}
              </div>
           </div>

           {/* ÚLTIMOS INFORMES HSE */}
           <div className="space-y-3">
             <h2 className="text-[9px] font-black tracking-[0.2em] text-muted-foreground uppercase px-1">Últimos Informes HSE</h2>
             <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
               <div className="divide-y divide-border">
                 {loading ? (
                   Array(3).fill(0).map((_, i) => (
                     <div key={i} className="p-4 animate-pulse"><div className="h-4 bg-muted rounded w-3/4" /></div>
                   ))
                 ) : reports.length > 0 ? (
                   reports.map((report) => (
                     <div key={report.id_informe} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-all">
                       <div className="flex items-center gap-3">
                         <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary dark:text-accent">
                           {report.num_reporte?.charAt(0) || 'H'}
                         </div>
                         <div className="flex flex-col">
                           <span className="font-bold text-xs">ID-{report.num_reporte}</span>
                           <span className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">{report.mes_anio}</span>
                         </div>
                       </div>
                       <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                         report.estatus === 'aprobado' 
                           ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                           : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                       }`}>
                         {report.estatus}
                       </span>
                     </div>
                   ))
                 ) : (
                   <div className="p-8 text-center text-xs font-bold text-muted-foreground italic">Sin informes recientes</div>
                 )}
               </div>
             </div>
           </div>

        </div>

      </div>
    </div>
  )
}
