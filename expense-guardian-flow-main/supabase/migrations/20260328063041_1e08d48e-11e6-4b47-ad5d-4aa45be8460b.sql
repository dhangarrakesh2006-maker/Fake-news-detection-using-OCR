
-- Trigger: auto-create sequential approval chain when an expense is inserted
CREATE OR REPLACE FUNCTION public.create_approval_chain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  submitter_role app_role;
  step_order_counter integer := 1;
  approver_record RECORD;
BEGIN
  -- Get submitter's highest role
  SELECT role INTO submitter_role
  FROM user_roles
  WHERE user_id = NEW.user_id
  ORDER BY CASE role
    WHEN 'admin' THEN 3
    WHEN 'manager' THEN 2
    WHEN 'employee' THEN 1
  END DESC
  LIMIT 1;

  -- Admin expenses are auto-approved
  IF submitter_role = 'admin' THEN
    NEW.status := 'approved';
    RETURN NEW;
  END IF;

  -- For employees: Manager → Admin chain
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

  -- Add admin approval step (for both employees and managers)
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
$$;

-- Attach trigger to expenses table
CREATE TRIGGER on_expense_created
  BEFORE INSERT ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.create_approval_chain();

-- RPC function: process an approval decision (approve/reject)
CREATE OR REPLACE FUNCTION public.process_approval_decision(
  _step_id uuid,
  _decision text,
  _comment text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  step_record RECORD;
  next_step RECORD;
BEGIN
  -- Get the step
  SELECT * INTO step_record FROM approval_steps WHERE id = _step_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval step not found';
  END IF;

  -- Verify caller is the approver
  IF step_record.approver_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to approve this step';
  END IF;

  -- Verify step is pending
  IF step_record.status != 'pending' THEN
    RAISE EXCEPTION 'This step is not pending approval';
  END IF;

  -- Update the step
  UPDATE approval_steps
  SET status = _decision, decided_at = now(), comment = _comment
  WHERE id = _step_id;

  IF _decision = 'rejected' THEN
    -- Reject the expense immediately
    UPDATE expenses SET status = 'rejected' WHERE id = step_record.expense_id;
  ELSIF _decision = 'approved' THEN
    -- Check if there's a next step in the chain
    SELECT * INTO next_step
    FROM approval_steps
    WHERE expense_id = step_record.expense_id
      AND step_order = step_record.step_order + 1;

    IF FOUND THEN
      -- Activate next step, move expense to in_review
      UPDATE approval_steps SET status = 'pending' WHERE id = next_step.id;
      UPDATE expenses SET status = 'in_review' WHERE id = step_record.expense_id;
    ELSE
      -- Last step approved → expense approved
      UPDATE expenses SET status = 'approved' WHERE id = step_record.expense_id;
    END IF;
  END IF;

  RETURN json_build_object('success', true);
END;
$$;
