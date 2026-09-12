
-- Drop existing trigger
DROP TRIGGER IF EXISTS create_approval_chain_trigger ON expenses;

-- Recreate function as AFTER INSERT (can't modify NEW, so use UPDATE for auto-approve)
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
    UPDATE expenses SET status = 'approved' WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  -- For employees: amounts <= 100 are auto-approved
  IF submitter_role = 'employee' OR submitter_role IS NULL THEN
    IF NEW.amount <= 100 THEN
      UPDATE expenses SET status = 'approved' WHERE id = NEW.id;
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
    UPDATE expenses SET status = 'approved' WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Recreate as AFTER INSERT trigger
CREATE TRIGGER create_approval_chain_trigger
  AFTER INSERT ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION create_approval_chain();
