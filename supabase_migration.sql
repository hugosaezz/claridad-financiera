-- ============================================================================
-- CLARIDAD FINANCIERA — MIGRACIÓN SUPABASE MULTI-USUARIO
-- Base de datos: https://gtzupuhyuolmhkfqsmho.supabase.co
-- Nota: La aplicación ya sincroniza automáticamente los datos de cada usuario
-- en Supabase usando la tabla `movimientos` (tipo = 'sync_bolsillo', grupo_id = NULL),
-- y si ejecutas este script en el SQL Editor de Supabase, también habilitará
-- las columnas dedicadas directamente en la tabla `usuarios`.
-- ============================================================================

-- 1. Nuevas columnas en `usuarios` para el registro personal de cada usuario
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS datos_personales JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS telefono_bizum TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT '#4f46e5',
  ADD COLUMN IF NOT EXISTS presupuesto_mensual NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nomina_mensual NUMERIC(12,2) DEFAULT 0;

-- 2. Nuevas columnas opcionales en `movimientos` para deudas P2P directas entre usuarios
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS acreedor_id BIGINT REFERENCES public.usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;

-- 3. Índices para acelerar consultas por usuario y grupo
CREATE INDEX IF NOT EXISTS idx_movimientos_usuario_tipo ON public.movimientos (usuario_id, tipo);
CREATE INDEX IF NOT EXISTS idx_grupo_usuarios_usuario ON public.grupo_usuarios (usuario_id);
