
-- Allow household members without a user account (joined via invite code)
ALTER TABLE public.household_members ALTER COLUMN user_id DROP NOT NULL;
