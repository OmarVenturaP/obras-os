"use client";

import { useState, useEffect } from "react";
import { Download, X, Smartphone, Info } from "lucide-react";

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // 1. Detectar si es iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // 2. Detectar si ya está instalada
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    // 3. Capturar el evento de instalación (Andorid/Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Si es iOS, mostramos el banner de todas formas después de unos segundos
    if (ios) {
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowInstructions(true);
      return;
    }

    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowBanner(false);
    }
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="fixed bottom-24 left-4 right-4 z-[100] animate-in slide-in-from-bottom-10 duration-500">
        <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-4 border border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
               <Smartphone size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Instalar Aplicación</p>
              <p className="text-xs font-bold text-slate-300">Usa ObrasOS offline en la obra.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleInstallClick}
              className="px-4 py-2 bg-primary text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all"
            >
              Instalar
            </button>
            <button onClick={() => setShowBanner(false)} className="p-2 text-slate-500 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL INSTRUCCIONES iOS */}
      {showInstructions && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInstructions(false)} />
           <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-border text-center">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto text-blue-600 mb-6">
                 <Info size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-4">Instalar en iPhone</h3>
              <div className="space-y-4 text-left mb-8">
                 <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-black">1</div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Toca el botón <b>Compartir</b> (cuadrado con flecha) en la barra inferior de Safari.</p>
                 </div>
                 <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-black">2</div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Desliza hacia abajo y elige <b>"Agregar a inicio"</b>.</p>
                 </div>
                 <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-black">3</div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">¡Listo! La app aparecerá en tu pantalla principal.</p>
                 </div>
              </div>
              <button 
                onClick={() => setShowInstructions(false)}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest"
              >
                Entendido
              </button>
           </div>
        </div>
      )}
    </>
  );
}
