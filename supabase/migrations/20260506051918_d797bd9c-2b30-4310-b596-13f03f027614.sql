CREATE TABLE public.detection_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  submitted_by UUID,
  event_type TEXT NOT NULL,
  label TEXT NOT NULL CHECK (label IN ('correct','false_positive','missed')),
  confidence NUMERIC,
  audio_event TEXT,
  visual_context JSONB DEFAULT '{}'::jsonb,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.detection_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view feedback"
ON public.detection_feedback
FOR SELECT
TO authenticated
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

CREATE POLICY "Members can submit feedback"
ON public.detection_feedback
FOR INSERT
TO authenticated
WITH CHECK (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

CREATE INDEX idx_detection_feedback_household ON public.detection_feedback(household_id, created_at DESC);
CREATE INDEX idx_detection_feedback_event ON public.detection_feedback(event_type, label);