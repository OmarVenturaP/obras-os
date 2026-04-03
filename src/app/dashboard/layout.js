import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }) {
  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-x-hidden">
        {/* Header (Top Nav) */}
        <header className="h-16 bg-white border-b border-border sticky top-0 z-40 px-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-primary">Panel de Control</h1>
            <span className="w-1 h-1 bg-border rounded-full" />
            <p className="text-sm text-muted-foreground font-medium">Resumen General</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group">
              <button className="relative p-2 text-gray-400 hover:text-primary transition-colors hover:bg-gray-50 rounded-xl">
                🔔 <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-white" />
              </button>
            </div>
            
            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <span className="text-sm font-semibold">Omar Ventura</span>
              <div className="w-9 h-9 rounded-full bg-accent text-primary font-bold text-xs flex items-center justify-center border-2 border-primary/5">
                OV
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <section className="p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </section>
      </main>
    </div>
  )
}
