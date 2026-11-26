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

-- ============================================================================
-- FASE 1 — ESQUEMA NORMALIZADO EN CÉNTIMOS, CUENTAS, AUDIT LOG Y RLS
-- ============================================================================

-- 6. Columnas de moneda, céntimos enteros, soft-delete y sync en tablas personales
ALTER TABLE public.gastos_mensuales
  ADD COLUMN IF NOT EXISTS amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS amount_base_cents INTEGER,
  ADD COLUMN IF NOT EXISTS account_id TEXT DEFAULT 'acc_main',
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS device_id TEXT;

ALTER TABLE public.ingresos_mensuales
  ADD COLUMN IF NOT EXISTS amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS amount_base_cents INTEGER,
  ADD COLUMN IF NOT EXISTS account_id TEXT DEFAULT 'acc_main',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1;

-- Backfill céntimos enteros para registros existentes (sin pérdida de precisión)
UPDATE public.gastos_mensuales
  SET amount_cents = ROUND(monto * 100)::INTEGER,
      amount_base_cents = ROUND(monto * 100)::INTEGER
  WHERE amount_cents IS NULL;

UPDATE public.ingresos_mensuales
  SET amount_cents = ROUND(monto * 100)::INTEGER,
      amount_base_cents = ROUND(monto * 100)::INTEGER
  WHERE amount_cents IS NULL;

-- 7. Tabla normalizada de cuentas personales (efectivo|banco|tarjeta|ahorro|inversion)
CREATE TABLE IF NOT EXISTS public.cuentas_personales (
  id TEXT PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('efectivo', 'banco', 'tarjeta', 'ahorro', 'inversion')),
  saldo_inicial_cents INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#4f46e5',
  icon TEXT DEFAULT 'account_balance',
  archivada BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cuentas_usuario ON public.cuentas_personales (usuario_id);

-- 8. Registro de auditoría de seguridad por usuario
CREATE TABLE IF NOT EXISTS public.audit_log (
  id TEXT PRIMARY KEY,
  usuario_id BIGINT REFERENCES public.usuarios(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  detail TEXT DEFAULT '',
  device_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_usuario_fecha
  ON public.audit_log (usuario_id, created_at DESC);

-- 9. Vínculo opcional con Supabase Auth (auth.uid()) para activar RLS estricto
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS auth_uid UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS currency_default TEXT DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS month_start_day SMALLINT DEFAULT 1;

-- Ejemplo de políticas RLS (activar cuando los usuarios migren a Supabase Auth):
-- ALTER TABLE public.gastos_mensuales ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "gastos_propios" ON public.gastos_mensuales
--   USING (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_uid = auth.uid()));
-- ALTER TABLE public.cuentas_personales ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "cuentas_propias" ON public.cuentas_personales
--   USING (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_uid = auth.uid()));
