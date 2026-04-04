-- SCRIPT INICIAL: OBRAS-OS (POSTGRESQL / SUPABASE)
-- Nomenclatura: cat_ (catálogos) | dat_ (datos operacionales)

-- ==========================================
-- 0. EXTENSIONES
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. CATÁLOGOS BASE (Multi-Tenant Root)
-- ==========================================

-- Tabla de Empresas (Tenants)
CREATE TABLE IF NOT EXISTS cat_empresas (
    id_empresa UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_comercial VARCHAR(255) NOT NULL,
    rfc VARCHAR(20),
    plan_suscripcion VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
    logo_url TEXT,
    color_primario VARCHAR(7) DEFAULT '#145184', -- Azul Petróleo
    color_acento VARCHAR(7) DEFAULT '#FFD700',   -- Amarillo Seguridad
    esta_activa BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. DATOS DE PERSONAL Y ACCESOS
-- ==========================================

-- Tabla de Personal (Integrada con Supabase Auth)
CREATE TABLE IF NOT EXISTS dat_personal_area (
    id_personal UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id), -- Vínculo nativo con Supabase Auth
    id_empresa UUID NOT NULL REFERENCES cat_empresas(id_empresa),
    nombre VARCHAR(255) NOT NULL,
    correo VARCHAR(255) UNIQUE NOT NULL,
    rol VARCHAR(50) NOT NULL, -- Admin, Gerente, Supervisor, Obrero
    area VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    ultimo_acceso TIMESTAMP WITH TIME ZONE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. MÓDULO HSE (MIGRACIÓN ACTUAL)
-- ==========================================

-- Tabla de Informes de Seguridad
CREATE TABLE IF NOT EXISTS dat_informes_seguridad (
    id_informe UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES cat_empresas(id_empresa),
    id_supervisor UUID REFERENCES dat_personal_area(id_personal),
    num_reporte INT NOT NULL,
    mes_anio VARCHAR(20),
    periodo_inicio DATE,
    periodo_fin DATE,
    id_subcontratista UUID, -- Para cuando el contractor tiene a su vez subcontratistas
    resumen_semanal TEXT,
    estatus VARCHAR(50) DEFAULT 'borrador', -- borrador, enviado, aprobado
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. SEGURIDAD RLS (ROW LEVEL SECURITY)
-- ==========================================
ALTER TABLE cat_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE dat_personal_area ENABLE ROW LEVEL SECURITY;
ALTER TABLE dat_informes_seguridad ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PARA dat_personal_area
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Usuarios pueden ver su propio perfil') THEN
        CREATE POLICY "Usuarios pueden ver su propio perfil" ON dat_personal_area
            FOR SELECT USING (auth_user_id = auth.uid());
    END IF;
END $$;

-- POLÍTICAS PARA cat_empresas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Usuarios pueden ver su propia empresa') THEN
        CREATE POLICY "Usuarios pueden ver su propia empresa" ON cat_empresas
            FOR SELECT USING (
                id_empresa = (SELECT id_empresa FROM dat_personal_area WHERE auth_user_id = auth.uid())
            );
    END IF;
END $$;

-- POLÍTICAS PARA dat_informes_seguridad
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Aislamiento por empresa en informes') THEN
        CREATE POLICY "Aislamiento por empresa en informes" ON dat_informes_seguridad
            FOR SELECT USING (
                id_empresa = (SELECT id_empresa FROM dat_personal_area WHERE auth_user_id = auth.uid())
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Personal puede crear informes para su empresa') THEN
        CREATE POLICY "Personal puede crear informes para su empresa" ON dat_informes_seguridad
            FOR INSERT WITH CHECK (
                id_empresa = (SELECT id_empresa FROM dat_personal_area WHERE auth_user_id = auth.uid())
            );
    END IF;
END $$;
