-- Migration: CRUD policies for leads table - Seven Gold CRM
-- Execute this in the SQL Editor of your Supabase dashboard (once)

-- 1. Enable RLS on leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "leads_select_authenticated" ON public.leads;
DROP POLICY IF EXISTS "leads_insert_authenticated" ON public.leads;
DROP POLICY IF EXISTS "leads_update_authenticated" ON public.leads;
DROP POLICY IF EXISTS "leads_delete_authenticated" ON public.leads;

-- 3. Create permissive policies for authenticated users
CREATE POLICY "leads_select_authenticated"
  ON public.leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "leads_insert_authenticated"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "leads_update_authenticated"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "leads_delete_authenticated"
  ON public.leads FOR DELETE
  TO authenticated
  USING (true);
