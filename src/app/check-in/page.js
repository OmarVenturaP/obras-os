"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/lib/supabase";
import { importKey, verifyData } from "@/lib/crypto";
import { saveAsistenciaPendiente, saveFuerzaTrabajoCache, searchFuerzaTrabajoLocal } from "@/lib/db";
import { 
  QrCode, UserPlus, Search, ShieldAlert, 
  MapPin, CheckCircle, Wifi, WifiOff, Loader2,
  Trash2, UserCheck, AlertCircle, Camera
} from "lucide-react";
import Swal from "sweetalert2";

export default function CheckInKiosk() {
  // Estados de Configuración / Vinculación
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [kioskData, setKioskData] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [cameraError, setCameraError] = useState(null);

  // Estados de Asistencia
  const [mode, setMode] = useState("scan"); // scan | search
  const [tipoAsistencia, setTipoAsistencia] = useState("entrada");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Estado de Red
  const [isOnline, setIsOnline] = useState(true);

  const scannerRef = useRef(null);

  useEffect(() => {
    // 1. Verificar si ya está vinculado
    const authData = localStorage.getItem("obrasos_kiosk_auth");
    if (authData) {
      const parsed = JSON.parse(authData);
      setKioskData(parsed);
      setIsAuthorized(true);
    }
    setIsInitializing(false);

    // 2. Monitor de red
    const handleNetwork = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", handleNetwork);
    window.addEventListener("offline", handleNetwork);
    setIsOnline(navigator.onLine);

    // 3. Reloj dinámico
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      window.removeEventListener("online", handleNetwork);
      window.removeEventListener("offline", handleNetwork);
      clearInterval(timer);
    };
  }, []);

  // --- AUTO-DESCARGAR CUADRILLA PARA OFFLINE ---
  useEffect(() => {
    if (isAuthorized && isOnline && kioskData?.id_empresa) {
      const syncCuadrilla = async () => {
        try {
          // Descargar TODA la cuadrilla activa de la empresa para usarla en desierto sin internet
          const { data, error } = await supabase
            .from("dat_fuerza_trabajo")
            .select("id_trabajador, nombre, alias, edad, curp, puesto")
            .eq("id_empresa", kioskData.id_empresa)
            .eq("activo", true);
            
          if (!error && data) {
            await saveFuerzaTrabajoCache(data);
            console.log(`[Offline Ready] Cuadrilla de ${data.length} trabajadores almacenada en dispositivo.`);
          }
        } catch (e) {
          console.error("Error cacheando cuadrilla", e);
        }
      };
      
      syncCuadrilla();
    }
  }, [isAuthorized, isOnline, kioskData]);

  // Inicializar Escáner Directo (Cámara en VIVO automática)
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
        console.error("No se pudo iniciar la cámara:", err);
        setCameraError("Debes permitir el acceso a tu cámara en el navegador para leer el QR.");
      });

      return () => {
        if (scannerRef.current) {
          try {
            // Se debe pausar y limpiar en frío, si explota lo ignoramos porque la tab se puede estar cerrando
            scannerRef.current.stop().then(() => {
              scannerRef.current.clear();
            }).catch(() => {});
          } catch(e) {}
        }
      };
    }
  }, [isAuthorized, mode, isInitializing]);

  const onScanSuccess = async (decodedText) => {
    try {
      const data = JSON.parse(decodedText);

      // CASO A: Vinculación de Terminal
      if (data.sig && !isAuthorized) {
        await handleVinculacion(data);
        return;
      }

      // CASO B: Registro de Trabajador
      if (isAuthorized) {
        await registrarAsistencia(decodedText);
      }
    } catch (e) {
      console.error("QR un-parseable o error:", e);
    }
  };

  const onScanFailure = (error) => {};

  // --- LÓGICA DE VINCULACIÓN ---
  const handleVinculacion = async (payload) => {
    try {
      if (!payload.id_empresa) throw new Error("El QR no contiene el ID de Empresa. Genera el QR nuevamente.");

      const { data: empresa, error } = await supabase
        .from("cat_empresas")
        .select("public_key_kiosko, nombre_comercial")
        .eq("id_empresa", payload.id_empresa)
        .single();

      if (error) throw new Error(`Supabase rechazó lectura: ${error.message}`);
      if (!empresa?.public_key_kiosko) throw new Error("La empresa no tiene una llave pública válida en DB.");

      const pubKey = await importKey(empresa.public_key_kiosko, "public");
      const { sig, ...pureData } = payload;
      const isValid = await verifyData(pureData, sig, pubKey);

      if (!isValid) throw new Error("La firma de autorización no es válida o ha expirado.");

      const authObj = {
        id_empresa: payload.id_empresa,
        id_obra: payload.id_obra,
        nombre_empresa: empresa.nombre_comercial,
        vinculado_el: Date.now()
      };

      localStorage.setItem("obrasos_kiosk_auth", JSON.stringify(authObj));
      setKioskData(authObj);
      setIsAuthorized(true);

      Swal.fire({ title: "Terminal Vinculada", text: `Autorizado para ${empresa.nombre_comercial}`, icon: "success" });
    } catch (err) {
      Swal.fire("Error de Vinculación", err.message, "error");
    }
  };

  // --- BUSCADOR MANUAL ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length >= 3) {
        buscarTrabajadores();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const buscarTrabajadores = async () => {
    if (!isAuthorized) return;
    try {
      setIsSearching(true);
      
      if (isOnline) {
        // Buscamos directo en la nube (la más fresca)
        const { data, error } = await supabase
          .from("dat_fuerza_trabajo")
          .select("id_trabajador, nombre, alias, edad, curp, puesto")
          .eq("id_empresa", kioskData.id_empresa)
          .ilike("nombre", `%${searchQuery}%`)
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
      } else {
        // MODO DESIERTO: Buscamos en el caché local del navegador
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
    const workerName = typeof trabajador === "object" ? trabajador.nombre : "Trabajador Localizado";

    try {
      const colorPrincipal = tipoAsistencia === "entrada" ? "#1d4ed8" : "#e11d48";
      const { value: confirmed } = await Swal.fire({
        title: `¿Confirmar ${tipoAsistencia.toUpperCase()}?`,
        text: `Se registrará para: ${workerName}`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "SÍ, REGISTRAR",
        confirmButtonColor: colorPrincipal,
        cancelButtonText: "CANCELAR",
        background: "#ffffff",
        customClass: {
          title: 'font-black uppercase tracking-tight',
          confirmButton: 'rounded-xl px-8 py-3 text-xs font-black tracking-widest',
          cancelButton: 'rounded-xl px-8 py-3 text-xs font-black tracking-widest'
        }
      });

      if (!confirmed) return;

      const pos = await new Promise((resolve) => navigator.geolocation.getCurrentPosition(resolve, () => resolve({ coords: {} }), { timeout: 5000 }));

      // CAPTURAR EL INSTANTE EXACTO DEL CLICK
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
      }

      Swal.fire({
        title: "¡Éxito!",
        text: isOnline ? "Asistencia enviada a la nube." : "Guardado localmente. Se sincronizará al detectar red.",
        icon: "success",
        timer: 2000,
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-10 font-manrope">
      {/* HEADER KIOSKO */}
      <div className="max-w-2xl mx-auto flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Obras<span className="text-accent">OS</span> Kiosko</h1>
          {isAuthorized && (
            <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mt-1">Terminal: {kioskData.nombre_empresa} | {kioskData.id_obra}</p>
          )}
        </div>
        <div className="flex items-center gap-6">
           <div className="hidden md:flex flex-col items-end">
              <span className="text-2xl font-black text-gray-900 leading-none">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </span>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                {currentTime.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
           </div>
           {isOnline ? <Wifi className="text-emerald-500" /> : <WifiOff className="text-red-500 animate-pulse" />}
        </div>
      </div>

      <div className="max-w-2xl mx-auto mb-6">
         {/* SELECTOR DE MODO ENTRADA / SALIDA */}
         <div className="flex p-2 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100">
            <button 
              onClick={() => setTipoAsistencia("entrada")}
              className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                tipoAsistencia === "entrada" 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                  : "text-gray-400 hover:bg-gray-50"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${tipoAsistencia === 'entrada' ? 'bg-white animate-pulse' : 'bg-blue-200'}`} />
              Registrar Entrada
            </button>
            <button 
              onClick={() => setTipoAsistencia("salida")}
              className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                tipoAsistencia === "salida" 
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20" 
                  : "text-gray-400 hover:bg-gray-50"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${tipoAsistencia === 'salida' ? 'bg-white animate-pulse' : 'bg-rose-200'}`} />
              Registrar Salida
            </button>
         </div>
      </div>

      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        {!isAuthorized ? (
          /* VINCULACIÓN */
          <div className="p-10 text-center">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"><ShieldAlert size={40} /></div>
            <h2 className="text-2xl font-black mb-4">Dispositivo No Vinculado</h2>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">Requiere autorización del supervisor en modo offline.</p>
            {cameraError ? (
              <div className="p-4 bg-red-50 text-red-600 border border-red-100 rounded-xl mb-6">
                <Camera className="mx-auto mb-2 text-red-400" size={32} />
                <p className="text-xs font-bold">{cameraError}</p>
                <button onClick={() => window.location.reload()} className="mt-3 text-[10px] uppercase tracking-widest text-red-500 underline">Reintentar</button>
              </div>
            ) : (
              <div id="reader" className="w-[250px] h-[250px] mx-auto overflow-hidden rounded-xl border-4 border-dashed border-blue-100 mb-6 bg-black flex items-center justify-center text-white/50 text-xs">Cargando Cámara...</div>
            )}
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Esperando QR...</p>
          </div>
        ) : (
          /* OPERACIÓN */
          <div className="flex flex-col">
            <div className="flex border-b">
              <button onClick={() => setMode("scan")} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${mode === "scan" ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-50'}`}><QrCode size={16} /> Escanear QR</button>
              <button onClick={() => setMode("search")} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${mode === "search" ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-50'}`}><Search size={16} /> Búsqueda Manual</button>
            </div>

            <div className="p-8">
              {/* TRUCO ANTI-CRASH: Mantener el DOM vivo pero esconderlo */}
              <div className={`flex items-center flex-col w-full ${mode === "scan" ? "block" : "hidden"}`}>
                  {cameraError ? (
                    <div className="w-full max-w-sm p-6 bg-red-50 text-red-600 border border-red-100 rounded-2xl mb-6 text-center">
                      <Camera className="mx-auto mb-3 text-red-400" size={40} />
                      <p className="text-sm font-bold">{cameraError}</p>
                      <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-100 rounded text-xs font-bold hover:bg-red-200">Refrescar</button>
                    </div>
                  ) : (
                    <div id="reader" className="w-[250px] h-[250px] overflow-hidden rounded-2xl border-4 border-gray-100 mb-6 shadow-inner bg-black flex items-center justify-center text-white/50 text-xs text-center">Cargando...</div>
                  )}
                  <p className="text-sm font-bold text-gray-800 text-center">Coloca tu código QR</p>
                  <p className="text-xs text-gray-400 mt-2 text-center">Registro automático al escanear.</p>
              </div>

              <div className={`flex flex-col w-full space-y-6 ${mode === "search" ? "block" : "hidden"}`}>
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      type="text" 
                      placeholder="Escribe el nombre del trabajador..."
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary shadow-inner"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                 </div>
                 {isSearching && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>}
                 <div className="space-y-3">
                    {searchResults.map((worker) => (
                      <button key={worker.id_trabajador} onClick={() => registrarAsistencia(worker)} className="w-full p-4 rounded-xl border border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all text-left flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-primary font-black">{worker.nombre.substring(0,2).toUpperCase()}</div>
                          <div>
                             <h4 className="font-bold text-sm text-gray-900">{worker.nombre}</h4>
                             <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-[10px] font-black uppercase text-gray-400 px-1 py-0.5 bg-gray-50 rounded">{worker.alias || 'SIN ALIAS'}</span>
                                <span className="text-[10px] font-black text-gray-500">{worker.edad} AÑOS</span>
                                <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-1 py-0.5 rounded">CURP: *{worker.curp?.slice(-4)}</span>
                             </div>
                          </div>
                        </div>
                        <UserCheck className="text-primary opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                    ))}
                 </div>
              </div>
            </div>

            <div className="p-4 border-t text-center">
               <button onDoubleClick={() => { localStorage.removeItem("obrasos_kiosk_auth"); window.location.reload(); }} className="text-[9px] font-bold text-gray-300 hover:text-red-300 uppercase tracking-widest">Doble Click para desvincular (Admin)</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
