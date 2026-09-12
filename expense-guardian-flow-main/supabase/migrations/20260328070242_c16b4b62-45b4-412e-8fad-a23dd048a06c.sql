-- CEO can view all company expenses
CREATE POLICY "CEO can view company expenses"
ON public.expenses FOR SELECT TO public
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'ceo'::app_role)
);

-- CEO can update any expense in company
CREATE POLICY "CEO can update any expense"
ON public.expenses FOR UPDATE TO public
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'ceo'::app_role)
);

-- CEO can view fraud alerts
CREATE POLICY "CEO can view fraud alerts"
ON public.fraud_alerts FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'ceo'::app_role)
  AND company_id = get_user_company_id(auth.uid())
);

-- CEO can update fraud alerts
CREATE POLICY "CEO can update fraud alerts"
ON public.fraud_alerts FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'ceo'::app_role)
  AND company_id = get_user_company_id(auth.uid())
);

-- CEO can insert fraud alerts
CREATE POLICY "CEO can insert fraud alerts"
ON public.fraud_alerts FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'ceo'::app_role)
  AND company_id = get_user_company_id(auth.uid())
);

-- CEO can manage all roles (like admin)
CREATE POLICY "CEO can manage all roles"
ON public.user_roles FOR ALL TO public
USING (has_role(auth.uid(), 'ceo'::app_role));

-- CEO can view all approval steps in company
CREATE POLICY "CEO can view company approval steps"
ON public.approval_steps FOR SELECT TO public
USING (
  has_role(auth.uid(), 'ceo'::app_role)
  AND EXISTS (
    SELECT 1 FROM expenses
    WHERE expenses.id = approval_steps.expense_id
    AND expenses.company_id = get_user_company_id(auth.uid())
  )
);

-- CEO can update approval steps
CREATE POLICY "CEO can update approval steps"
ON public.approval_steps FOR UPDATE TO public
USING (
  has_role(auth.uid(), 'ceo'::app_role)
  AND EXISTS (
    SELECT 1 FROM expenses
    WHERE expenses.id = approval_steps.expense_id
    AND expenses.company_id = get_user_company_id(auth.uid())
  )
);

-- Update approval chain to auto-approve CEO submissions
CREATE OR REPLACE FUNCTION public.create_approval_chain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  submitter_role app_role;
  step_order_counter integer := 1;
  approver_record RECORD;
BEGIN
  SELECT role INTO submitter_role
  FROM user_roles
  WHERE user_id = NEW.user_id
  ORDER BY CASE role
    WHEN 'ceo' THEN 4
    WHEN 'admin' THEN 3
    WHEN 'manager' THEN 2
    WHEN 'employee' THEN 1
  END DESC
  LIMIT 1;

  IF submitter_role = 'admin' OR submitter_role = 'ceo' THEN
    NEW.status := 'approved';
    RETURN NEW;
  END IF;

  IF submitter_role = 'employee' OR submitter_role IS NULL THEN
    FOR approver_record IN
      SELECT ur.user_id
      FROM user_roles ur
      JOIN profiles p ON p.user_id = ur.user_id
      WHERE ur.role = 'manager'
        AND p.company_id = NEW.company_id
        AND ur.user_id != NEW.user_id
      LIMIT 1
    LOOP
      INSERT INTO approval_steps (expense_id, approver_id, step_order, role_label, status)
      VALUES (NEW.id, approver_record.user_id, step_order_counter, 'Manager',
              CASE WHEN step_order_counter = 1 THEN 'pending' ELSE 'waiting' END);
      step_order_counter := step_order_counter + 1;
    END LOOP;
  END IF;

  FOR approver_record IN
    SELECT ur.user_id
    FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.role = 'admin'
      AND p.company_id = NEW.company_id
      AND ur.user_id != NEW.user_id
    LIMIT 1
  LOOP
    INSERT INTO approval_steps (expense_id, approver_id, step_order, role_label, status)
    VALUES (NEW.id, approver_record.user_id, step_order_counter, 'Admin',
            CASE WHEN step_order_counter = 1 THEN 'pending' ELSE 'waiting' END);
    step_order_counter := step_order_counter + 1;
  END LOOP;

  IF step_order_counter = 1 THEN
    NEW.status := 'approved';
  END IF;

  RETURN NEW;
END;
$function$;