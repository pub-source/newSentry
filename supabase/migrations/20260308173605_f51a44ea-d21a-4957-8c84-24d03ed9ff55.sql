
-- Table for pending join requests (no auth required to insert)
CREATE TABLE public.join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  phone_number text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (anon) can submit a join request
CREATE POLICY "Anyone can submit join request"
  ON public.join_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');

-- Authenticated household members can view requests for their household
CREATE POLICY "Members can view join requests"
  ON public.join_requests FOR SELECT
  TO authenticated
  USING (household_id IN (SELECT get_user_household_ids(auth.uid())));

-- Admins can update (accept/reject) join requests
CREATE POLICY "Members can update join requests"
  ON public.join_requests FOR UPDATE
  TO authenticated
  USING (household_id IN (SELECT get_user_household_ids(auth.uid())));

-- Allow delete for cleanup
CREATE POLICY "Members can delete join requests"
  ON public.join_requests FOR DELETE
  TO authenticated
  USING (household_id IN (SELECT get_user_household_ids(auth.uid())));
