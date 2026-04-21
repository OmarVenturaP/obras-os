"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import { generateKeyPair, exportKey, importKey, signData } from "@/lib/crypto";
import { Monitor, ShieldCheck, QrCode, RefreshCw, Loader2 } from "lucide-react";

export default function VincularTerminal({ idEmpresa }) {
  const [loading, setLoading] = useState(false);
  const [keysLoaded, setKeysLoaded] = useState(false);
  const [qrPayload, setQrPayload] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkCompanyKeys();
  }, [idEmpresa]);

  const checkCompanyKeys = async () => {
    if (!idEmpresa) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cat_empresas")
        .select("public_key_kiosko")
        .eq("id_empresa", idEmpresa)
        .single();

      if (error) throw error;
      if (data.public_key_kiosko) {
        setKeysLoaded(true);
      }
    } catch (err) {
      console.error("Error checking keys:", err);
      setError("No se pudo verificar el estado de seguridad de la empresa.");
    } finally {
      setLoading(false);
    }
  };

  const inicializarSeguridad = async () => {
    try {
      setLoading(true);
      const keyPair = await generateKeyPair();
      const pubKeyB64 = await exportKey(keyPair.publicKey);
      const privKeyB64 = await exportKey(keyPair.privateKey);

      // Guardamos la pública en la DB
      const { error: dbError } = await supabase
        .from("cat_empresas")
        .update({ public_key_kiosko: pubKeyB64 })
        .eq("id_empresa", idEmpresa);

      if (dbError) throw dbError;

      // La privada se guarda TEMPORALMENTE en sessionStorage para firmar los QR de esta sesión de supervisor
      sessionStorage.setItem(`priv_key_${idEmpresa}`, privKeyB64);
      setKeysLoaded(true);
    } catch (err) {
      console.error("Error initializing security:", err);
      setError("Fallo al generar llaves de seguridad.");
    } finally {
      setLoading(false);
    }
  };

  const generarQRVinculacion = async () => {
    try {
      setLoading(true);
      let privKeyB64 = sessionStorage.getItem(`priv_key_${idEmpresa}`);
      
      if (!privKeyB64) {
        // En un caso real, pediríamos al supervisor re-autenticarse o usar un PIN para recuperar su llave si no está en sesión
        setError("Llave de sesión no encontrada. Por favor, reinicia la seguridad (esto regenerará nuevas llaves).");
        setLoading(false);
        return;
      }

      const privKey = await importKey(privKeyB64, "private");
      
      const payload = {
        e: idEmpresa, // e = id_empresa
        o: "TODAS", // o = id_obra
        ts: Date.now(),
        n: Math.random().toString(36).substring(7), // n = nonce
      };

      const signature = await signData(payload, privKey);
      
      setQrPayload(JSON.stringify({
        ...payload,
        sig: signature
      }));

    } catch (err) {
      console.error("Error generating QR:", err);
      setError("No se pudo generar el código QR de vinculación.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !keysLoaded) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <Monitor className="text-blue-600" />
        <h3 className="text-lg font-bold">Vincular Terminal Kiosko</h3>
      </div>

      {!keysLoaded ? (
        <div className="text-center p-4">
          <p className="text-sm text-gray-500 mb-4">
            Para autorizar tablets offline, primero debes generar las llaves criptográficas de tu empresa.
          </p>
          <button
            onClick={inicializarSeguridad}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors"
          >
            <ShieldCheck size={18} />
            Inicializar Seguridad Empresa
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {!qrPayload ? (
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-4">
                Usa esta opción cuando estés frente a la tablet de la obra.
              </p>
              <button
                onClick={generarQRVinculacion}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:shadow-primary/20 transition-all"
              >
                <QrCode size={20} />
                Generar QR de Acceso
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
              <div className="p-4 bg-white rounded-2xl shadow-xl border border-gray-100">
                <QRCodeSVG value={qrPayload} size={320} level="M" includeMargin />
              </div>
              <p className="text-xs text-center text-gray-500 max-w-sm font-bold uppercase tracking-widest mt-2">
                Escanea este código desde la tablet para autorizarla
              </p>
              <button
                onClick={() => setQrPayload(null)}
                className="text-xs font-bold text-gray-400 hover:text-primary flex items-center gap-1"
              >
                <RefreshCw size={12} /> Cerrar y refrescar
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-100 flex flex-col items-center text-center">
          <p className="text-red-600 text-xs font-bold mb-3">{error}</p>
          {error.includes("Llave de sesión") && (
            <button
              onClick={() => {
                setError(null);
                inicializarSeguridad();
              }}
              className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded shadow hover:bg-red-700"
            >
              Generar Nuevas Llaves
            </button>
          )}
        </div>
      )}
    </div>
  );
}
