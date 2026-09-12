
-- Allow authenticated users to insert a company (for onboarding)
CREATE POLICY "Authenticated users can create a company"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (true);

-- After creating the company, the user needs to link it to their profile.
-- The existing "Users can update their own profile" policy already allows this.
