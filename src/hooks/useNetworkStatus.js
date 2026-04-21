import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getAsistenciasPendientes, clearAsistenciasPendientes } from '@/lib/db';
import Swal from 'sweetalert2';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Inicializar estado de red de manera segura para SSR
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
    }
  }, []);

  const syncAsistenciasPendientes = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.onLine) return;

    try {
      setIsSyncing(true);
      setSyncError(null);
      setSyncSuccess(false);
      const pendientes = await getAsistenciasPendientes();

      if (pendientes.length === 0) {
        setIsSyncing(false);
        return;
      }

      console.log(`Intentando sincronizar ${pendientes.length} asistencias pendientes...`);

      // 1. Preparar datos para supabase
      const payload = pendientes.map(p => ({
        id_trabajador: p.id_trabajador,
        tipo: p.tipo,
        fecha_hora: p.fecha_hora,
        latitud: p.latitud,
        longitud: p.longitud,
        sincronizado_local: true
      }));

      // 2. Enviar en lote a Supabase
      const { error } = await supabase
        .from('dat_asistencias')
        .insert(payload);

      if (error) {
        console.error('Error sincronizando con Supabase:', error);
        throw error;
      }

      // 3. Eliminar de IndexedDB
      await clearAsistenciasPendientes();
      console.log('¡Sincronización exitosa!');
      setSyncSuccess(true);

    } catch (err) {
      console.error('Fallo en sincronización en segundo plano:', err);
      // Tirar error audible
      Swal.fire({
        title: "Error de Sincronización",
        text: err.message || "Desconocido",
        icon: "error"
      });
      setSyncError(err.message);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // PRUEBA A PRUEBA DE BALAS: Si el navegador por alguna razón recarga la pestaña completa al reconectar,
    // el evento "online" se pierde. Para evitar eso, ejecutamos un chequeo de limpieza al entrar:
    if (navigator.onLine) {
      setTimeout(() => {
        syncAsistenciasPendientes();
      }, 1000); // Pequeño retraso para dejar que la UI cargue primero
    }

    const handleOnline = () => {
      setIsOnline(true);
      // Disparamos sincronización al recuperar conexión fluidamente
      syncAsistenciasPendientes();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncAsistenciasPendientes]);

  return {
    isOnline,
    isSyncing,
    syncError,
    syncSuccess,
    triggerSync: syncAsistenciasPendientes
  };
}
