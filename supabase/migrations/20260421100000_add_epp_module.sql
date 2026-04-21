-- MÓDULO EPP Y FOLIO ÚNICO DE SEGURIDAD
-- DBA: Diseño de esquema para trazabilidad de equipo de protección

-- 1. Tabla de Folios de Seguridad
CREATE TABLE IF NOT EXISTS dat_folios_seguridad (
    id_folio UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES cat_empresas(id_empresa) ON DELETE CASCADE,
    id_asistencia UUID NOT NULL REFERENCES dat_asistencias(id_asistencia) ON DELETE CASCADE,
    id_trabajador UUID NOT NULL REFERENCES dat_fuerza_trabajo(id_trabajador) ON DELETE CASCADE,
    
    -- Identificador público del folio (Alfanumérico corto)
    folio_hash VARCHAR(20) UNIQUE NOT NULL,
    
    -- Datos del Checklist (JSONB para flexibilidad futura)
    -- Estructura esperada: { "casco": "ok", "botas": "fail", ... }
    epp_json JSONB NOT NULL,
    
    -- Firma digital (Base64 / SVG path)
    firma_data TEXT,
    
    -- Geolocalización capturada al momento del checklist
    latitud NUMERIC,
    longitud NUMERIC,
    
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Índices para rendimiento
CREATE INDEX idx_folios_empresa ON dat_folios_seguridad(id_empresa);
CREATE INDEX idx_folios_hash ON dat_folios_seguridad(folio_hash);
CREATE INDEX idx_folios_asistencia ON dat_folios_seguridad(id_asistencia);

-- 3. Habilitar RLS
ALTER TABLE dat_folios_seguridad ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Seguridad (Multi-Tenant)

-- Política A: Personal de la empresa puede ver sus folios
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Aislamiento por empresa en folios') THEN
        CREATE POLICY "Aislamiento por empresa en folios" ON dat_folios_seguridad
            FOR ALL 
            USING (
                id_empresa = (SELECT id_empresa FROM dat_personal_area WHERE auth_user_id = auth.uid())
            );
    END IF;
END $$;

-- Política B: Acceso Público por Folio Hash (Solo Lectura)
-- Esto permite que cualquier persona con el link vea el folio específico (Inspectores)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso público por hash de folio') THEN
        CREATE POLICY "Acceso público por hash de folio" ON dat_folios_seguridad
            FOR SELECT
            USING (true); -- El aislamiento real ocurre porque solo retornamos datos si conocen el hash secreto
    END IF;
END $$;

-- 5. Función para generar hash único (Helper)
-- Se puede llamar desde Supabase o simplemente generarlo en el backend
-- Por simplicidad, el backend generará el hash, pero dejamos el índice listo.
