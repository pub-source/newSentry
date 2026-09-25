
-- Drop all existing RESTRICTIVE policies and recreate as PERMISSIVE

-- === households ===
DROP POLICY IF EXISTS "Anyone can lookup by invite code" ON public.households;
DROP POLICY IF EXISTS "Members can view their household" ON public.households;
DROP POLICY IF EXISTS "Users can create households" ON public.households;

CREATE POLICY "Anyone can lookup by invite code" ON public.households
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create households" ON public.households
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- === household_members ===
DROP POLICY IF EXISTS "Members can view household members" ON public.household_members;
DROP POLICY IF EXISTS "Users can join households" ON public.household_members;
DROP POLICY IF EXISTS "Users can update own membership" ON public.household_members;

CREATE POLICY "Members can view household members" ON public.household_members
  FOR SELECT TO authenticated
  USING (household_id IN (SELECT get_user_household_ids(auth.uid())));

CREATE POLICY "Users can join households" ON public.household_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own membership" ON public.household_members
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- === wake_words ===
DROP POLICY IF EXISTS "Members can view wake words" ON public.wake_words;
DROP POLICY IF EXISTS "Members can create wake words" ON public.wake_words;
DROP POLICY IF EXISTS "Members can delete wake words" ON public.wake_words;

CREATE POLICY "Members can view wake words" ON public.wake_words
  FOR SELECT TO authenticated
  USING (household_id IN (SELECT get_user_household_ids(auth.uid())));

CREATE POLICY "Members can create wake words" ON public.wake_words
  FOR INSERT TO authenticated
  WITH CHECK (household_id IN (SELECT get_user_household_ids(auth.uid())));

CREATE POLICY "Members can delete wake words" ON public.wake_words
  FOR DELETE TO authenticated
  USING (household_id IN (SELECT get_user_household_ids(auth.uid())));

-- === alert_history ===
DROP POLICY IF EXISTS "Members can view alert history" ON public.alert_history;
DROP POLICY IF EXISTS "Members can create alerts" ON public.alert_history;

CREATE POLICY "Members can view alert history" ON public.alert_history
  FOR SELECT TO authenticated
  USING (household_id IN (SELECT get_user_household_ids(auth.uid())));

CREATE POLICY "Members can create alerts" ON public.alert_history
  FOR INSERT TO authenticated
  WITH CHECK (household_id IN (SELECT get_user_household_ids(auth.uid())));
