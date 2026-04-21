"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  ShieldCheck, MapPin, Calendar, Clock, 
  User, CheckCircle2, AlertTriangle, XCircle,
  ExternalLink, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function FolioPublico() {
  const { hash } = useParams();
  const [folio, setFolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchFolio() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("dat_folios_seguridad")
          .select(`
            *,
            dat_fuerza_trabajo (nombre, puesto),
            cat_empresas (nombre_comercial, logo_url)
          `)
          .eq("folio_hash", hash)
          .single();

        if (error || !data) throw new Error("Folio no encontrado o hash inválido.");
        setFolio(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (hash) fetchFolio();
  }, [hash]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Validando Folio...</p>
    </div>
  );

  if (error) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <XCircle className="text-rose-500 mb-4" size={60} />
      <h1 className="text-2xl font-black text-slate-800 mb-2 uppercase">Error de Verificación</h1>
      <p className="text-slate-500 max-w-sm mb-6">{error}</p>
      <a href="/" className="px-6 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold uppercase">Volver al Inicio</a>
    </div>
  );

  const eppStatus = folio.epp_json;
  const fecha = new Date(folio.fecha_registro);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 flex flex-col items-center">
      
      {/* TARJETA DEL FOLIO */}
      <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        
        {/* HEADER PREMIUM */}
        <div className="p-8 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Folio Único de Seguridad</p>
              <h1 className="text-3xl font-black tracking-tighter mb-1">{folio.folio_hash}</h1>
              <p className="text-xs opacity-60 font-medium">{folio.cat_empresas?.nombre_comercial}</p>
            </div>
            <div className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/20 flex items-center gap-2">
               <ShieldCheck size={16} />
               <span className="text-[10px] font-black uppercase tracking-widest">Verificado</span>
            </div>
          </div>
        </div>

        {/* INFO DEL TRABAJADOR */}
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between gap-6">
          <div className="flex gap-4">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
              <User size={30} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Trabajador</p>
              <h2 className="text-xl font-black text-slate-800 leading-none mb-1">{folio.dat_fuerza_trabajo?.nombre}</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">{folio.dat_fuerza_trabajo?.puesto || 'General'}</p>
            </div>
          </div>
          <div className="flex flex-col items-start md:items-end">
             <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Calendar size={14} />
                <span className="text-xs font-bold">{format(fecha, "d 'de' MMMM, yyyy", { locale: es })}</span>
             </div>
             <div className="flex items-center gap-2 text-slate-500">
                <Clock size={14} />
                <span className="text-xs font-bold">{format(fecha, "HH:mm 'hrs'", { locale: es })}</span>
             </div>
          </div>
        </div>

        {/* ESTATUS EPP */}
        <div className="p-8 space-y-6">
          <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 text-center md:text-left">Estado del Equipo de Protección</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
             {Object.entries(eppStatus).map(([item, status]) => (
               <div key={item} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-sm font-bold text-slate-600 capitalize">{item.replace('_', ' ')}</span>
                  {status === 'conforme' && <CheckCircle2 className="text-emerald-500" size={20} />}
                  {status === 'dañado' && <AlertTriangle className="text-amber-500" size={20} />}
                  {status === 'no_cuenta' && <XCircle className="text-rose-500" size={20} />}
               </div>
             ))}
          </div>
        </div>

        {/* FIRMA Y UBICACIÓN */}
        <div className="p-8 bg-slate-50/50 flex flex-col md:flex-row gap-8">
           <div className="flex-1 space-y-3">
              <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Firma Digital</h3>
              <div className="bg-white rounded-3xl border border-slate-100 p-4 h-[120px] flex items-center justify-center">
                 {folio.firma_data ? (
                   <img src={folio.firma_data} alt="Firma" className="max-h-full max-w-full object-contain" />
                 ) : (
                   <p className="text-[10px] text-slate-300 uppercase font-black tracking-widest">Sin Firma Registrada</p>
                 )}
              </div>
           </div>
           <div className="flex-1 space-y-3">
              <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Geolocalización</h3>
              <div className="bg-white rounded-3xl border border-slate-100 p-4 h-[120px] flex flex-col items-center justify-center gap-2">
                 <div className="flex items-center gap-2 text-slate-800 mb-1">
                    <MapPin size={18} className="text-blue-500" />
                    <span className="text-xs font-black">{folio.latitud ? `${folio.latitud.toFixed(4)}, ${folio.longitud.toFixed(4)}` : 'Sin Datos GPS'}</span>
                 </div>
                 {folio.latitud && (
                   <a 
                     href={`https://www.google.com/maps?q=${folio.latitud},${folio.longitud}`} 
                     target="_blank" 
                     className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-1 border-b border-blue-200"
                   >
                     Ver en Google Maps <ExternalLink size={10} />
                   </a>
                 )}
              </div>
           </div>
        </div>

        <div className="p-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
           Generado por ObrasOS · Prevención Inteligente
        </div>
      </div>

      <footer className="mt-10 text-center space-y-2 opacity-50">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ObrasOS 2026 · Propiedad de {folio.cat_empresas?.nombre_comercial}</p>
        <p className="text-[9px] text-slate-300 max-w-xs uppercase leading-tight font-bold">Documento confidencial generado electrónicamente. No requiere sello físico.</p>
      </footer>
    </div>
  );
}
