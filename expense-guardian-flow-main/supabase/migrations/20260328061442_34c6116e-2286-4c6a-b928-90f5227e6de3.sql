
CREATE POLICY "Users can self-promote during onboarding"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND company_id IS NOT NULL
  )
);

CREATE POLICY "Users can delete own role during onboarding"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND company_id IS NOT NULL
  )
);
