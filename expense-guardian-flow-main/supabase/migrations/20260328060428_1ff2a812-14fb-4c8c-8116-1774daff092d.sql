
-- Tighten the INSERT policy: only allow if user has no company yet
DROP POLICY "Authenticated users can create a company" ON public.companies;

CREATE POLICY "Users without a company can create one"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (get_user_company_id(auth.uid()) IS NULL);
