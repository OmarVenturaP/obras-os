"use client"

import { useState, useEffect } from 'react'
import { 
  Tractor, Users, CalendarDays, ClipboardList, 
  Settings, ShieldCheck, FileBarChart, Clock, Activity, Zap,
  PlusCircle, FileText, ArrowRight, MapPin
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const [reports, setReports] = useState([])
  const [stats, setStats] = useState({ informes: 0, personal: 0 })
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState(null)
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Buenos días')
    else if (hour < 19) setGreeting('Buenas tardes')
    else setGreeting('Buenas noches')

    const fetchDashboardData = async () => {
      setLoading(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: profile } = await supabase
          .from('dat_personal_area')
          .select('nombre, rol, area')
          .eq('auth_user_id', session.user.id)
          .single()
        setUserData(profile)
      }

      // Fetch Reports
      const { data: informes, count: informesCount } = await supabase
        .from('dat_informes_seguridad')
        .select('*', { count: 'exact' })
        .order('fecha_registro', { ascending: false })
        .limit(5)

      const { count: personalCount } = await supabase
        .from('dat_personal_area')
        .select('*', { count: 'exact', head: true })

      if (informes) setReports(informes)
      setStats({
        informes: informesCount || 0,
        personal: personalCount || 0
      })
      
      setLoading(false)
    }

    fetchDashboardData()
  }, [])

  const currentDate = new Date().toLocaleDateString('es-MX', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  })

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* 1. HERO SECTION (Midnight Flow System) */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary via-[#145184]/90 to-blue-900 shadow-xl border border-white/10 p-8 md:p-10">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-md bg-white/5 backdrop-blur-md border border-white/10 text-white/60 text-[10px] font-bold tracking-[0.05em] uppercase">
              <Clock className="w-3 h-3 text-accent" />
              <span>{currentDate}</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              {loading ? '...' : `${greeting},`} <br />
              <span className="text-accent underline decoration-white/10 underline-offset-8">
                {userData?.nombre?.split(' ')[0] || 'User'}
              </span>
            </h1>
            <p className="mt-6 text-white/50 text-sm md:text-base font-medium max-w-lg leading-relaxed">
               Acceso centralizado al ecosistema <span className="text-white font-bold">ObrasOS</span>. Gestión estructural con fluidez digital.
            </p>
          </div>
          
          <div className="flex gap-6 shrink-0">
             <div className="p-5 glass rounded-lg text-center min-w-[100px] border border-white/5">
                <span className="text-2xl font-black text-white block tracking-[0.02em]">{stats.personal}</span>
                <span className="text-[9px] text-white/30 uppercase font-black tracking-widest mt-1">Personal</span>
             </div>
             <div className="p-5 glass rounded-lg text-center min-w-[100px] border border-accent/20 transition-all hover:bg-white/5">
                <span className="text-2xl font-black text-accent block tracking-[0.02em]">{stats.informes}</span>
                <span className="text-[9px] text-accent/40 uppercase font-black tracking-widest mt-1">Registros</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: TABLA (Structural Style) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black tracking-[0.2em] text-muted-foreground uppercase flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Actividad Reciente
            </h2>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#145184]/5 dark:bg-white/5 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.1em]">Reporte / Folio</th>
                  <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.1em]">Estatus</th>
                  <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.1em]">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array(3).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={3} className="px-6 py-5 h-14" />
                    </tr>
                  ))
                ) : reports.length > 0 ? (
                  reports.map((report) => (
                    <tr key={report.id_informe} className="hover:bg-primary/5 dark:hover:bg-white/5 transition-all cursor-pointer group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-primary/10 dark:bg-white/5 flex items-center justify-center text-[10px] font-black text-primary dark:text-accent">
                            {report.num_reporte?.charAt(0) || 'H'}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-xs tracking-[0.02em]">ID-{report.num_reporte}</span>
                            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">{report.mes_anio}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${report.estatus === 'aprobado' ? 'bg-success' : 'bg-alert'}`} />
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{report.estatus}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-[10px] font-bold text-muted-foreground/60 tabular-nums tracking-[0.02em]">
                        {new Date(report.fecha_registro).toLocaleDateString('es-MX')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em] italic">Sin registros</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLUMNA DERECHA: ACCIONES TÉCNICAS */}
        <div className="space-y-4">
           <h2 className="text-[9px] font-black tracking-[0.2em] text-muted-foreground uppercase px-1">Acceso Rápido</h2>
           <div className="grid grid-cols-1 gap-3">
              {[
                { name: 'Gestión Personal', icon: Users, href: '/dashboard/personal' },
                { name: 'Control Asistencia', icon: MapPin, href: '/dashboard/asistencia' },
                { name: 'Configuración', icon: Settings, href: '/dashboard/settings' },
              ].map((mod) => (
                <Link key={mod.name} href={mod.href} className="group block">
                  <div className="p-4 rounded-lg bg-card border border-border hover:border-primary/20 transition-all duration-200 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-md bg-primary/5 dark:bg-white/5 text-primary dark:text-accent flex items-center justify-center transition-transform group-hover:scale-105">
                      <mod.icon className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-xs tracking-tight">{mod.name}</span>
                    <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
           </div>

           <div className="mt-4 p-6 rounded-lg bg-accent text-primary dark:bg-accent dark:text-primary font-black relative overflow-hidden group cursor-pointer transition-transform active:scale-[0.98]">
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest font-black opacity-60">Nuevo Registro</span>
                  <span className="text-sm">Generar Informe HSE</span>
                </div>
                <PlusCircle className="w-6 h-6 transition-transform group-hover:rotate-90 duration-300" />
              </div>
           </div>
        </div>

      </div>
    </div>
  )
}
