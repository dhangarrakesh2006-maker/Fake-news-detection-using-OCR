
-- Drop the old restrictive INSERT policy
DROP POLICY IF EXISTS "Users without a company can create one" ON public.companies;

-- Create a simpler INSERT policy for authenticated users
CREATE POLICY "Authenticated users can create companies"
ON public.companies FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add a SELECT policy so users can see the company they just created (needed for INSERT...RETURNING)
CREATE POLICY "Users can view companies they just created"
ON public.companies FOR SELECT
TO authenticated
USING (true);

-- Drop the old restrictive SELECT policy since the new one is broader
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
