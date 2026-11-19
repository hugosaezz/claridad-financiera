-- ============================================================================
-- CLARIDAD FINANCIERA — ESQUEMA DE BASE DE DATOS MULTI-USUARIO (SUPABASE)
-- Base de datos: https://gtzupuhyuolmhkfqsmho.supabase.co
--
-- Nota importante:
-- La aplicación ya persiste y sincroniza en tiempo real TODOS los registros
-- personales del Control Mensual (`gasto_personal`, `ingreso_personal`,
-- `deuda_personal`, `config_usuario`) como filas relacionales en la tabla
-- `public.movimientos` (`grupo_id IS NULL`), vinculadas por clave foránea
-- a cada usuario (`usuario_id -> public.usuarios.id`).
--
-- Si además ejecutas este script en el SQL Editor de Supabase, se añadirán
-- las tablas y columnas adicionales de optimización y consulta directa.
-- ============================================================================

-- 1. Nuevas columnas en `usuarios` para el perfil financiero de cada usuario
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS datos_personales JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS telefono_bizum TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT '#4f46e5',
  ADD COLUMN IF NOT EXISTS presupuesto_mensual NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nomina_mensual NUMERIC(12,2) DEFAULT 0;

-- 2. Tabla relacional dedicada de Gastos Mensuales por Usuario (opcional/espejo)
CREATE TABLE IF NOT EXISTS public.gastos_mensuales (
  id BIGSERIAL PRIMARY KEY,
  uid TEXT UNIQUE NOT NULL,
  usuario_id BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  monto NUMERIC(12,2) NOT NULL DEFAULT 0,
  categoria TEXT NOT NULL DEFAULT 'comida',
  metodo TEXT NOT NULL DEFAULT 'tarjeta',
  concepto TEXT DEFAULT '',
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  viaje_id TEXT DEFAULT '',
  es_devolucion BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabla relacional dedicada de Ingresos Mensuales por Usuario (opcional/espejo)
CREATE TABLE IF NOT EXISTS public.ingresos_mensuales (
  id BIGSERIAL PRIMARY KEY,
  uid TEXT UNIQUE NOT NULL,
  usuario_id BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  monto NUMERIC(12,2) NOT NULL DEFAULT 0,
  categoria TEXT NOT NULL DEFAULT 'extra',
  origen TEXT DEFAULT '',
  concepto TEXT DEFAULT '',
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabla relacional dedicada de Deudas Personales P2P por Usuario (opcional/espejo)
CREATE TABLE IF NOT EXISTS public.deudas_personales (
  id BIGSERIAL PRIMARY KEY,
  uid TEXT UNIQUE NOT NULL,
  usuario_id BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  persona TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('owed', 'owe')),
  monto NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_inicial NUMERIC(12,2) NOT NULL DEFAULT 0,
  concepto TEXT DEFAULT '',
  fecha_vencimiento DATE,
  saldada BOOLEAN NOT NULL DEFAULT FALSE,
  historial JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Índices de alto rendimiento para consultas multi-usuario en `movimientos`
CREATE INDEX IF NOT EXISTS idx_movimientos_usuario_personal
  ON public.movimientos (usuario_id, tipo)
  WHERE grupo_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_movimientos_grupo
  ON public.movimientos (grupo_id, created_at DESC)
  WHERE grupo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_grupo_usuarios_usuario
  ON public.grupo_usuarios (usuario_id);
