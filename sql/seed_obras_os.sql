-- SCRIPT INICIAL: OBRAS-OS (POSTGRESQL / SUPABASE)
-- Nomenclatura: cat_ (catálogos) | dat_ (datos operacionales)

-- ==========================================
-- 0. EXTENSIONES (Solo si eres Superadmin en Supabase)
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. CATÁLOGOS BASE (Multi-Tenant Root)
-- ==========================================

-- Tabla de Empresas (Tenants)
CREATE TABLE cat_empresas (
    id_empresa UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_comercial VARCHAR(255) NOT NULL,
    rfc VARCHAR(20),
    plan_suscripcion VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
    logo_url TEXT,
    color_primario VARCHAR(7) DEFAULT '#145184', -- Azul Petróleo
    color_acento VARCHAR(7) DEFAULT '#FFD700',   -- Amarillo Seguridad
    public_key_kiosko TEXT, -- LLAVE PÚBLICA PARA VINCULACIÓN OFFLINE
    esta_activa BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. DATOS DE PERSONAL (STAFF / ADMINS)
-- ==========================================

-- Tabla de Personal Administrativo (Con cuenta Supabase Auth)
CREATE TABLE dat_personal_area (
    id_personal UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id),
    id_empresa UUID NOT NULL REFERENCES cat_empresas(id_empresa),
    nombre VARCHAR(255) NOT NULL,
    correo VARCHAR(255) UNIQUE NOT NULL,
    rol VARCHAR(50) NOT NULL, -- Admin, Gerente, Supervisor
    area VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    ultimo_acceso TIMESTAMP WITH TIME ZONE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. FUERZA DE TRABAJO (TRABAJADORES SIN CUENTA)
-- ==========================================

CREATE TABLE dat_fuerza_trabajo (
    id_trabajador UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa UUID NOT NULL REFERENCES cat_empresas(id_empresa),
    nombre VARCHAR(255) NOT NULL,
    alias VARCHAR(100),
    edad INT,
    curp VARCHAR(20),
    nss VARCHAR(20),
    puesto VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. MÓDULO HSE
-- ==========================================
-- (Se mantiene igual, referenciando a staff supervisor)
CREATE TABLE dat_informes_seguridad (
    id_informe UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa UUID NOT NULL REFERENCES cat_empresas(id_empresa),
    id_supervisor UUID REFERENCES dat_personal_area(id_personal),
    num_reporte INT NOT NULL,
    mes_anio VARCHAR(20),
    periodo_inicio DATE,
    periodo_fin DATE,
    id_subcontratista UUID, 
    resumen_semanal TEXT,
    estatus VARCHAR(50) DEFAULT 'borrador', 
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 5. CONFIGURACIÓN KIOSKOS
-- ==========================================

CREATE TABLE dat_terminales_kiosko (
    id_terminal UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa UUID NOT NULL REFERENCES cat_empresas(id_empresa),
    id_obra UUID, -- Opcional: Vincular terminal a una obra específica
    nombre_dispositivo VARCHAR(255),
    token_seguridad TEXT,
    ultimo_sync TIMESTAMP WITH TIME ZONE,
    esta_activa BOOLEAN DEFAULT TRUE
);

-- ==========================================
-- 6. MÓDULO ASISTENCIA OFFLINE-FIRST
-- ==========================================

CREATE TABLE dat_asistencias (
    id_asistencia UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_trabajador UUID NOT NULL REFERENCES dat_fuerza_trabajo(id_trabajador),
    id_terminal UUID REFERENCES dat_terminales_kiosko(id_terminal), -- Quién registró
    tipo VARCHAR(20) NOT NULL, -- entrada, salida
    fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    latitud NUMERIC,
    longitud NUMERIC,
    inspeccion_epp JSONB, -- Checklist de Seguridad + Firma
    sincronizado_local BOOLEAN DEFAULT FALSE,
    fecha_registro_servidor TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 7. SEGURIDAD RLS
-- ==========================================

ALTER TABLE cat_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE dat_personal_area ENABLE ROW LEVEL SECURITY;
ALTER TABLE dat_fuerza_trabajo ENABLE ROW LEVEL SECURITY;
ALTER TABLE dat_informes_seguridad ENABLE ROW LEVEL SECURITY;
ALTER TABLE dat_terminales_kiosko ENABLE ROW LEVEL SECURITY;
ALTER TABLE dat_asistencias ENABLE ROW LEVEL SECURITY;

-- Políticas de aislamiento
CREATE POLICY empresa_isolation_workers ON dat_fuerza_trabajo
    USING (id_empresa = (SELECT id_empresa FROM dat_personal_area WHERE auth_user_id = auth.uid()));

CREATE POLICY terminal_isolation ON dat_terminales_kiosko
    USING (id_empresa = (SELECT id_empresa FROM dat_personal_area WHERE auth_user_id = auth.uid()));

CREATE POLICY asistencia_isolation_v2 ON dat_asistencias
    FOR ALL
    USING (
      id_trabajador IN (
        SELECT id_trabajador FROM dat_fuerza_trabajo 
        WHERE id_empresa = (SELECT id_empresa FROM dat_personal_area WHERE auth_user_id = auth.uid())
      )
    )
    WITH CHECK (
      id_trabajador IN (
        SELECT id_trabajador FROM dat_fuerza_trabajo 
        WHERE id_empresa = (SELECT id_empresa FROM dat_personal_area WHERE auth_user_id = auth.uid())
      )
    );

-- ==========================================
-- 8. VISTAS DE MONITOREO
-- ==========================================

CREATE OR REPLACE VIEW v_monitoreo_asistencias AS
SELECT 
    a.id_asistencia,
    a.fecha_hora,
    a.tipo,
    a.latitud,
    a.longitud,
    a.sincronizado_local,
    f.nombre AS trabajador_nombre,
    f.alias AS trabajador_alias,
    f.puesto AS trabajador_puesto,
    t.nombre_dispositivo AS kiosko_nombre,
    f.id_empresa
FROM dat_asistencias a
JOIN dat_fuerza_trabajo f ON a.id_trabajador = f.id_trabajador
LEFT JOIN dat_terminales_kiosko t ON a.id_terminal = t.id_terminal;

-- Las vistas en Supabase no tienen RLS propio, pero respetan el RLS de las tablas base
-- si se configuran con security_invoker = on.
ALTER VIEW v_monitoreo_asistencias SET (security_invoker = on);

