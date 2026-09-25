-- Create notification_log table to track sent notifications
CREATE TABLE public.notification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  wake_word_id UUID REFERENCES public.wake_words(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('sms', 'email', 'both')),
  phrase_matched TEXT NOT NULL,
  is_emergency BOOLEAN NOT NULL DEFAULT false,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  triggered_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Members can view notification logs for their household
CREATE POLICY "Members can view notification logs"
  ON public.notification_log FOR SELECT
  USING (household_id IN (SELECT get_user_household_ids(auth.uid())));

-- Members can create notification logs for their household
CREATE POLICY "Members can create notification logs"
  ON public.notification_log FOR INSERT
  WITH CHECK (household_id IN (SELECT get_user_household_ids(auth.uid())));