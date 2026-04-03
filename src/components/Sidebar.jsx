"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Informes HSE', href: '/dashboard/informes', icon: '🛡️' },
  { name: 'Asistencia', href: '/dashboard/asistencia', icon: '📍' },
  { name: 'Personal', href: '/dashboard/personal', icon: '👥' },
  { name: 'Configuración', href: '/dashboard/settings', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 h-screen sticky top-0 bg-primary text-white flex flex-col shadow-2xl">
      {/* Sidebar Header */}
      <div className="p-8 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-primary font-bold text-lg">
            O
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
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Sidebar Footer (Company Context) */}
      <div className="p-6 border-t border-white/10 bg-black/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border border-white/10">
            <span className="text-xs font-bold">RECAL</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-none mb-1">Recal Construcciones</p>
            <p className="text-[10px] text-white/50 uppercase tracking-wider font-bold">Subcontratista</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
