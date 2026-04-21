"use client";

import { useState, useEffect } from "react";
import { saveAsistenciaPendiente, getCountAsistenciasPendientes } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { WifiOff, Wifi, CloudUpload, CheckCircle2, UserCheck, AlertCircle, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

export default function RegistroAsistencia() {
  const { isOnline, isSyncing, syncError, syncSuccess, triggerSync } = useNetworkStatus();
  const [workerId, setWorkerId] = useState("");
  const [pendientesAcount, setPendientesAcount] = useState(0);
  const [isRegistering, setIsRegistering] = useState(false);
  const [tipoAsistencia, setTipoAsistencia] = useState("entrada");

  // Usualmente esto vendría de escanear un QR (workerId)
  // Para propósitos de este componente, usamos un input simulado que vendría de un scanner.

  useEffect(() => {
    // Actualizar el contador de pendientes periódicamente o cuando cambia el estado de conexión
    const updateCount = async () => {
      const count = await getCountAsistenciasPendientes();
      setPendientesAcount(count);
    };
    updateCount();
    // Intervalo simple para refrescar contador
    const interval = setInterval(updateCount, 5000);
    return () => clearInterval(interval);
  }, [isOnline, isSyncing]);

  useEffect(() => {
    if (syncSuccess) {
      Swal.fire({
        title: "Sincronización Exitosa",
        text: "Los registros offline fueron enviados correctamente a la base de datos.",
        icon: "success",
        timer: 3000,
        showConfirmButton: false,
        background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff',
        color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#1e293b'
      });
      // Asegurarse de que el contador baje a 0
      setPendientesAcount(0);
    }
  }, [syncSuccess]);

  const registrarAsistencia = async (e) => {
    e.preventDefault();
    if (!workerId.trim()) {
      Swal.fire({
        title: "Error",
        text: "Debes ingresar o escanear el ID del trabajador",
        icon: "error",
        background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff',
        color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#1e293b'
      });
      return;
    }

    setIsRegistering(true);

    try {
      // 1. Obtener ubicación
      const posicion = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, // Optimizado para Mac (Wifi)
          timeout: 10000,
          maximumAge: 60000,
        });
      }).catch((err) => {
        console.warn("No se pudo obtener ubicación:", err);
        return { coords: { latitude: null, longitude: null } };
      });

      // 2. Preparar el objeto de asistencia (CAPTURA INSTANTE EXACTO)
      const ahora = new Date().toISOString();
      const nuevaAsistencia = {
        id_trabajador: workerId,
        tipo: tipoAsistencia,
        fecha_hora: ahora,
        latitud: posicion.coords.latitude,
        longitud: posicion.coords.longitude,
      };

      // 3. Evaluar conectividad
      if (isOnline) {
        // Enviar a Supabase directo
        const { error } = await supabase
          .from("dat_asistencias")
          .insert({
            ...nuevaAsistencia,
            sincronizado_local: false,
          });

        if (error) throw error;
        
        Swal.fire({
          title: "Asistencia Registrada",
          text: `El registro de ${tipoAsistencia.toUpperCase()} fue sincronizado exitosamente.`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
          background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff',
          color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#1e293b'
        });
      } else {
        // Guardar local en IndexedDB (Offline)
        await saveAsistenciaPendiente({
          ...nuevaAsistencia,
          sincronizado_local: true,
        });
        
        // Actualizamos UI
        setPendientesAcount((prev) => prev + 1);
        
        Swal.fire({
          title: "Guardado Localmente",
          text: `No hay internet. La ${tipoAsistencia} se sincronizará al conectar.`,
          icon: "info",
          timer: 3000,
          showConfirmButton: false,
          background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff',
          color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#1e293b'
        });
      }

      setWorkerId(""); // Limpiamos scanner
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: "Error",
        text: "Error procesando el registro: " + err.message,
        icon: "error",
        background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff',
        color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#1e293b'
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-slate-800 shadow-blue-900/5 transition-all">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tighter">
          <UserCheck className="text-blue-600 dark:text-blue-400" />
          Scanner Asistencia
        </h2>

        {/* Indicador de Red */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50">
              <Wifi size={14} className="animate-pulse" /> Online
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-3 py-1.5 rounded-full dark:bg-red-900/30 dark:text-red-400 border border-red-100 dark:border-red-800/50">
              <WifiOff size={14} /> Offline
            </span>
          )}
        </div>
      </div>

      {/* Banner de Sincronización */}
      {isSyncing && (
        <div className="mb-6 flex items-center justify-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-2xl animate-pulse dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50">
          <CloudUpload className="animate-bounce" size={20} />
          <span className="font-black text-[10px] uppercase tracking-widest">Sincronizando registros en cola...</span>
        </div>
      )}

      {/* Banner de Errores de Sync */}
      {syncError && (
        <div className="mb-6 flex items-center justify-center gap-3 p-4 bg-red-50 text-red-700 rounded-2xl dark:bg-red-900/30 dark:text-red-300 border border-red-100 dark:border-red-800/50">
          <AlertCircle size={20} />
          <span className="font-black text-[10px] uppercase tracking-widest truncate max-w-full">Error de sync: {syncError}</span>
        </div>
      )}

      {/* TIPO DE ASISTENCIA SELECTOR */}
      <div className="flex p-1.5 bg-gray-50 dark:bg-slate-800/50 rounded-2xl mb-8 border border-gray-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setTipoAsistencia("entrada")}
          className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
            tipoAsistencia === "entrada" 
              ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-lg dark:shadow-blue-900/40 border border-blue-100 dark:border-transparent" 
              : "text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${tipoAsistencia === "entrada" ? "bg-blue-600 dark:bg-white animate-pulse" : "bg-gray-300 dark:bg-slate-700"}`} />
          Entrada
        </button>
        <button
          type="button"
          onClick={() => setTipoAsistencia("salida")}
          className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
            tipoAsistencia === "salida" 
              ? "bg-white dark:bg-red-600 text-red-600 dark:text-white shadow-lg dark:shadow-red-900/40 border border-red-100 dark:border-transparent" 
              : "text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${tipoAsistencia === "salida" ? "bg-red-600 dark:bg-white animate-pulse" : "bg-gray-300 dark:bg-slate-700"}`} />
          Salida
        </button>
      </div>

      {/* UI Simulación Scanner */}
      <form onSubmit={registrarAsistencia} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
            Personal / Workforce ID
          </label>
          <div className="relative">
            <input
              type="text"
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
              placeholder="Escanea el código QR o ID..."
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              disabled={isRegistering || isSyncing}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isRegistering || isSyncing}
          className={`w-full flex justify-center py-5 px-4 rounded-2xl shadow-2xl text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
            tipoAsistencia === 'entrada' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
          }`}
        >
          {isRegistering ? (
            <div className="flex items-center gap-2">
              <Loader2 className="animate-spin w-4 h-4" />
              Procesando...
            </div>
          ) : `Confirmar ${tipoAsistencia}`}
        </button>
      </form>

      {/* Info Registros Pendientes */}
      <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            Registros en Dispositivo
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            {pendientesAcount === 0 ? (
              <CheckCircle2 size={14} className="text-emerald-500" />
            ) : (
              <CloudUpload size={14} className="text-amber-500" />
            )}
            {pendientesAcount} Pendientes
          </span>
        </div>
        
        {pendientesAcount > 0 && isOnline && !isSyncing && (
          <button 
            type="button" 
            onClick={() => triggerSync()} 
            className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-4 shadow-sm text-sm font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
          >
            <CloudUpload size={16} /> 
            Intentar Sincronizar Ahora
          </button>
        )}
      </div>
    </div>
  );
}
