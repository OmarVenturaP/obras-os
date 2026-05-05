"use client"

import { BarChart3, Users, Map, DollarSign, HardHat, TrendingUp } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <div className="flex-1 flex flex-col lg:flex-row">
        
        {/* Lado Izquierdo - Contenido */}
        <div className="w-full lg:w-1/2 p-6 sm:p-10 md:p-16 lg:p-24 flex flex-col justify-center relative z-10 bg-white">
          
          {/* Logo */}
          <div className="mb-10 md:mb-16">
            <img 
              src="/logo.png" 
              alt="ObrasOS - Gestión Digital de Construcción" 
              className="w-[240px] sm:w-[280px] md:w-[320px] lg:w-[400px] h-auto object-contain"
            />
          </div>

          {/* Título Principal */}
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-[#103b55] leading-[1.05] mb-4 md:mb-6 uppercase tracking-tighter">
            Integra tu<br />Construcción<br />Digital
          </h2>

          <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-8 md:mb-10 max-w-lg leading-snug">
            ObrasOS: La plataforma inteligente para control total de proyectos, equipos y materiales.
          </p>

          <ul className="space-y-3 md:space-y-4 mb-8">
            {[
              'Colaboración en tiempo real',
              'Informes automatizados',
              'Gestión de personal',
              'Control de costes y tiempos'
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-base sm:text-lg md:text-xl text-gray-800 font-medium">
                <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#103b55] shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Lado Derecho - Imagen y Badges */}
        <div className="w-full lg:w-1/2 relative min-h-[400px] sm:min-h-[500px] lg:min-h-0 bg-gray-100 overflow-hidden">
           
           {/* Imagen de fondo */}
           <div 
             className="absolute inset-0 bg-cover bg-center bg-no-repeat"
             style={{ backgroundImage: "url('/fondo-obras-os.png')" }}
           />
           
           {/* Capa de difuminado para fundir la imagen con el fondo blanco de las letras */}
           <div className="absolute top-0 left-0 w-full h-32 lg:w-64 lg:h-full bg-gradient-to-b lg:bg-gradient-to-r from-white to-transparent pointer-events-none" />
           
           {/* Badges Flotantes simulando la interfaz */}
           <div className="absolute inset-0 pointer-events-none p-4 md:p-12 scale-90 sm:scale-100 origin-center">
             
             {/* Analíticas */}
             <div className="absolute top-[10%] lg:top-[15%] left-[5%] lg:left-[10%] bg-white/95 backdrop-blur shadow-2xl rounded-2xl px-3 py-2 md:px-5 md:py-3 flex flex-col items-center gap-1 border border-gray-100">
               <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-gray-200 flex items-center justify-center">
                 <BarChart3 className="text-[#103b55] w-4 h-4 md:w-5 md:h-5" />
               </div>
               <span className="text-[10px] md:text-xs font-bold text-gray-800">Analíticas</span>
             </div>

             {/* Colaboración de Equipo */}
             <div className="absolute top-[20%] lg:top-[25%] right-[5%] lg:right-[10%] bg-white/95 backdrop-blur shadow-2xl rounded-2xl px-3 py-2 md:px-5 md:py-3 flex flex-col items-center gap-1 border border-gray-100">
               <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-gray-200 flex items-center justify-center">
                 <Users className="text-[#103b55] w-4 h-4 md:w-5 md:h-5" />
               </div>
               <span className="text-[10px] md:text-xs font-bold text-gray-800 text-center leading-tight">Colaboración<br/>de Equipo</span>
             </div>

             {/* Monitoreo de obra */}
             <div className="absolute bottom-[30%] lg:bottom-[35%] left-[10%] lg:left-[15%] bg-white/95 backdrop-blur shadow-2xl rounded-2xl px-3 py-2 md:px-5 md:py-3 flex flex-col items-center gap-1 border border-gray-100">
               <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-gray-200 flex items-center justify-center">
                 <Map className="text-[#103b55] w-4 h-4 md:w-5 md:h-5" />
               </div>
               <span className="text-[10px] md:text-xs font-bold text-gray-800 text-center leading-tight">Monitoreo<br/>de obra</span>
             </div>

             {/* Control Presupuestario */}
             <div className="absolute bottom-[15%] lg:bottom-[20%] right-[10%] lg:right-[15%] bg-white/95 backdrop-blur shadow-2xl rounded-2xl px-3 py-2 md:px-5 md:py-3 flex flex-col items-center gap-1 border border-gray-100">
               <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-gray-200 flex items-center justify-center">
                 <DollarSign className="text-[#103b55] w-4 h-4 md:w-5 md:h-5" />
               </div>
               <span className="text-[10px] md:text-xs font-bold text-gray-800 text-center leading-tight">Control<br/>Presupuestario</span>
             </div>
             
             {/* Líneas conectoras decorativas (simuladas con divs absolutos) */}
             <div className="absolute top-[20%] left-[25%] w-[80px] md:w-[100px] h-[1px] bg-white/50 -rotate-12" />
             <div className="absolute bottom-[40%] left-[30%] w-[100px] md:w-[150px] h-[1px] bg-white/50 rotate-12" />
           </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#e5e7eb] py-4 md:py-6 text-center shadow-inner z-20">
        <p className="text-gray-800 font-medium md:font-bold text-base md:text-xl tracking-wide">
          Próximamente....
        </p>
      </div>
    </div>
  )
}
