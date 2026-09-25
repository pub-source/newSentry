
-- Households table with invite codes
CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Household members with phone numbers
CREATE TABLE public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, user_id)
);

-- Custom wake words/phrases per household
CREATE TABLE public.wake_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  phrase TEXT NOT NULL,
  is_emergency BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alert history
CREATE TABLE public.alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  snapshot_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wake_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

-- Households: members can view their household
CREATE POLICY "Members can view their household"
ON public.households FOR SELECT
USING (id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));

-- Households: any authenticated user can create
CREATE POLICY "Users can create households"
ON public.households FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Households: anyone can select by invite_code (for joining)
CREATE POLICY "Anyone can lookup by invite code"
ON public.households FOR SELECT
USING (true);

-- Household members: members can view their household's members
CREATE POLICY "Members can view household members"
ON public.household_members FOR SELECT
USING (household_id IN (SELECT household_id FROM public.household_members hm WHERE hm.user_id = auth.uid()));

-- Household members: authenticated users can join
CREATE POLICY "Users can join households"
ON public.household_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Household members: users can update their own record
CREATE POLICY "Users can update own membership"
ON public.household_members FOR UPDATE
USING (auth.uid() = user_id);

-- Wake words: members can view their household's wake words
CREATE POLICY "Members can view wake words"
ON public.wake_words FOR SELECT
USING (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));

-- Wake words: members can create wake words for their household
CREATE POLICY "Members can create wake words"
ON public.wake_words FOR INSERT
WITH CHECK (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));

-- Wake words: members can delete wake words from their household
CREATE POLICY "Members can delete wake words"
ON public.wake_words FOR DELETE
USING (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));

-- Alert history: members can view their household's alerts
CREATE POLICY "Members can view alert history"
ON public.alert_history FOR SELECT
USING (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));

-- Alert history: members can create alerts
CREATE POLICY "Members can create alerts"
ON public.alert_history FOR INSERT
WITH CHECK (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));
