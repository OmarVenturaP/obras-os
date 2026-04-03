import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/20">
              O
            </div>
            <span className="text-2xl font-bold tracking-tight text-primary">
              Obras<span className="text-accent">OS</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
              Módulos
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
              Precios
            </Link>
            <Link href="/login" className="px-5 py-2 rounded-lg bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 transition-all">
              Mi Cuenta
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-24 pb-32 text-center relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] -z-10">
          <div className="absolute top-[-100px] left-[10%] w-[35%] h-[300px] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute top-[200px] right-[10%] w-[40%] h-[400px] rounded-full bg-accent/10 blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 border border-yellow-200 text-yellow-800 text-sm font-semibold mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
            </span>
            SaaS de Construcción Multi-tenant
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-primary mb-6 leading-tight">
            Gestión Inteligente de <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-accent">Obras y Salud Ocupacional</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            La plataforma líder para constructoras y subcontratistas. Controla asistencias, informes de seguridad y avance de obra en un solo lugar.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="px-8 py-4 rounded-2xl bg-primary text-white font-bold text-lg shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all">
              Comenzar Ahora
            </Link>
            <Link href="#demo" className="px-8 py-4 rounded-2xl bg-white border border-gray-200 text-gray-700 font-bold text-lg hover:bg-gray-50 transition-all flex items-center gap-2">
              Ver Demo <span className="text-xl">➔</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 text-2xl mb-6">
                🛡️
              </div>
              <h3 className="text-xl font-bold mb-3 text-primary">Informes HSE</h3>
              <p className="text-gray-600">
                Gestión avanzada de seguridad y salud ocupacional con reportes en tiempo real según normativas vigentes.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 bg-yellow-50 rounded-2xl flex items-center justify-center text-yellow-600 text-2xl mb-6">
                📍
              </div>
              <h3 className="text-xl font-bold mb-3 text-primary">Control de Asistencia</h3>
              <p className="text-gray-600">
                Registro de entrada y salida con geolocalización (GPS) y códigos QR dinámicos para cada cuadrilla.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 text-2xl mb-6">
                🏢
              </div>
              <h3 className="text-xl font-bold mb-3 text-primary">Multi-Tenancy</h3>
              <p className="text-gray-600">
                Arquitectura aislada para subcontratistas. Cada empresa gestiona sus propios datos bajo tu supervisión.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-gray-100 text-center">
        <p className="text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} ObrasOS por Recal-HSE. Diseñado para la excelencia en seguridad.
        </p>
      </footer>
    </main>
  )
}
