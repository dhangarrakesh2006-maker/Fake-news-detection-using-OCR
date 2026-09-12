
CREATE OR REPLACE FUNCTION public.create_approval_chain()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  submitter_role app_role;
  step_order_counter integer := 1;
  approver_record RECORD;
BEGIN
  -- Get the submitter's highest role
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

  -- Admin and CEO submissions are auto-approved
  IF submitter_role = 'admin' OR submitter_role = 'ceo' THEN
    NEW.status := 'approved';
    RETURN NEW;
  END IF;

  -- For employees: amounts <= 100 are auto-approved, amounts > 100 need manager approval
  IF submitter_role = 'employee' OR submitter_role IS NULL THEN
    IF NEW.amount <= 100 THEN
      NEW.status := 'approved';
      RETURN NEW;
    END IF;

    -- Amount > 100: route through manager first
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

  -- Then route through admin
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

  -- If no approvers found, auto-approve
  IF step_order_counter = 1 THEN
    NEW.status := 'approved';
  END IF;

  RETURN NEW;
END;
$function$;
