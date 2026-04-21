"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Users, MapPin, Clock, Calendar, 
  Search, ArrowRight, ExternalLink, 
  Wifi, WifiOff, Loader2, 
  ChevronLeft, LayoutGrid, List,
  RefreshCw, Radio, ShieldCheck, FileText
} from "lucide-react";
import Link from "next/link";

const POLL_INTERVAL = 15_000; // 15 segundos

export default function MonitoreoAsistenciaPage() {
  const [groupedAsistencias, setGroupedAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);       // solo carga inicial
  const [isRefreshing, setIsRefreshing] = useState(false); // polling silencioso
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({ total: 0, entradas: 0, salidas: 0, offline: 0 });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [newRowIds, setNewRowIds] = useState(new Set()); 

  const intervalRef = useRef(null);
  const prevIdsRef = useRef(new Set());

  const fetchAsistencias = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const { data, error } = await supabase
        .from("v_monitoreo_asistencias")
        .select("*")
        .gte("fecha_hora", `${filterDate}T00:00:00Z`)
        .lte("fecha_hora", `${filterDate}T23:59:59Z`)
        .order("fecha_hora", { ascending: true }); // Orden ascendente para procesar ráfagas

      if (error) throw error;

      const incoming = data || [];

      // Lógica de Agrupación por Trabajador
      const grouped = incoming.reduce((acc, curr) => {
        const key = curr.trabajador_nombre;
        if (!acc[key]) {
          acc[key] = {
            ...curr,
            hora_entrada: curr.tipo === 'entrada' ? curr.fecha_hora : null,
            hora_salida: curr.tipo === 'salida' ? curr.fecha_hora : null,
            lat_entrada: curr.tipo === 'entrada' ? curr.latitud : null,
            lng_entrada: curr.tipo === 'entrada' ? curr.longitud : null,
            lat_salida: curr.tipo === 'salida' ? curr.latitud : null,
            lng_salida: curr.tipo === 'salida' ? curr.longitud : null,
            is_offline: curr.sincronizado_local,
            id_referencia: curr.id_asistencia, // Para el highlight
            folio_hash: curr.folio_hash // Mantener folio
          };
        } else {
          if (curr.tipo === 'entrada' && (!acc[key].hora_entrada || curr.fecha_hora < acc[key].hora_entrada)) {
            acc[key].hora_entrada = curr.fecha_hora;
            acc[key].lat_entrada = curr.latitud;
            acc[key].lng_entrada = curr.longitud;
          }
          if (curr.tipo === 'salida' && (!acc[key].hora_salida || curr.fecha_hora > acc[key].hora_salida)) {
            acc[key].hora_salida = curr.fecha_hora;
            acc[key].lat_salida = curr.latitud;
            acc[key].lng_salida = curr.longitud;
          }
          if (curr.sincronizado_local) acc[key].is_offline = true;
          acc[key].id_referencia = curr.id_asistencia;
          if (curr.folio_hash) acc[key].folio_hash = curr.folio_hash;
        }
        return acc;
      }, {});

      const finalData = Object.values(grouped).sort((a, b) => {
          const timeA = a.hora_entrada || a.hora_salida;
          const timeB = b.hora_entrada || b.hora_salida;
          return new Date(timeB) - new Date(timeA);
      });

      // Detectar cambios para animación
      const currentIds = new Set(incoming.map(r => r.id_asistencia));
      if (silent) {
        const fresh = new Set([...currentIds].filter(id => !prevIdsRef.current.has(id)));
        if (fresh.size > 0) {
          setNewRowIds(fresh);
          setTimeout(() => setNewRowIds(new Set()), 4000);
        }
      }
      prevIdsRef.current = currentIds;

      setGroupedAsistencias(finalData);
      setStats({
        total: finalData.length,
        entradas: finalData.filter(a => a.hora_entrada).length,
        salidas: finalData.filter(a => a.hora_salida).length,
        offline: incoming.filter(a => a.sincronizado_local).length,
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error cargando monitoreo:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [filterDate]);

  useEffect(() => {
    fetchAsistencias({ silent: false });
  }, [fetchAsistencias]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchAsistencias({ silent: true });
    }, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchAsistencias]);

  const handleManualRefresh = () => {
    clearInterval(intervalRef.current);
    fetchAsistencias({ silent: false });
    intervalRef.current = setInterval(() => {
      fetchAsistencias({ silent: true });
    }, POLL_INTERVAL);
  };

  const filtered = groupedAsistencias.filter(a =>
    a.trabajador_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.trabajador_alias && a.trabajador_alias.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-8 space-y-8 bg-gray-50/50 dark:bg-slate-950 min-h-screen font-manrope transition-colors">

      {/* HEADER & NAV */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Link href="/dashboard/asistencia" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 hover:text-primary transition-colors mb-4 group">
            <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Volver a Panel
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white uppercase transition-colors">
              Monitoreo en Vivo
            </h1>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50">
              <Radio size={12} className="text-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                En Vivo
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 font-medium mt-1">
            Supervisión estructural de la fuerza de trabajo en campo.{" "}
            {lastUpdated && (
              <span className="text-[10px] text-gray-400 dark:text-slate-600">
                • Refrescado {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isRefreshing && (
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-600">
              <Loader2 size={12} className="animate-spin" />
              Actualizando...
            </div>
          )}

          <button
            onClick={handleManualRefresh}
            disabled={loading || isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm text-xs font-black uppercase tracking-widest text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-primary/20 transition-all disabled:opacity-40"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refrescar
          </button>

          <div className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800">
            <Calendar size={16} className="text-gray-400 dark:text-slate-600" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-gray-700 dark:text-slate-200 focus:ring-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Personas en Obra', val: stats.total, icon: Users, col: 'bg-primary dark:bg-blue-600 text-white' },
          { label: 'Total Entradas', val: stats.entradas, icon: ArrowRight, col: 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border border-emerald-50 dark:border-emerald-900/30' },
          { label: 'Total Salidas', val: stats.salidas, icon: ArrowRight, col: 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 border border-red-50 dark:border-red-900/30', rotate: 180 },
          { label: 'Registros Offline', val: stats.offline, icon: WifiOff, col: 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border border-amber-50 dark:border-amber-900/30' }
        ].map((c, i) => (
          <div key={i} className={`p-6 rounded-[2rem] shadow-sm flex flex-col justify-between h-40 transition-all hover:scale-[1.02] ${c.col}`}>
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-2xl ${c.col.includes('white') ? 'bg-gray-50 dark:bg-slate-800' : 'bg-white/10 dark:bg-white/5'}`}>
                <c.icon size={20} style={c.rotate ? { transform: `rotate(${c.rotate}deg)` } : {}} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60 transition-colors">{c.label}</span>
            </div>
            <span className="text-5xl font-black tracking-tighter leading-none">{c.val}</span>
          </div>
        ))}
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">

        <div className="p-6 md:p-8 border-b border-gray-50 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-slate-600" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre o puesto..."
              className="w-full pl-12 pr-4 py-4 bg-gray-50/50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-800 dark:text-white transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mr-2">
              Mostrando {filtered.length} trabajadores
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-24 flex flex-col items-center gap-4 text-gray-400 dark:text-slate-600 transition-colors">
              <Loader2 className="animate-spin" size={40} />
              <span className="text-[10px] font-black uppercase tracking-widest">Cargando base de datos...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 flex flex-col items-center gap-4 text-gray-300 dark:text-slate-700">
              <Users size={60} strokeWidth={1} />
              <span className="text-sm font-bold">No hay actividad registrada para esta fecha.</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-slate-800/30 transition-colors">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">Trabajador</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">Actividad Diaria (Entrada | Salida)</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 text-center">Jornada (Hrs)</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">Kiosko / Origen</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">Seguridad</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">Ubicación</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">Estado de Sinc.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {filtered.map((a) => {
                  const isNew = newRowIds.has(a.id_referencia);
                  return (
                    <tr
                      key={a.id_asistencia}
                      className={`hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors group ${isNew ? 'animate-pulse bg-emerald-50 dark:bg-emerald-900/10' : ''}`}
                    >
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-primary/5 dark:bg-blue-500/10 flex items-center justify-center text-primary dark:text-blue-400 font-black text-xs border border-primary/10 dark:border-blue-500/10">
                            {a.trabajador_nombre?.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-base text-gray-900 dark:text-white transition-colors">{a.trabajador_nombre}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">
                              {a.trabajador_puesto || a.trabajador_alias || 'PERSONAL'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-5">
                          {/* ENTRADA */}
                          {a.hora_entrada ? (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800">
                                        <Clock size={12} />
                                    </div>
                                    <span className="text-[14px] font-black leading-none">
                                        {new Date(a.hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </span>
                                </div>
                                <span className="text-[9px] font-black uppercase text-emerald-600/50 dark:text-emerald-400/30 tracking-[0.2em] pl-7">Entrada</span>
                            </div>
                          ) : (
                            <div className="text-[10px] font-black uppercase text-gray-300 dark:text-slate-700 tracking-widest italic flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-gray-200 dark:bg-slate-800" />
                                Sin Entrada
                            </div>
                          )}

                          <div className="w-px h-8 bg-gray-100 dark:bg-slate-800 mx-2" />

                          {/* SALIDA */}
                          {a.hora_salida ? (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                                    <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800">
                                        <Clock size={12} />
                                    </div>
                                    <span className="text-[14px] font-black leading-none">
                                        {new Date(a.hora_salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </span>
                                </div>
                                <span className="text-[9px] font-black uppercase text-rose-600/50 dark:text-rose-400/30 tracking-[0.2em] pl-7">Salida</span>
                            </div>
                          ) : (
                            <div className="text-[10px] font-black uppercase text-gray-300 dark:text-slate-700 tracking-widest italic flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-gray-200 dark:bg-slate-800" />
                                Pendiente Salida
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-7 text-center">
                        {a.hora_entrada && a.hora_salida ? (() => {
                          const diff = new Date(a.hora_salida) - new Date(a.hora_entrada);
                          const totalMinutes = Math.floor(diff / 60000);
                          const h = Math.floor(totalMinutes / 60);
                          const m = totalMinutes % 60;
                          return (
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-black text-slate-900 shadow-accent/10">
                                {h}h {m}m
                              </span>
                              <div className="w-12 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                <div 
                                  className="h-full bg-primary" 
                                  style={{ width: `${Math.min((totalMinutes / 480) * 100, 100)}%` }} 
                                />
                              </div>
                            </div>
                          );
                        })() : (
                          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">---</span>
                        )}
                      </td>
                      <td className="px-8 py-7 text-sm">
                        <div>
                          <p className="font-bold text-gray-700 dark:text-slate-300">{a.kiosko_nombre || 'Admin App'}</p>
                          <p className="text-[9px] font-black text-gray-400 dark:text-slate-600 uppercase tracking-widest">Punto de Control</p>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        {a.folio_hash ? (
                          <Link 
                            href={`/folio/${a.folio_hash}`}
                            target="_blank"
                            className="flex items-center gap-2 text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg w-fit hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all border border-blue-100/50 dark:border-blue-800/50 group/folio"
                          >
                            <ShieldCheck size={14} className="group-hover/folio:scale-110 transition-transform" />
                            {a.folio_hash}
                            <ExternalLink size={10} className="opacity-40" />
                          </Link>
                        ) : (
                          <div className="flex items-center gap-2 text-[10px] font-black text-gray-300 dark:text-slate-700 uppercase tracking-widest italic pl-2">
                             <div className="w-1 h-1 rounded-full bg-gray-200 dark:bg-slate-800" />
                             Sin Folio
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-7">
                        <div className="flex flex-col gap-2">
                          {a.lat_entrada && (
                            <a
                              href={`https://www.google.com/maps?q=${a.lat_entrada},${a.lng_entrada}`}
                              target="_blank"
                              className="flex items-center gap-2 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg w-fit hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all border border-emerald-100/50 dark:border-emerald-800/50"
                            >
                              <MapPin size={12} /> GPS Entrada
                            </a>
                          )}
                          {a.lat_salida && (
                            <a
                              href={`https://www.google.com/maps?q=${a.lat_salida},${a.lng_salida}`}
                              target="_blank"
                              className="flex items-center gap-2 text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-lg w-fit hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all border border-rose-100/50 dark:border-rose-800/50"
                            >
                              <MapPin size={12} /> GPS Salida
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {a.is_offline ? (
                          <div className="flex items-center gap-2 text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg w-fit border border-amber-100 dark:border-amber-800/50">
                            <WifiOff size={14} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Sinc (Offline)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg w-fit border border-emerald-100 dark:border-emerald-800/50">
                            <Wifi size={14} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Directo Cloud</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-8 py-5 border-t border-gray-50 dark:border-slate-800 flex items-center justify-between bg-gray-50/30 dark:bg-slate-900/30">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-slate-600">
            Actualización Automática cada {POLL_INTERVAL / 1000}s • {filterDate}
          </span>
          {isRefreshing && (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Sincronizando flujo de campo
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
