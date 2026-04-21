"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import { importKey, signData } from "@/lib/crypto";
import { UserCheck, QrCode, RefreshCw, Loader2, X, Smartphone, ShieldCheck } from "lucide-react";

export default function VincularCelularPersonal({ trabajador, idEmpresa, onClose }) {
  const [loading, setLoading] = useState(false);
  const [qrPayload, setQrPayload] = useState(null);
  const [error, setError] = useState(null);

  const generarQRPersonal = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let privKeyB64 = sessionStorage.getItem(`priv_key_${idEmpresa}`);
      
      if (!privKeyB64) {
        setError("Llave de sesión no encontrada. Ve a la sección de Terminales para inicializar la seguridad de la empresa primero.");
        setLoading(false);
        return;
      }

      const privKey = await importKey(privKeyB64, "private");
      
      const payload = {
        e: idEmpresa, // e = id_empresa
        t: trabajador.id_trabajador, // t = id_trabajador
        p: 1, // p = is_personal flag
        ts: Date.now(),
        n: Math.random().toString(36).substring(7), // n = nonce
      };

      const signature = await signData(payload, privKey);
      
      setQrPayload(JSON.stringify({
        ...payload,
        sig: signature
      }));

    } catch (err) {
      console.error("Error generating personal QR:", err);
      setError("No se pudo generar el código QR de vinculación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-b border-white/10 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <Smartphone className="text-accent" />
              <div>
                <h3 className="font-black text-sm uppercase tracking-widest">Vincular Celular Personal</h3>
                <p className="text-[10px] font-bold opacity-70 uppercase">{trabajador.nombre}</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
             <X size={20} />
           </button>
        </div>

        <div className="p-8 flex flex-col items-center">
           {!qrPayload ? (
             <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto text-blue-600">
                   <ShieldCheck size={40} />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-bold text-foreground">Autorización de Confianza</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Usa esta función para permitir que <b>{trabajador.nombre}</b> use su propio dispositivo para marcar asistencia. 
                    No requiere que el trabajador inicie sesión.
                  </p>
                </div>
                <button 
                  onClick={generarQRPersonal}
                  disabled={loading}
                  className="w-full py-4 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <QrCode size={18} />}
                  Generar QR de Vínculo
                </button>
             </div>
           ) : (
             <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-90 duration-300">
                <div className="p-4 bg-white rounded-[2rem] shadow-2xl border border-gray-100 flex items-center justify-center">
                  <QRCodeSVG value={qrPayload} size={300} level="M" includeMargin />
                </div>
                <div className="text-center space-y-1">
                   <p className="text-[10px] font-black uppercase text-primary tracking-widest">Escanea con el celular del trabajador</p>
                   <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Este código expira al cerrar esta ventana</p>
                </div>
                <button onClick={() => setQrPayload(null)} className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-primary transition-colors">
                   <RefreshCw size={12} /> REGENERAR CÓDIGO
                </button>
             </div>
           )}

           {error && (
             <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800 text-center">
                <p className="text-[10px] font-black text-red-600 uppercase mb-2">Error de Seguridad</p>
                <p className="text-[10px] font-bold text-red-500 leading-tight">{error}</p>
             </div>
           )}
        </div>

        <div className="p-4 bg-muted/30 border-t border-border text-center">
           <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.15em]">
              ObrasOS • Seguridad Criptográfica P-256
           </p>
        </div>
      </div>
    </div>
  );
}
