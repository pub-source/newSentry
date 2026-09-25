-- Drop the old policy that only allows authenticated users
DROP POLICY "Anyone can lookup by invite code" ON public.households;

-- Recreate allowing both anon and authenticated to lookup by invite code
CREATE POLICY "Anyone can lookup by invite code"
  ON public.households FOR SELECT
  TO anon, authenticated
  USING (true);