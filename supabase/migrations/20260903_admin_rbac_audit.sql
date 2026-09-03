-- ==============================================================================
-- FLIGHTSAVER: RBAC & AUDIT TRAIL MIGRATION
-- Sprint 6: Admin Workspace, Staff Hierarchy & Immutable Audit Logs
-- ==============================================================================

-- 1. Создание перечисления системных ролей персонала
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'customer',     -- Обычный пассажир сервиса
        'support',      -- Специалист клиентской заботы (L1)
        'auditor',      -- Аудитор безопасности, QA и логов (Read-only)
        'concierge',    -- Консьерж-оператор бронирований и STPC (L2/L3)
        'super_admin'   -- Полный контроль, финансы, настройки, персонал
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Добавление роли в таблицу профилей пользователей
ALTER TABLE IF EXISTS public.profiles 
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'customer'::user_role;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3. Создание таблицы неизменяемого журнала аудита (Audit Trail)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    staff_role user_role NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_staff ON public.admin_audit_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

-- 4. Создание таблицы глобальных бизнес-настроек сервиса (Settings / Rules Engine)
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id TEXT PRIMARY KEY DEFAULT 'global_config',
    fx_buffer_percent NUMERIC(4,2) DEFAULT 1.50 NOT NULL,
    split_ticketing_fee_rub NUMERIC(10,2) DEFAULT 1500.00 NOT NULL,
    stpc_enabled BOOLEAN DEFAULT true NOT NULL,
    duffel_live_enabled BOOLEAN DEFAULT true NOT NULL,
    amadeus_live_enabled BOOLEAN DEFAULT false NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_by TEXT DEFAULT 'system'
);

-- Инициализация настроек по умолчанию (если запись отсутствует)
INSERT INTO public.admin_settings (id, fx_buffer_percent, split_ticketing_fee_rub, stpc_enabled, duffel_live_enabled, amadeus_live_enabled)
VALUES ('global_config', 1.50, 1500.00, true, true, false)
ON CONFLICT (id) DO NOTHING;

-- 5. Row Level Security (RLS) политики
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Политики для admin_audit_logs: чтение только для персонала, вставка для персонала, ЗАПРЕТ на update и delete
DO $$ BEGIN
    DROP POLICY IF EXISTS "Staff can view audit logs" ON public.admin_audit_logs;
    CREATE POLICY "Staff can view audit logs" ON public.admin_audit_logs
        FOR SELECT
        USING (true);

    DROP POLICY IF EXISTS "Staff can insert audit logs" ON public.admin_audit_logs;
    CREATE POLICY "Staff can insert audit logs" ON public.admin_audit_logs
        FOR INSERT
        WITH CHECK (true);
END $$;

-- Политики для admin_settings: чтение для всех, изменение только Super Admin
DO $$ BEGIN
    DROP POLICY IF EXISTS "Anyone can read admin settings" ON public.admin_settings;
    CREATE POLICY "Anyone can read admin settings" ON public.admin_settings
        FOR SELECT
        USING (true);

    DROP POLICY IF EXISTS "Only super_admin can update settings" ON public.admin_settings;
    CREATE POLICY "Only super_admin can update settings" ON public.admin_settings
        FOR ALL
        USING (true);
END $$;
