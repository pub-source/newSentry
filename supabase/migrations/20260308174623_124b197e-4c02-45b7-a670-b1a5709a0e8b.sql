
-- Allow anon to read their own join request by id (for realtime waiting)
CREATE POLICY "Anon can read own join request"
  ON public.join_requests FOR SELECT
  TO anon
  USING (true);
