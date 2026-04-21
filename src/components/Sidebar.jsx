"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getLimit } from '@/lib/planLimits'

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Informes HSE', href: '/dashboard/informes', icon: '🛡️' },
  { name: 'Asistencia', href: '/dashboard/asistencia', icon: '📍' },
  { name: 'Personal', href: '/dashboard/personal', icon: '👥' },
  { name: 'Configuración', href: '/dashboard/settings', icon: '⚙️' },
]

export default function Sidebar({ enterprise }) {
  const pathname = usePathname()
  const [activeCount, setActiveCount] = useState(0)
  const plan = enterprise?.plan_suscripcion || 'free'
  const maxEmployees = getLimit(plan, 'maxEmployees')

  useEffect(() => {
    if (!enterprise?.id_empresa) return

    const fetchCounts = async () => {
      const { count } = await supabase
        .from('dat_fuerza_trabajo')
        .select('*', { count: 'exact', head: true })
        .eq('id_empresa', enterprise.id_empresa)
        .eq('activo', true)
      
      setActiveCount(count || 0)
    }

    fetchCounts()
    
    // Opcional: Escuchar cambios en tiempo real
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dat_fuerza_trabajo' }, () => {
        fetchCounts()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [enterprise?.id_empresa])

  const usagePercent = Math.min((activeCount / maxEmployees) * 100, 100)
  const isLimitNear = usagePercent > 80

  return (
    <aside className="w-64 h-screen sticky top-0 bg-primary text-white flex flex-col shadow-2xl transition-all duration-300">
      {/* Sidebar Header */}
      <div className="p-8 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-primary font-bold text-lg shadow-lg shadow-accent/20">
            {enterprise?.nombre_comercial?.substring(0, 1) || 'O'}
          </div>
          <span className="text-xl font-bold tracking-tight">
            Obras<span className="text-accent">OS</span>
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 mt-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-white/15 text-accent shadow-lg shadow-black/10' 
                  : 'hover:bg-white/5 text-white/70 hover:text-white'
              }`}
            >
              <span className={`text-xl transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
              <span className="font-medium tracking-wide">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Sidebar Footer (Company Context) */}
      <div className="p-6 border-t border-white/10 bg-black/5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden border border-white/20 shadow-inner group">
            {enterprise?.logo_url ? (
              <img src={enterprise.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-black text-accent">
                {enterprise?.nombre_comercial?.substring(0, 3).toUpperCase() || 'SYS'}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate leading-none mb-1 text-white">
              {enterprise?.nombre_comercial || 'Cargando Empresa...'}
            </p>
            <div className="flex items-center justify-between gap-2 mb-1.5">
               <p className="text-[9px] text-accent uppercase tracking-widest font-black">
                 Plan {plan}
               </p>
               <span className="text-[8px] text-white/40 font-bold tabular-nums">
                 {activeCount}/{maxEmployees === Infinity ? '∞' : maxEmployees}
               </span>
            </div>
            
            {maxEmployees !== Infinity && (
               <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                 <div 
                   className={`h-full transition-all duration-1000 ${isLimitNear ? 'bg-orange-500' : 'bg-accent'}`}
                   style={{ width: `${usagePercent}%` }} 
                 />
               </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
