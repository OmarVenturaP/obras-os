"use client";

import { useState, useRef, useEffect } from "react";
import { 
  ShieldCheck, AlertTriangle, XCircle, 
  Trash2, CheckCircle2, X
} from "lucide-react";

const EPP_ITEMS = [
  { id: "casco", label: "Casco de Seguridad" },
  { id: "botas", label: "Botas de Casquillo" },
  { id: "chaleco", label: "Chaleco Reflejante" },
  { id: "guantes", label: "Guantes de Trabajo" },
  { id: "lentes", label: "Lentes de Protección" },
];

export default function ChecklistEPP({ workerName, onComplete, onCancel }) {
  const [checklist, setChecklist] = useState(
    EPP_ITEMS.reduce((acc, item) => ({ ...acc, [item.id]: null }), {})
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // --- LÓGICA DE CANVAS PARA FIRMA ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a"; // Slate 900
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // --- LÓGICA DE NEGOCIO ---
  const handleToggle = (id, status) => {
    setChecklist(prev => ({ ...prev, [id]: status }));
  };

  const isComplete = () => {
    const allChecked = Object.values(checklist).every(v => v !== null);
    return allChecked;
  };

  const handleSubmit = () => {
    const canvas = canvasRef.current;
    // Verificar si hay algo dibujado (opcional pero recomendado)
    const signatureBase64 = canvas.toDataURL("image/png");
    onComplete({
      items: checklist,
      signature: signatureBase64
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest mb-1">Paso Obligatorio: Seguridad</p>
            <h2 className="text-xl font-black text-slate-800">{workerName}</h2>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          <div className="space-y-4">
            <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Inspección Visual EPP</h3>
            {EPP_ITEMS.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-sm font-bold text-slate-700">{item.label}</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleToggle(item.id, 'conforme')}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${checklist[item.id] === 'conforme' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white text-slate-300 border border-slate-200'}`}
                  >
                    <CheckCircle2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleToggle(item.id, 'dañado')}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${checklist[item.id] === 'dañado' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white text-slate-300 border border-slate-200'}`}
                  >
                    <AlertTriangle size={18} />
                  </button>
                  <button 
                    onClick={() => handleToggle(item.id, 'no_cuenta')}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${checklist[item.id] === 'no_cuenta' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white text-slate-300 border border-slate-200'}`}
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ÁREA DE FIRMA */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
               <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Firma del Trabajador</h3>
               <button onClick={clearCanvas} className="text-[9px] font-black text-rose-500 uppercase flex items-center gap-1">
                 <Trash2 size={12} /> Limpiar
               </button>
            </div>
            <div className="border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 overflow-hidden relative touch-none">
              <canvas 
                ref={canvasRef}
                width={480}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-[160px] cursor-crosshair"
              />
              <p className="absolute bottom-2 left-0 right-0 text-center text-[9px] text-slate-300 font-bold pointer-events-none uppercase tracking-widest">
                Firme dentro del cuadro
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 bg-white border-t">
          <button 
            onClick={handleSubmit}
            disabled={!isComplete()}
            className={`w-full py-5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl ${
              isComplete() 
                ? 'bg-blue-600 text-white shadow-blue-600/20' 
                : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
            }`}
          >
            Finalizar y Registrar
          </button>
        </div>
      </div>
    </div>
  );
}
