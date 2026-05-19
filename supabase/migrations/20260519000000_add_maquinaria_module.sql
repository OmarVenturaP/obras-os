-- ==========================================
-- MÓDULO DE MAQUINARIA Y EQUIPO — OBRAS-OS
-- Autor: Sistema ObrasOS
-- Fecha: 2026-05-19
-- ==========================================

-- ==========================================
-- 1. CATÁLOGO DE OBRAS / PROYECTOS
-- ==========================================

CREATE TABLE IF NOT EXISTS cat_obras (
    id_obra UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES cat_empresas(id_empresa),
    nombre_obra VARCHAR(255) NOT NULL,
    ubicacion TEXT,
    descripcion TEXT,
    activa BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE cat_obras ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Aislamiento por empresa en obras') THEN
        CREATE POLICY "Aislamiento por empresa en obras" ON cat_obras
            FOR ALL USING (
                id_empresa = (SELECT id_empresa FROM dat_personal_area WHERE auth_user_id = auth.uid())
                OR
                (SELECT rol FROM dat_personal_area WHERE auth_user_id = auth.uid()) = 'Master'
            );
    END IF;
END $$;


-- ==========================================
-- 2. TABLA PRINCIPAL DE MAQUINARIA / EQUIPO
-- ==========================================

CREATE TABLE IF NOT EXISTS dat_maquinaria (
    id_maquinaria UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES cat_empresas(id_empresa),
    id_obra UUID REFERENCES cat_obras(id_obra),

    -- Clasificación
    tipo_unidad VARCHAR(50) DEFAULT 'maquinaria',  -- maquinaria | vehiculo | equipo | herramienta
    tipo VARCHAR(150) NOT NULL,                     -- "Retroexcavadora", "Camioneta 3.5T", etc.
    marca VARCHAR(100) NOT NULL,
    modelo VARCHAR(100),
    anio INT,
    color VARCHAR(50),

    -- Identificación
    num_economico VARCHAR(50),
    serie VARCHAR(100),
    placa VARCHAR(50),

    -- Operación
    horometro NUMERIC(12,2) DEFAULT 0,
    horometro_inicial NUMERIC(12,2) DEFAULT 0,
    intervalo_mantenimiento NUMERIC(12,2),
    fecha_proximo_mantenimiento DATE,
    actividad TEXT,
    frente TEXT,

    -- Ciclo de vida
    fecha_ingreso_obra DATE NOT NULL,
    fecha_baja DATE,
    activo BOOLEAN DEFAULT TRUE,

    -- Media
    imagen_url TEXT,

    -- Metadata
    creado_por UUID REFERENCES auth.users(id),
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ultima_modificacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE dat_maquinaria ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- SELECT
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Aislamiento por empresa en maquinaria SELECT') THEN
        CREATE POLICY "Aislamiento por empresa en maquinaria SELECT" ON dat_maquinaria
            FOR SELECT USING (
                id_empresa = (SELECT id_empresa FROM dat_personal_area WHERE auth_user_id = auth.uid())
                OR
                (SELECT rol FROM dat_personal_area WHERE auth_user_id = auth.uid()) = 'Master'
            );
    END IF;

    -- INSERT
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Insertar maquinaria de su empresa') THEN
        CREATE POLICY "Insertar maquinaria de su empresa" ON dat_maquinaria
            FOR INSERT WITH CHECK (
                id_empresa = (SELECT id_empresa FROM dat_personal_area WHERE auth_user_id = auth.uid())
                OR
                (SELECT rol FROM dat_personal_area WHERE auth_user_id = auth.uid()) = 'Master'
            );
    END IF;

    -- UPDATE
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Actualizar maquinaria de su empresa') THEN
        CREATE POLICY "Actualizar maquinaria de su empresa" ON dat_maquinaria
            FOR UPDATE USING (
                id_empresa = (SELECT id_empresa FROM dat_personal_area WHERE auth_user_id = auth.uid())
                OR
                (SELECT rol FROM dat_personal_area WHERE auth_user_id = auth.uid()) = 'Master'
            );
    END IF;
END $$;

-- Trigger para ultima_modificacion
CREATE OR REPLACE FUNCTION update_modified_column_maq()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ultima_modificacion = now();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_dat_maquinaria_mod
BEFORE UPDATE ON dat_maquinaria
FOR EACH ROW
EXECUTE FUNCTION update_modified_column_maq();


-- ==========================================
-- 3. HORÓMETROS MENSUALES
-- ==========================================

CREATE TABLE IF NOT EXISTS dat_horometros_maquinaria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_maquinaria UUID NOT NULL REFERENCES dat_maquinaria(id_maquinaria) ON DELETE CASCADE,
    id_empresa UUID NOT NULL REFERENCES cat_empresas(id_empresa),
    periodo VARCHAR(7) NOT NULL,                    -- "2026-05"
    horometro_final NUMERIC(12,2),
    fecha_proximo_mantenimiento DATE,
    registrado_por UUID REFERENCES auth.users(id),
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(id_maquinaria, periodo)
);

ALTER TABLE dat_horometros_maquinaria ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Aislamiento por empresa en horometros maquinaria') THEN
        CREATE POLICY "Aislamiento por empresa en horometros maquinaria" ON dat_horometros_maquinaria
            FOR ALL USING (
                id_empresa = (SELECT id_empresa FROM dat_personal_area WHERE auth_user_id = auth.uid())
                OR
                (SELECT rol FROM dat_personal_area WHERE auth_user_id = auth.uid()) = 'Master'
            );
    END IF;
END $$;


-- ==========================================
-- 4. HISTORIAL DE MANTENIMIENTO
-- ==========================================

CREATE TABLE IF NOT EXISTS dat_mantenimiento_maquinaria (
    id_mantenimiento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_maquinaria UUID NOT NULL REFERENCES dat_maquinaria(id_maquinaria) ON DELETE CASCADE,
    tipo_mantenimiento VARCHAR(50) NOT NULL,         -- Preventivo | Correctivo | Cambio de Aceite
    fecha_mantenimiento DATE NOT NULL,
    horometro_mantenimiento NUMERIC(12,2),
    observaciones TEXT,
    realizado_por VARCHAR(255),
    folio_mtto INT,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE dat_mantenimiento_maquinaria ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Aislamiento por empresa en mantenimiento maquinaria') THEN
        CREATE POLICY "Aislamiento por empresa en mantenimiento maquinaria" ON dat_mantenimiento_maquinaria
            FOR ALL USING (
                id_maquinaria IN (
                    SELECT id_maquinaria FROM dat_maquinaria
                    WHERE id_empresa = (SELECT id_empresa FROM dat_personal_area WHERE auth_user_id = auth.uid())
                )
                OR
                (SELECT rol FROM dat_personal_area WHERE auth_user_id = auth.uid()) = 'Master'
            );
    END IF;
END $$;
