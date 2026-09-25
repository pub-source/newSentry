-- Drop SMS from wake word actions
ALTER TABLE public.wake_words DROP CONSTRAINT IF EXISTS wake_words_action_type_check;
UPDATE public.wake_words SET action_type = 'email' WHERE action_type IN ('sms','both');
ALTER TABLE public.wake_words ALTER COLUMN action_type SET DEFAULT 'email';
ALTER TABLE public.wake_words ADD CONSTRAINT wake_words_action_type_check CHECK (action_type IN ('in_app','email'));

ALTER TABLE public.notification_log DROP CONSTRAINT IF EXISTS notification_log_action_type_check;
UPDATE public.notification_log SET action_type = 'email' WHERE action_type IN ('sms','both');
ALTER TABLE public.notification_log ADD CONSTRAINT notification_log_action_type_check CHECK (action_type IN ('in_app','email'));

-- Notification settings per household
CREATE TABLE IF NOT EXISTS public.notification_settings (
  household_id UUID PRIMARY KEY REFERENCES public.households(id) ON DELETE CASCADE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_volume NUMERIC NOT NULL DEFAULT 0.8 CHECK (sound_volume >= 0 AND sound_volume <= 1),
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  severity_threshold TEXT NOT NULL DEFAULT 'high' CHECK (severity_threshold IN ('low','medium','high','critical')),
  cooldown_seconds INTEGER NOT NULL DEFAULT 300 CHECK (cooldown_seconds >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_settings TO authenticated;
GRANT ALL ON public.notification_settings TO service_role;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage their household notification settings"
ON public.notification_settings FOR ALL TO authenticated
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())))
WITH CHECK (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

-- Email recipients per household
CREATE TABLE IF NOT EXISTS public.notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  label TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_recipients TO authenticated;
GRANT ALL ON public.notification_recipients TO service_role;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage their household recipients"
ON public.notification_recipients FOR ALL TO authenticated
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())))
WITH CHECK (household_id IN (SELECT public.get_user_household_ids(auth.uid())));