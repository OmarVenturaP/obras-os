-- 0. Tabla de Subcontratistas (Manejadas por cada Empresa/Tenant)
CREATE TABLE IF NOT EXISTS cat_subcontratistas (
    id_subcontratista UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES cat_empresas(id_empresa),
    razon_social VARCHAR(255) NOT NULL,
    rfc VARCHAR(20),
    contacto_nombre VARCHAR(255),
    contacto_telefono VARCHAR(20),
    contacto_correo VARCHAR(255),
    es_principal BOOLEAN DEFAULT FALSE, -- Para distinguir cuadrillas internas
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE cat_subcontratistas ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Aislamiento por empresa en subcontratistas') THEN
        CREATE POLICY "Aislamiento por empresa en subcontratistas" ON cat_subcontratistas
            FOR ALL USING (
                id_empresa = (SELECT id_empresa FROM dat_personal_area WHERE auth_user_id = auth.uid())
                OR 
                (SELECT rol FROM dat_personal_area WHERE auth_user_id = auth.uid()) = 'Master'
            );
    END IF;
END $$;

-- 1. Tabla de Trabajadores
CREATE TABLE IF NOT EXISTS dat_fuerza_trabajo (
    id_trabajador UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES cat_empresas(id_empresa),
    id_subcontratista UUID REFERENCES cat_subcontratistas(id_subcontratista), 
    
    -- Información Personal
    nss VARCHAR(11), 
    curp VARCHAR(18),
    nombre VARCHAR(255) NOT NULL,
    apellido_materno VARCHAR(100),
    apellido_paterno VARCHAR(100),
    nombre_completo VARCHAR(255) GENERATED ALWAYS AS (nombre || ' ' || COALESCE(apellido_paterno, '') || ' ' || COALESCE(apellido_materno, '')) STORED,
    
    -- Información Laboral
    puesto VARCHAR(150),
    numero_empleado VARCHAR(50),
    fecha_ingreso_obra DATE,
    fecha_alta_imss DATE,
    id_cuadrilla UUID, -- Referencia opcional para agrupamiento interno
    
    -- Estatus
    activo BOOLEAN DEFAULT TRUE,
    fecha_baja DATE,
    motivo_baja TEXT,
    
    -- Metadatos
    creado_por UUID REFERENCES auth.users(id),
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ultima_modificacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Habilitar RLS
ALTER TABLE dat_fuerza_trabajo ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acceso
-- Nota: Master puede ver todo (si implementamos el rol Master en dat_personal_area)

DO $$ 
BEGIN
    -- Política de Lectura (Select)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Aislamiento por empresa en fuerza de trabajo') THEN
        CREATE POLICY "Aislamiento por empresa en fuerza de trabajo" ON dat_fuerza_trabajo
            FOR SELECT USING (
                id_empresa = (SELECT id_empresa FROM dat_personal_area WHERE auth_user_id = auth.uid())
                OR 
                (SELECT rol FROM dat_personal_area WHERE auth_user_id = auth.uid()) = 'Master'
            );
    END IF;

    -- Política de Inserción (Insert)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Insertar personal de su propia empresa') THEN
        CREATE POLICY "Insertar personal de su propia empresa" ON dat_fuerza_trabajo
            FOR INSERT WITH CHECK (
                id_empresa = (SELECT id_empresa FROM dat_personal_area WHERE auth_user_id = auth.uid())
                OR 
                (SELECT rol FROM dat_personal_area WHERE auth_user_id = auth.uid()) = 'Master'
            );
    END IF;

    -- Política de Actualización (Update)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Actualizar personal de su propia empresa') THEN
        CREATE POLICY "Actualizar personal de su propia empresa" ON dat_fuerza_trabajo
            FOR UPDATE USING (
                id_empresa = (SELECT id_empresa FROM dat_personal_area WHERE auth_user_id = auth.uid())
                OR 
                (SELECT rol FROM dat_personal_area WHERE auth_user_id = auth.uid()) = 'Master'
            );
    END IF;

END $$;

-- 4. Triggers para ultima_modificacion
CREATE OR REPLACE FUNCTION update_modified_column_ft()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ultima_modificacion = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dat_fuerza_trabajo_mod
BEFORE UPDATE ON dat_fuerza_trabajo
FOR EACH ROW
EXECUTE FUNCTION update_modified_column_ft();
