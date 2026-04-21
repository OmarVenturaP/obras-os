"use client";

import { useEffect, useState } from "react";
import RegistroAsistencia from "@/components/RegistroAsistencia";
import VincularTerminal from "@/components/VincularTerminal";
import { supabase } from "@/lib/supabase";
import { Loader2, LayoutGrid, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AsistenciaPage() {
  const [idEmpresa, setIdEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from("dat_personal_area")
          .select("id_empresa")
          .eq("auth_user_id", session.user.id)
          .single();
        
        if (profile) setIdEmpresa(profile.id_empresa);
      }
      setLoading(false);
    }
    getProfile();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="p-8 space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-gray-100 uppercase leading-none">
            Ecosistema de Asistencia
          </h1>
          <p className="mt-2 text-sm text-gray-500 font-medium tracking-tight">
            Control estructural de entradas y salidas con tecnología Offline-First.
          </p>
        </div>

        <Link 
          href="/dashboard/asistencia/monitoreo"
          className="px-6 py-4 bg-primary text-white rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 group"
        >
          <div className="p-2 bg-white/10 rounded-xl group-hover:rotate-12 transition-transform">
             <LayoutGrid size={20} />
          </div>
          <div>
             <p className="text-[10px] font-black uppercase tracking-widest text-white/60 leading-none mb-1">Supervisión</p>
             <p className="text-sm font-black uppercase tracking-tight">Monitoreo en Vivo</p>
          </div>
          <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Escáner Administrativo</h2>
          <RegistroAsistencia />
        </section>

        <section className="space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Configuración de Kioskos Externos</h2>
          <VincularTerminal idEmpresa={idEmpresa} />
          
          <div className="mt-6 p-6 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">¿Cómo funciona el Kiosko?</h4>
            <ul className="text-xs text-blue-700/70 dark:text-blue-400 space-y-2 list-disc pl-4">
              <li>Usa esta sección para autorizar tablets o pantallas en la entrada de la obra.</li>
              <li>Genera el QR de Acceso y escanéalo desde la tablet en la ruta pública: 
                <code className="ml-1 px-1 bg-blue-200 dark:bg-blue-800 rounded">/check-in</code>
              </li>
              <li>Una vez vinculado, el dispositivo recordará la autorización incluso sin internet.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

