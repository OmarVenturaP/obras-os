import { openDB } from 'idb';

const DB_NAME = 'obrasos_db';
const STORE_ASISTENCIAS = 'asistencias_pendientes';
const STORE_FUERZA = 'fuerza_trabajo'; // Nuevo caché offline

export const initDB = async () => {
  return openDB(DB_NAME, 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore(STORE_ASISTENCIAS, { keyPath: 'id', autoIncrement: true });
      }
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORE_FUERZA)) {
          // Usamos id_trabajador como key. Almacenará también ultimo_estado y ultima_asistencia
          db.createObjectStore(STORE_FUERZA, { keyPath: 'id_trabajador' });
        }
      }
    },
  });
};

export const saveAsistenciaPendiente = async (asistencia) => {
  const db = await initDB();
  return db.add(STORE_ASISTENCIAS, asistencia);
};

export const getAsistenciasPendientes = async () => {
  const db = await initDB();
  return db.getAll(STORE_ASISTENCIAS);
};

export const getCountAsistenciasPendientes = async () => {
  const db = await initDB();
  return db.count(STORE_ASISTENCIAS);
};

export const clearAsistenciasPendientes = async () => {
  const db = await initDB();
  const tx = db.transaction(STORE_ASISTENCIAS, 'readwrite');
  await tx.store.clear();
  await tx.done;
};

// --- CACHÉ OFFLINE DE FUERZA DE TRABAJO ---
export const saveFuerzaTrabajoCache = async (trabajadores) => {
  const db = await initDB();
  const tx = db.transaction(STORE_FUERZA, 'readwrite');
  // Vaciamos primero para evitar trabajadores dados de baja fantasma
  await tx.store.clear();
  // Insertamos los actualizados
  for (const t of trabajadores) {
    await tx.store.put(t);
  }
  await tx.done;
};

export const searchFuerzaTrabajoLocal = async (query) => {
  const db = await initDB();
  const allWorkers = await db.getAll(STORE_FUERZA);
  const qObj = query.toLowerCase().trim();
  
  if (!qObj) return [];
  
  // Buscar coincidencia en nombre o alias
  const filtrados = allWorkers.filter(w => 
    w.nombre.toLowerCase().includes(qObj) || 
    (w.alias && w.alias.toLowerCase().includes(qObj))
  );

  return filtrados.slice(0, 10); // Limitar a 10 resultados
};
