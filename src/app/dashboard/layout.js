"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BotonTema from '@/components/BotonTema'
import { 
  LayoutDashboard, Users, ClipboardList, 
  MapPin, Settings, ShieldCheck, LogOut, Menu, X, FileBarChart,
  ChevronLeft, ChevronRight, Bell
} from 'lucide-react'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authorized, setAuthorized] = useState(false)
  const [userData, setUserData] = useState(null)
  const [enterprise, setEnterprise] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  // Handlers
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const closeSidebar = () => setIsSidebarOpen(false)
  const toggleCollapse = () => {
    const next = !isCollapsed
    setIsCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  useEffect(() => {
    setHasMounted(true)
    const savedCollapsed = localStorage.getItem('sidebar-collapsed')
    if (savedCollapsed !== null) {
      setIsCollapsed(savedCollapsed === 'true')
    }

    const fetchUserData = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('dat_personal_area')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .single()

      if (profile) {
        const { data: company } = await supabase
          .from('cat_empresas')
          .select('*')
          .eq('id_empresa', profile.id_empresa)
          .single()

        setEnterprise(company)
        setUserData(profile)
      }
      
      setAuthorized(true)
    }
    
    fetchUserData()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push('/login')
    })

    return () => {
      if (subscription) subscription.unsubscribe()
    }
  }, [router])

  if (!authorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  const NavItem = ({ href, icon: Icon, label, isPurple = false }) => {
    const isActive = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
    
    return (
      <div className="relative group/nav">
        <Link 
          href={href}
          onClick={closeSidebar}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative
            ${isCollapsed ? 'md:px-0 md:justify-center' : ''}
            ${isActive 
              ? (isPurple 
                  ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30' 
                  : 'bg-white/10 text-white border border-white/20 shadow-sm')
              : 'text-blue-100/70 hover:text-white border border-transparent hover:bg-white/5'
            }
          `}
        >
          <Icon className={`w-5 h-5 relative z-10 transition-transform duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`} />
          
          <span className={`font-semibold relative z-10 tracking-wide text-xs whitespace-nowrap overflow-hidden transition-all duration-200 ${isCollapsed ? 'md:w-0 md:opacity-0' : 'w-auto opacity-100'}`}>
            {label}
          </span>
          
          {isActive && (
            <div className={`absolute top-1/2 -translate-y-1/2 w-1 h-1 bg-accent rounded-full shadow-[0_0_8px_rgba(255,215,0,0.8)] ${isCollapsed ? 'right-1' : 'right-4'}`} />
          )}
        </Link>

        {isCollapsed && (
          <div className="hidden md:block absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[100] bg-primary border border-white/5 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-2xl whitespace-nowrap opacity-0 group-hover/nav:opacity-100 transition-opacity">
            {label}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background relative overflow-hidden font-sans transition-colors duration-500 text-foreground selection:bg-accent/30">
      
      {/* Overlay clickeable móvil */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 md:hidden transition-opacity" onClick={closeSidebar} />
      )}

      {/* SIDEBAR - MIDNIGHT FLOW */}
      <aside
        style={hasMounted ? { width: isSidebarOpen || !isCollapsed ? '260px' : '72px' } : { width: '260px' }}
        className={`
          fixed inset-y-0 left-0 z-50 shrink-0
          bg-[#132b43] dark:bg-[#0d1b2a]/60 dark:backdrop-blur-2xl
          text-white flex flex-col shadow-2xl border-r border-white/5
          transition-all duration-200 ease-out
          md:relative
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Branding */}
        <div className={`flex items-center relative z-10 p-6 transition-all ${isCollapsed ? 'md:justify-center md:px-2' : ''}`}>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-primary font-black text-lg shadow-lg">
                {enterprise?.nombre_comercial?.substring(0, 1) || 'O'}
             </div>
             {!isCollapsed && (
               <div className="flex flex-col leading-none">
                 <span className="font-black text-sm tracking-tight">ObrasOS</span>
                 <span className="text-[9px] font-bold text-accent/80 uppercase tracking-tighter">Multi-tenant Base</span>
               </div>
             )}
          </div>
          {isSidebarOpen && (
            <button onClick={closeSidebar} className="ml-auto md:hidden text-white/50 hover:text-white p-2">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {/* NAV */}
        <nav className={`flex-1 py-4 space-y-1 overflow-y-auto w-full relative z-10 px-4 transition-all duration-200 ${isCollapsed ? 'md:px-2' : ''}`}>
          <div className={`flex mb-8 ${isCollapsed ? 'justify-center px-0' : 'justify-end pr-2'}`}>
            <BotonTema />
          </div>
          
          <NavItem href="/dashboard" icon={LayoutDashboard} label="Resumen Central" />
          <NavItem href="/dashboard/informes" icon={FileBarChart} label="Informes HSE" />
          <NavItem href="/dashboard/asistencia" icon={MapPin} label="Control Asistencia" />
          <NavItem href="/dashboard/personal" icon={Users} label="Gestión Personal" />
          <NavItem href="/dashboard/settings" icon={Settings} label="Configuración" />

          {userData?.rol === 'Master' || userData?.rol === 'Admin' && (
             <div className={`pt-6 mt-6 border-t border-white/5 ${isCollapsed ? 'border-t-0 pt-2 mt-2' : ''}`}>
               {!isCollapsed && (
                 <span className="px-4 text-[9px] font-black tracking-widest text-white/30 uppercase mb-3 block">Administración</span>
               )}
               <NavItem href="/dashboard/usuarios" icon={ShieldCheck} label="Control Accesos" isPurple={true} />
             </div>
          )}
        </nav>

        {/* Footer info */}
        <div className={`border-t border-white/5 bg-black/10 transition-all duration-200 p-4 ${isCollapsed ? 'md:p-3' : ''}`}>
          <div className={`flex items-center gap-3 px-2 ${isCollapsed ? 'md:hidden' : ''}`}>
             <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 text-accent font-black text-xs uppercase">
               {userData?.nombre?.substring(0, 1) || 'U'}
             </div>
             <div className="flex flex-col overflow-hidden">
               <span className="text-xs font-bold text-white truncate">{userData?.nombre || 'Usuario'}</span>
               <span className="text-[9px] text-white/30 truncate uppercase font-bold tracking-tighter">{enterprise?.nombre_comercial}</span>
             </div>
          </div>
          {isCollapsed && (
            <div className="hidden md:flex justify-center">
              <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 text-accent font-black text-sm uppercase">
                {userData?.nombre?.substring(0, 1) || 'U'}
              </div>
            </div>
          )}
        </div>

        {/* Collapse Toggle (Desktop) */}
        <button
          onClick={toggleCollapse}
          className="hidden md:flex absolute -right-3 top-20 w-6 h-6 rounded-md bg-accent text-primary items-center justify-center shadow-lg hover:scale-105 transition-transform z-[60]"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col w-full min-w-0 transition-all duration-200">
        <header className="bg-[#1e4063]/90 dark:bg-[#0d1b2a]/60 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
          <div className="flex justify-between items-center px-4 md:px-8 py-3">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-accent">
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex flex-col">
                <h1 className="text-sm md:text-base font-black tracking-tight text-white uppercase">
                  {userData ? `¡Hola, ${userData.nombre.split(' ')[0]}!` : 'Cargando...'}
                </h1>
                <span className="hidden md:block text-[9px] font-bold text-white/50 uppercase tracking-widest">{userData?.area || 'Centro de Operaciones'}</span>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="group flex items-center gap-2 text-[10px] font-black text-red-400 hover:text-white border border-red-500/20 hover:bg-red-500 px-4 py-2 rounded-lg transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation (Midnight Flow Simulation) */}
        <nav className="md:hidden glass fixed bottom-4 left-4 right-4 h-16 rounded-2xl z-50 flex items-center justify-around px-6 shadow-2xl border border-white/10 dark:bg-black/20">
           <Link href="/dashboard" className="p-2 relative">
             <LayoutDashboard className={`w-5 h-5 ${pathname === '/dashboard' ? 'text-accent' : 'text-blue-100/40'}`} />
             {pathname === '/dashboard' && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-accent rounded-full" />}
           </Link>
           <Link href="/dashboard/informes" className="p-2 relative">
             <FileBarChart className={`w-5 h-5 ${pathname.startsWith('/dashboard/informes') ? 'text-accent' : 'text-blue-100/40'}`} />
             {pathname.startsWith('/dashboard/informes') && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-accent rounded-full" />}
           </Link>
           <Link href="/dashboard/asistencia" className="p-2 relative">
             <MapPin className={`w-5 h-5 ${pathname.startsWith('/dashboard/asistencia') ? 'text-accent' : 'text-blue-100/40'}`} />
             {pathname.startsWith('/dashboard/asistencia') && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-accent rounded-full" />}
           </Link>
           <button onClick={handleLogout} className="p-2">
             <LogOut className="w-5 h-5 text-red-500/50" />
           </button>
        </nav>
      </div>
    </div>
  )
}
