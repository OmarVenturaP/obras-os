"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/lib/supabase";
import { importKey, verifyData } from "@/lib/crypto";
import { 
  saveAsistenciaPendiente, 
  saveFuerzaTrabajoCache, 
  searchFuerzaTrabajoLocal,
  getCountAsistenciasPendientes 
} from "@/lib/db";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { 
  QrCode, UserPlus, Search, ShieldAlert, 
  MapPin, CheckCircle, Wifi, WifiOff, Loader2,
  UserCheck, AlertCircle, Camera, CloudUpload
} from "lucide-react";
import Swal from "sweetalert2";

export default function CheckInKiosk() {
  // --- ESTADOS DE SINCRONIZACIÓN ---
  const { isOnline, isSyncing, syncError, syncSuccess, triggerSync } = useNetworkStatus();
  const [pendientesCount, setPendientesCount] = useState(0);

  // --- ESTADOS DE CONFIGURACIÓN / VINCULACIÓN ---
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [kioskData, setKioskData] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [cameraError, setCameraError] = useState(null);

  // --- ESTADOS DE ASISTENCIA ---
  const [mode, setMode] = useState("scan"); // scan | search
  const [tipoAsistencia, setTipoAsistencia] = useState("entrada");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const scannerRef = useRef(null);

  // --- EFECTO INICIAL: VINCULACIÓN Y RELOJ ---
  useEffect(() => {
    // 1. Verificar vinculación
    const authData = localStorage.getItem("obrasos_kiosk_auth");
    if (authData) {
      const parsed = JSON.parse(authData);
      setKioskData(parsed);
      setIsAuthorized(true);
    }
    setIsInitializing(false);

    // 2. Reloj
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // 3. Contador de Pendientes (Intervalo)
    const updateCount = async () => {
      const count = await getCountAsistenciasPendientes();
      setPendientesCount(count);
    };
    updateCount();
    const countTimer = setInterval(updateCount, 5000);

    return () => {
      clearInterval(timer);
      clearInterval(countTimer);
    };
  }, []);

  // --- AUTO-DESCARGAR CUADRILLA PARA OFFLINE ---
  useEffect(() => {
    if (isAuthorized && isOnline && kioskData?.id_empresa) {
      const syncCuadrilla = async () => {
        try {
          const { data, error } = await supabase
            .from("dat_fuerza_trabajo")
            .select("id_trabajador, nombre, alias, edad, curp, puesto")
            .eq("id_empresa", kioskData.id_empresa)
            .eq("activo", true);
            
          if (!error && data) {
            await saveFuerzaTrabajoCache(data);
          }
        } catch (e) {
          console.error("Error cacheando cuadrilla", e);
        }
      };
      syncCuadrilla();
    }
  }, [isAuthorized, isOnline, kioskData]);

  // --- MANEJO DEL ESCÁNER ---
  useEffect(() => {
    if (isInitializing) return;

    if (!isAuthorized || mode === "scan") {
      setCameraError(null);
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        onScanSuccess,
        onScanFailure
      ).catch((err) => {
        console.error("Cámara error:", err);
        setCameraError("Acceso a cámara denegado o no disponible.");
      });

      return () => {
        if (scannerRef.current) {
          scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(() => {});
        }
      };
    }
  }, [isAuthorized, mode, isInitializing]);

  const onScanSuccess = async (decodedText) => {
    try {
      const data = JSON.parse(decodedText);
      if (data.sig && !isAuthorized) {
        await handleVinculacion(data);
        return;
      }
      if (isAuthorized) {
        await registrarAsistencia(decodedText);
      }
    } catch (e) {
      // Ignorar QRs no válidos
    }
  };

  const onScanFailure = () => {};

  // --- LÓGICA DE VINCULACIÓN ---
  const handleVinculacion = async (payload) => {
    try {
      const { data: empresa, error } = await supabase
        .from("cat_empresas")
        .select("public_key_kiosko, nombre_comercial")
        .eq("id_empresa", payload.id_empresa)
        .single();

      if (error || !empresa?.public_key_kiosko) throw new Error("Error obteniendo llaves de seguridad.");

      const pubKey = await importKey(empresa.public_key_kiosko, "public");
      const { sig, ...pureData } = payload;
      const isValid = await verifyData(pureData, sig, pubKey);

      if (!isValid) throw new Error("Firma de vinculación inválida.");

      const authObj = {
        id_empresa: payload.id_empresa,
        id_obra: payload.id_obra,
        nombre_empresa: empresa.nombre_comercial,
        vinculado_el: Date.now()
      };

      localStorage.setItem("obrasos_kiosk_auth", JSON.stringify(authObj));
      setKioskData(authObj);
      setIsAuthorized(true);
      Swal.fire({ title: "Terminal Vinculada", text: empresa.nombre_comercial, icon: "success" });
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    }
  };

  // --- BUSCADOR MANUAL ---
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 3) buscarTrabajadores();
      else setSearchResults([]);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const buscarTrabajadores = async () => {
    if (!isAuthorized) return;
    try {
      setIsSearching(true);
      if (isOnline) {
        const { data } = await supabase
          .from("dat_fuerza_trabajo")
          .select("id_trabajador, nombre, alias, edad, curp, puesto")
          .eq("id_empresa", kioskData.id_empresa)
          .ilike("nombre", `%${searchQuery}%`)
          .limit(10);
        setSearchResults(data || []);
      } else {
        const dataOffline = await searchFuerzaTrabajoLocal(searchQuery);
        setSearchResults(dataOffline);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  // --- REGISTRO ASISTENCIA ---
  const registrarAsistencia = async (trabajador) => {
    if (isRegistering) return;
    setIsRegistering(true);

    const workerId = typeof trabajador === "string" ? trabajador : trabajador.id_trabajador;
    const workerName = typeof trabajador === "object" ? trabajador.nombre : "Trabajador";

    try {
      const colorBtn = tipoAsistencia === "entrada" ? "#1d4ed8" : "#e11d48";
      const { value: confirmed } = await Swal.fire({
        title: `¿Confirmar ${tipoAsistencia.toUpperCase()}?`,
        text: workerName,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "SÍ, REGISTRAR",
        confirmButtonColor: colorBtn,
        cancelButtonText: "CANCELAR",
        background: "#ffffff",
        customClass: { title: 'font-black uppercase', confirmButton: 'rounded-xl', cancelButton: 'rounded-xl' }
      });

      if (!confirmed) return;

      const pos = await new Promise((resolve) => navigator.geolocation.getCurrentPosition(resolve, () => resolve({ coords: {} }), { timeout: 5000 }));
      const now = new Date().toISOString();

      const asistencia = {
        id_trabajador: workerId,
        tipo: tipoAsistencia,
        fecha_hora: now,
        latitud: pos.coords.latitude || null,
        longitud: pos.coords.longitude || null,
        sincronizado_local: !isOnline
      };

      if (isOnline) {
        const { error } = await supabase.from("dat_asistencias").insert(asistencia);
        if (error) throw error;
      } else {
        await saveAsistenciaPendiente(asistencia);
        setPendientesCount(prev => prev + 1);
      }

      Swal.fire({
        title: "¡Éxito!",
        text: isOnline ? "Registro enviado." : "Guardado offline.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      });

      setMode("scan");
      setSearchQuery("");
      setSearchResults([]);
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setIsRegistering(false);
    }
  };

  if (isInitializing) return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-10 font-sans">
      {/* HEADER */}
      <div className="max-w-2xl mx-auto flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tighter">Obras<span className="text-accent">OS</span> Kiosko</h1>
          {isAuthorized && (
            <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">
              {kioskData.nombre_empresa} | {kioskData.id_obra}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
           {isOnline ? <Wifi className="text-emerald-500" /> : <WifiOff className="text-rose-500 animate-pulse" />}
           <div className="flex flex-col items-end">
              <span className="text-xl font-black text-slate-800 leading-none">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
           </div>
        </div>
      </div>

      {/* SELECTOR ENTRADA/SALIDA */}
      <div className="max-w-2xl mx-auto mb-6 flex p-1.5 bg-white rounded-[2rem] shadow-xl border border-gray-100">
        <button 
          onClick={() => setTipoAsistencia("entrada")}
          className={`flex-1 py-4 rounded-3xl text-xs font-black uppercase tracking-widest transition-all ${
            tipoAsistencia === "entrada" ? "bg-blue-600 text-white shadow-lg" : "text-gray-400"
          }`}
        >
          Entrada
        </button>
        <button 
          onClick={() => setTipoAsistencia("salida")}
          className={`flex-1 py-4 rounded-3xl text-xs font-black uppercase tracking-widest transition-all ${
            tipoAsistencia === "salida" ? "bg-rose-600 text-white shadow-lg" : "text-gray-400"
          }`}
        >
          Salida
        </button>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="max-w-2xl mx-auto bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden">
        {!isAuthorized ? (
          <div className="p-12 text-center">
            <ShieldAlert className="mx-auto text-blue-100 mb-6" size={80} />
            <h2 className="text-2xl font-black mb-4 uppercase">Vincular Terminal</h2>
            <div id="reader" className="w-[300px] h-[300px] mx-auto rounded-3xl overflow-hidden bg-black mb-6"></div>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest animate-pulse">Escanea el QR del Admin</p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex border-b">
              <button onClick={() => setMode("scan")} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] ${mode === "scan" ? "bg-primary text-white" : "text-slate-400"}`}>Escanear QR</button>
              <button onClick={() => setMode("search")} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] ${mode === "search" ? "bg-primary text-white" : "text-slate-400"}`}>Búsqueda Manual</button>
            </div>

            <div className="p-10 min-h-[400px]">
              {mode === "scan" ? (
                <div className="flex flex-col items-center">
                   <div id="reader" className="w-[300px] h-[300px] rounded-[3rem] overflow-hidden bg-black border-8 border-gray-50 mb-6 shadow-inner"></div>
                   <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Coloca tu QR de trabajador</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type="text" 
                      placeholder="ESCRIBE TU NOMBRE..."
                      className="w-full pl-12 pr-4 py-5 bg-slate-50 rounded-2xl text-slate-900 font-black tracking-tight outline-none focus:ring-4 focus:ring-primary/10 transition-all border border-slate-100"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    {searchResults.map(w => (
                      <button key={w.id_trabajador} onClick={() => registrarAsistencia(w)} className="w-full p-4 flex items-center justify-between bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all group">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-primary font-black">{w.nombre.substring(0,1)}</div>
                            <div className="text-left">
                               <p className="text-sm font-black text-slate-900 leading-none mb-1">{w.nombre}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{w.puesto || 'General'}</p>
                            </div>
                         </div>
                         <UserCheck size={20} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* SYNC FOOTER */}
            <div className="bg-slate-50 p-8 border-t flex flex-col gap-4">
               <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registros Locales</p>
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${pendientesCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                       <span className="text-sm font-black text-slate-700">{pendientesCount} Pendientes</span>
                    </div>
                  </div>
                  {pendientesCount > 0 && isOnline && (
                    <button 
                      onClick={() => triggerSync()} 
                      disabled={isSyncing}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 flex items-center gap-2"
                    >
                      {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <CloudUpload size={14} />}
                      {isSyncing ? "Sincronizando..." : "Subir Ahora"}
                    </button>
                  )}
               </div>
               
               {isSyncing && (
                 <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest animate-pulse">
                   <CloudUpload size={14} className="animate-bounce" /> Sincronizando datos con la nube...
                 </div>
               )}

               <button onDoubleClick={() => {localStorage.removeItem("obrasos_kiosk_auth"); window.location.reload();}} className="mt-4 text-[9px] font-bold text-slate-300 hover:text-rose-400 uppercase tracking-widest transition-colors">
                 Doble click para resetear terminal
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
