"use client"

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { 
  Users, MapPin, Settings, PlusCircle, ArrowRight,
  ShieldCheck, Activity, Clock, FileBarChart, Zap, CheckCircle2,
  AlertTriangle, Hammer, ClipboardList, TrendingUp, BarChart3,
  HardHat, Construction, Truck, ChevronRight, Menu, X, LogIn
} from 'lucide-react'
import BotonTema from '@/components/BotonTema'

// ── REVEAL COMPONENT ──
const Reveal = ({ children, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setTimeout(() => setIsVisible(true), delay)
      }
    }, { threshold: 0.1 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div 
      ref={ref} 
      className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
    >
      {children}
    </div>
  )
}

export default function Home() {
  const [activeFeature, setActiveFeature] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const features = [
    {
      id: 0,
      title: "Control de Asistencia",
      tag: "MÓDULO 01 · CAMPO",
      desc: "Registro desde celular con código QR o geolocalización. El supervisor aprueba, el gerente exporta la nómina en un clic.",
      mock: (
        <div className="space-y-3">
          {[
            { name: 'Carlos Mendoza', sub: 'Capataz · Torre Cumbres', status: '✓ 07:02', color: 'text-success' },
            { name: 'Ramón Gutiérrez', sub: 'Obrero · Torre Cumbres', status: '✓ 07:15', color: 'text-success' },
            { name: 'Miguel Ángel Soto', sub: 'Supervisor · Bodega Norte', status: '✗ Ausente', color: 'text-red-500' },
            { name: 'Fernando Ríos', sub: 'Obrero · C. Comercial', status: '⏱ 08:10', color: 'text-accent' },
          ].map((u, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-black">{u.name.substring(0,2)}</div>
              <div className="flex-1">
                <div className="text-xs font-bold text-white">{u.name}</div>
                <div className="text-[9px] text-white/40 uppercase font-black tracking-tighter">{u.sub}</div>
              </div>
              <span className={`text-[10px] font-black ${u.color}`}>{u.status}</span>
            </div>
          ))}
        </div>
      )
    },
    {
      id: 1,
      title: "Control de Materiales",
      tag: "MÓDULO 02 · ALMACÉN",
      desc: "Entradas, salidas y transferencias entre obras. Alertas automáticas cuando el stock cae bajo el mínimo configurado.",
      mock: (
        <div className="space-y-4 pt-4">
          {[
            { name: 'Cemento Portland', val: '180 / 200 sacos', p: 30, c: 'bg-alert' },
            { name: 'Varilla 3/8"', val: '4,200 kg ✓', p: 85, c: 'bg-accent' },
            { name: 'Grava 3/4"', val: '12 / 30 m³', p: 20, c: 'bg-alert' },
            { name: 'Block 15x20x40', val: '2,400 pzas ✓', p: 95, c: 'bg-success' },
          ].map((m, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-white">
                <span>{m.name}</span>
                <span className={m.p < 50 ? 'text-accent' : 'text-white/40'}>{m.val}</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full ${m.c} rounded-full transition-all duration-1000`} style={{ width: `${m.p}%` }} />
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      id: 2,
      title: "Avance de Obra",
      tag: "MÓDULO 03 · REPORTES",
      desc: "Reporte por etapas con fotos y porcentaje de avance. Detección automática de retrasos y PDF para el cliente.",
      mock: (
        <div className="space-y-4 pt-4">
           {[
            { name: 'Cimentación', p: 100, c: 'bg-success' },
            { name: 'Estructura', p: 68, c: 'bg-accent' },
            { name: 'Cerramientos', p: 20, c: 'bg-accent' },
            { name: 'Instalaciones', p: 5, c: 'bg-alert' },
          ].map((m, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-white">
                <span>{m.name}</span>
                <span>{m.p}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full ${m.c} rounded-full transition-all duration-1000`} style={{ width: `${m.p}%` }} />
              </div>
            </div>
          ))}
        </div>
      )
    }
  ]

  return (
    <main className="min-h-screen bg-background relative selection:bg-accent/30 font-sans">
      
      {/* ── GRAIN OVERLAY ── */}
      <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

      {/* ── NAVBAR (Adapted Dashboard Style) ── */}
      <nav className="fixed top-0 left-0 right-0 h-16 z-50 flex items-center justify-between px-6 md:px-12 bg-[#1e4063]/90 dark:bg-[#0d1b2a]/60 backdrop-blur-xl border-b border-white/5 shadow-lg">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-primary font-black text-lg shadow-lg group-hover:rotate-12 transition-transform">
            🏗
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-black text-sm tracking-tighter text-white uppercase">ObrasOS</span>
            <span className="text-[8px] font-black text-accent tracking-[0.2em] uppercase">Structural Fluidity</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-10">
           <Link href="#problemas" className="text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-accent transition-colors">Problemas</Link>
           <Link href="#modulos" className="text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-accent transition-colors">Módulos</Link>
           <Link href="#precios" className="text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-accent transition-colors">Precios</Link>
           <div className="w-px h-8 bg-white/10 mx-2" />
           <BotonTema />
           <Link href="/login" className="px-5 py-2.5 rounded-lg bg-accent text-primary font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
             <LogIn className="w-3.5 h-3.5" />
             Entrar
           </Link>
        </div>

        {/* Mobile Nav Button */}
        <div className="flex md:hidden items-center gap-4">
           <BotonTema />
           <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-1">
             {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
           </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-[#1e4063] dark:bg-[#0d1b2a] border-b border-white/5 p-6 space-y-6 md:hidden animate-in slide-in-from-top-4">
            <Link href="#problemas" onClick={() => setIsMobileMenuOpen(false)} className="block text-xs font-black uppercase text-white/70">El Problema</Link>
            <Link href="#modulos" onClick={() => setIsMobileMenuOpen(false)} className="block text-xs font-black uppercase text-white/70">Módulos</Link>
            <Link href="#precios" onClick={() => setIsMobileMenuOpen(false)} className="block text-xs font-black uppercase text-white/70">Precios</Link>
            <Link href="/login" className="block w-full text-center py-4 rounded-lg bg-accent text-primary font-black text-xs uppercase">Entrar a la app</Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-48 pb-32 px-6 md:px-12 overflow-hidden flex flex-col items-center group">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('/hero.png')] bg-cover bg-center bg-no-repeat opacity-30 dark:opacity-20 group-hover:scale-105 transition-transform duration-[10s] ease-out" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/40 to-background" />
        </div>

        {/* Background Grid */}
        <div className="absolute inset-0 dark:bg-grid-white/[0.05] bg-grid-slate-900/[0.04] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        
        {/* Accent Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 text-center max-w-5xl">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#0d1b2a] border border-white/10 text-[#ffd700] text-[9px] font-black uppercase tracking-[0.3em] mb-10 shadow-2xl shadow-[#0d1b2a]/50">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ffd700] animate-pulse shadow-[0_0_8px_#ffd700]" />
              Piloto Gratuito Disponible 2026
            </div>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="text-5xl md:text-[120px] font-black tracking-tighter leading-[0.85] text-[#0d1b2a] dark:text-foreground uppercase mb-10">
              Control <span className="text-[#daad00] [text-shadow:1px_1px_0_#145184] dark:text-[#ffd700] dark:[text-shadow:none]">Total</span><br/>de tus Obras
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="text-base md:text-lg text-[#334155] dark:text-muted-foreground font-medium max-w-2xl mx-auto mb-12 leading-relaxed italic">
              El sistema de gestión diseñado para la realidad de la obra. 
              <span className="text-[#145184] dark:text-foreground font-bold"> Asistencia, materiales y avance</span> — sincronizado en tiempo real.
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link href="/login" className="w-full sm:w-auto px-10 py-5 rounded-lg bg-primary dark:bg-accent text-white dark:text-primary font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all">
                Solicitar Piloto Gratis →
              </Link>
              <Link href="#modulos" className="w-full sm:w-auto px-10 py-5 rounded-lg border border-border bg-card/10 backdrop-blur-md text-foreground font-black text-[11px] uppercase tracking-[0.2em] hover:bg-card transition-all">
                Ver Cómo Funciona
              </Link>
            </div>
          </Reveal>

          <Reveal delay={400}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mt-24 max-w-3xl mx-auto border-t border-border pt-12">
               {[
                 { n: '4+', l: 'Módulos' },
                 { n: '60d', l: 'Sin costo' },
                 { n: '100%', l: 'Cloud Sync' },
                 { n: '24/7', l: 'Soporte' }
               ].map((s, i) => (
                 <div key={i} className="flex flex-col items-center">
                   <span className="text-3xl md:text-4xl font-black text-[#334155] dark:text-accent tracking-tighter leading-none mb-1 italic">{s.n}</span>
                   <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#475569] dark:text-muted-foreground/50">{s.l}</span>
                 </div>
               ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── MARQUEE (Modern Industrial) ── */}
      <div className="border-t border-b border-border bg-[#145184]/5 py-4 overflow-hidden relative group">
        <div className="flex w-[200%] animate-marquee">
           {Array(2).fill([
             'Control de asistencia QR', 'Inventario por obra', 'Avance de obra con fotos', 
             'Dashboard en tiempo real', 'Reportes PDF', 'Alertas de stock', 'Multi-tenant cloud'
           ]).flat().map((t, i) => (
             <div key={i} className="flex items-center gap-3 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 whitespace-nowrap">
               <span className="text-accent text-[8px] animate-pulse">▼</span> {t}
             </div>
           ))}
        </div>
      </div>

      {/* ── PROBLEMAS ── */}
      <section id="problemas" className="py-32 px-6 md:px-12 max-w-7xl mx-auto">
        <Reveal>
          <div className="text-center mb-20">
             <span className="text-[10px] font-black tracking-[0.3em] text-[#145184] dark:text-accent uppercase mb-4 block">El Problema</span>
             <h2 className="text-5xl md:text-[64px] font-black leading-none tracking-tighter text-[#145184] dark:text-foreground uppercase mb-6">¿Te suena familiar?</h2>
             <p className="text-[#334155] dark:text-muted-foreground max-w-xl mx-auto text-sm font-medium leading-relaxed italic">
               "La construcción sigue estancada en el papel y el WhatsApp. No sabemos qué pasa realmente hasta que llega la factura."
             </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 bg-border rounded-lg overflow-hidden border border-border shadow-2xl">
           {[
             { i: Hammer, t: 'Reportes por WhatsApp', d: 'Fotos sin contexto y mensajes perdidos. Nadie sabe en qué va cada etapa realmente.' },
             { i: Clock, t: 'Asistencia en Papel', d: 'Listas a mano que se manipulan o llegan tarde. Nómina que no cuadra con la obra.' },
             { i: AlertTriangle, t: 'Material "Perdido"', d: 'Sin control de salidas, el inventario nunca cuadra. Fugas de dinero que nadie ve.' },
             { i: BarChart3, t: 'Reportes Tardíos', d: 'Cuando llega el reporte semanal, ya es tarde para corregir el rumbo o el presupuesto.' },
             { i: TrendingUp, t: 'Gastos Desbordados', d: 'Sin visión en tiempo real, los sobrecostos se detectan cuando ya no hay remedio.' },
             { i: Construction, t: 'Sistemas Genéricos', d: 'ERP diseñados para oficinas que no entienden el lodo, el polvo y el ritmo de obra.' }
           ].map((p, idx) => (
             <Reveal key={idx} delay={idx * 50}>
               <div className="bg-card hover:bg-primary/5 dark:hover:bg-white/5 p-10 h-full transition-all group relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-[2px] bg-accent transition-transform duration-500 origin-left scale-x-0 group-hover:scale-x-100" />
                 <p.i className="w-8 h-8 text-accent mb-6 transform group-hover:-translate-y-1 transition-all" />
                 <h3 className="text-xs font-black uppercase tracking-widest text-foreground mb-3">{p.t}</h3>
                 <p className="text-[11px] text-muted-foreground leading-relaxed">{p.d}</p>
               </div>
             </Reveal>
           ))}
        </div>
      </section>

      {/* ── MÓDULOS INTERACTIVOS (ObrasOS Signature) ── */}
      <section id="modulos" className="py-32 bg-[#145184] dark:bg-[#0d1b2a]/60 text-white relative border-t border-b border-white/5">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.05]" />
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
            
            <div className="space-y-12">
              <div>
                <span className="text-[9px] font-black tracking-[0.4em] text-primary-foreground dark:text-accent uppercase mb-4 block">La Solución</span>
                <h2 className="text-5xl md:text-[64px] font-black leading-none tracking-tighter uppercase mb-6">diferentes Módulos,<br/>un sistema</h2>
                <p className="text-white/50 text-sm font-medium leading-relaxed max-w-sm italic">
                  "Construido especialmente para constructores."
                </p>
              </div>

              <div className="space-y-4">
                 {features.map((f, i) => (
                   <button 
                    key={i}
                    onClick={() => setActiveFeature(i)}
                    className={`w-full text-left p-6 rounded-lg border transition-all duration-300 ${activeFeature === i ? 'bg-white/10 border-accent shadow-2xl scale-[1.02]' : 'bg-transparent border-white/5 hover:border-white/20'}`}
                   >
                     <div className="flex items-center gap-5">
                        <div className={`w-1.5 h-1.5 rounded-full ${activeFeature === i ? 'bg-accent shadow-[0_0_10px_#ffd700]' : 'bg-white/20'}`} />
                        <div>
                          <h4 className="text-[11px] font-black uppercase tracking-[0.2em]">{f.title}</h4>
                          {activeFeature === i && <p className="text-xs text-white/50 mt-3 leading-relaxed animate-in fade-in slide-in-from-top-1">{f.desc}</p>}
                        </div>
                     </div>
                   </button>
                 ))}
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-10 bg-accent/10 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-[#0d1b2a]/90 backdrop-blur-2xl border border-white/10 rounded-lg shadow-2xl p-8 min-h-[420px] flex flex-col">
                 <div className="text-[9px] font-black tracking-[0.3em] text-accent uppercase mb-8 border-b border-white/5 pb-4">{features[activeFeature].tag}</div>
                 <div className="flex-1 animate-in fade-in zoom-in-95 duration-500">
                   {features[activeFeature].mock}
                 </div>
                 <div className="mt-8 pt-6 border-t border-white/5 flex gap-1.5 justify-center">
                    {Array(3).fill(0).map((_, i) => (
                      <div key={i} className={`w-10 h-1 rounded-full transition-all ${activeFeature === i ? 'bg-accent' : 'bg-white/10'}`} />
                    ))}
                 </div>
              </div>
            </div>

        </div>
      </section>

      {/* ── PRECIOS (Technical Tiers) ── */}
      <section id="precios" className="py-32 px-6 md:px-12 max-w-7xl mx-auto">
        <Reveal>
          <div className="text-center mb-20">
             <span className="text-[10px] font-black tracking-[0.3em] text-[#145184] dark:text-accent uppercase mb-4 block">Precios</span>
             <h2 className="text-5xl md:text-[64px] font-black leading-none tracking-tighter text-[#145184] dark:text-foreground uppercase mb-6 italic">Transparencia Total</h2>
             <p className="text-[#334155] dark:text-muted-foreground max-w-xl mx-auto text-[11px] font-black uppercase tracking-widest">Sin contratos anuales forzados · Cancela cuando quieras</p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {[
             { t: 'Básico', p: '990', s: 'hasta 30 empleados', f: ['1 obra activa', 'Control Asistencia', 'Control Materiales', 'Reportes PDF', 'Soporte Email'], popular: false },
             { t: 'Profesional', p: '2,490', s: 'hasta 150 empleados', f: ['5 obras activas', 'Todo el plan Básico', 'Dashboard Multi-obra', 'Exportación CSV/PDF', 'Roles Avanzados', 'Soporte Prioritario'], popular: true },
             { t: 'Empresa', p: '5,990', s: 'empleados ilimitados', f: ['Obras ilimitadas', 'Todo el Profesional', 'Multi-empresa', 'API Access', 'Onboarding Personalizado', 'SLA Garantizado'], popular: false }
           ].map((p, idx) => (
             <Reveal key={idx} delay={idx * 100}>
                 <div 
                  className={`relative p-8 rounded-lg border-2 h-full flex flex-col transition-all group ${p.popular ? 'bg-white dark:bg-card border-accent shadow-2xl scale-[1.05] z-10' : 'bg-white dark:bg-card border-border'}`}
                >
                 {p.popular && (
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 bg-[#ffd700] text-[#145184] text-[9px] font-black uppercase tracking-widest rounded-md shadow-lg italic">Recomendado</div>
                 )}
                 <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-8 ${p.popular ? 'text-accent dark:text-accent' : 'text-[#145184] dark:text-muted-foreground'}`}>{p.t}</div>
                 <div className="flex items-baseline gap-1 mb-2">
                    <span className={`text-2xl font-black italic text-[#145184] dark:text-foreground`}>$</span>
                    <span className={`text-7xl font-black tracking-tighter text-[#0d1b2a] dark:text-foreground`}>{p.p}</span>
                 </div>
                 <div className={`text-[9px] font-black uppercase tracking-widest text-[#475569] dark:text-muted-foreground mb-12 italic`}>MXN / MES · {p.s}</div>
                 
                 <div className="flex-1 space-y-4 mb-12">
                   {p.f.map((f, i) => (
                     <div key={i} className="flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${p.popular ? 'bg-accent' : 'bg-success'}`} />
                        <span className={`text-[11px] font-bold uppercase tracking-tight text-[#145184] dark:text-foreground/80`}>{f}</span>
                     </div>
                   ))}
                 </div>

                 <Link 
                   href="/login" 
                   className={`w-full py-5 rounded-lg text-center font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-xl ${p.popular ? 'bg-accent text-[#145184] hover:scale-[1.02]' : 'bg-background hover:bg-[#145184]/5 border border-border text-[#145184] dark:text-foreground hover:border-[#145184]'}`}
                 >
                   Solicitar Acceso →
                 </Link>
               </div>
             </Reveal>
           ))}
        </div>
      </section>

      {/* ── TESTIMONIOS (Midnight Style) ── */}
      <section className="py-32 bg-[#145184] dark:bg-[#0d1b2a] border-t border-white/5 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center mb-24">
           <span className="text-[10px] font-black tracking-[0.3em] text-accent uppercase mb-4 block">Feedback</span>
           <h2 className="text-5xl md:text-[64px] font-black leading-none tracking-tighter text-white uppercase italic">QUE OPINAN NUESTROS CLIENTES</h2>
        </div>

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
           {[
             { q: 'Antes el responsable de obra me mandaba fotos por WhatsApp y yo nunca sabía en qué etapa iba realmente el proyecto. Ahora veo todo desde el dashboard.', a: 'RM', n: 'Roberto Mendoza', r: 'Constructora' },
             { q: 'El módulo de materiales nos ayudó a detectar una fuga de cemento que llevaba meses. El ahorro del primer mes pagó el sistema.', a: 'LP', n: 'Laura Pérez', r: 'Edificaciones' },
             { q: 'La asistencia QR eliminó el problema de los trabajadores fantasma. Sé exactamente quién está en obra sin depender de reportes manuales.', a: 'CA', n: 'Carlos Arredondo', r: 'Grupo Constructor' }
           ].map((t, idx) => (
             <Reveal key={idx} delay={idx * 150}>
               <div className="p-12 rounded-lg bg-white/5 border border-white/10 h-full flex flex-col group hover:bg-white/10 transition-colors">
                  <div className="text-accent text-5xl font-mono mb-8 opacity-20">“</div>
                  <p className="text-white/70 text-sm font-medium leading-relaxed italic mb-12 flex-1">"{t.q}"</p>
                  <div className="flex items-center gap-5">
                    <div className="w-11 h-11 rounded-lg bg-accent text-primary font-black flex items-center justify-center text-xs shadow-lg">{t.a}</div>
                    <div>
                      <div className="text-xs font-black text-white uppercase tracking-wider">{t.n}</div>
                      <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">{t.r}</div>
                    </div>
                  </div>
               </div>
             </Reveal>
           ))}
        </div>
      </section>

      {/* ── CTA FINAL (Destacado) ── */}
      <section id="piloto" className="py-40 px-6 max-w-4xl mx-auto text-center">
        <Reveal>
          <h2 className="text-6xl md:text-[100px] font-black leading-none tracking-tighter text-primary dark:text-foreground uppercase mb-10">60 DÍAS <span className="text-accent">SIN COSTO</span></h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-2 font-medium leading-relaxed">
            Abierto el registro de prueba 2026. <span className="text-accent font-bold">Prueba piloto</span> disponible para implementación asistida.
          </p>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-16 font-medium leading-relaxed">
            <span className="text-accent font-bold">Oferta especial para subcontratistas de RECAL ESTRUCTURAS</span>
          </p>
          
          <div className="max-w-md mx-auto space-y-4">
             <input type="text" placeholder="NOMBRE DE TU EMPRESA" className="w-full bg-card border border-border p-5 rounded-lg text-[9px] font-black uppercase tracking-widest focus:border-accent outline-none transition-all placeholder:text-muted-foreground/40" />
             <input type="tel" placeholder="NÚMERO DE TELÉFONO" className="w-full bg-card border border-border p-5 rounded-lg text-[9px] font-black uppercase tracking-widest focus:border-accent outline-none transition-all placeholder:text-muted-foreground/40" />
             <button type="submit" className="w-full bg-accent text-primary p-5 rounded-lg font-black text-[11px] uppercase tracking-[0.3em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
               Solicitar Piloto Gratis →
             </button>
             <div className="flex items-center justify-center gap-2 mt-8 py-2 px-4 rounded-full bg-alert/10 border border-alert/20 w-fit mx-auto animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-alert" />
                <span className="text-[9px] font-black text-alert uppercase tracking-widest">Respuesta en menos de 12 horas</span>
             </div>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER (Technical) ── */}
      <footer className="py-24 px-6 md:px-12 border-t border-border flex flex-col md:flex-row items-center justify-between gap-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-primary font-black text-sm">🏗</div>
          <span className="font-black text-xs uppercase tracking-widest text-foreground">ObrasOS · 2026</span>
        </div>
        
        <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] text-center">Software Estructural. Soluciones reales.</div>

        <div className="flex gap-10">
           <Link href="#" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-accent transition-colors">Privacidad</Link>
           <Link href="#" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-accent transition-colors">Términos</Link>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 35s linear infinite;
        }
      `}</style>
    </main>
  )
}
