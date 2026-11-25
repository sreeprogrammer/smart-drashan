CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (length(btrim(full_name)) BETWEEN 2 AND 120),
  email text,
  date_of_birth date NOT NULL,
  gender text CHECK (gender IS NULL OR gender IN ('female', 'male', 'non_binary', 'prefer_not_to_say')),
  state text NOT NULL DEFAULT 'Tamil Nadu',
  district_id uuid NOT NULL REFERENCES public.districts(id) ON DELETE RESTRICT,
  address text NOT NULL CHECK (length(btrim(address)) BETWEEN 5 AND 500),
  account_type text NOT NULL DEFAULT 'visitor'
    CHECK (account_type IN ('visitor', 'local_resident', 'special_assistance')),
  phone_verified boolean NOT NULL DEFAULT false,
  accepted_terms_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_profiles TO authenticated;

DROP POLICY IF EXISTS "profile_owner_select" ON public.user_profiles;
CREATE POLICY "profile_owner_select" ON public.user_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.create_my_visitor_profile(
  p_full_name text,
  p_email text,
  p_date_of_birth date,
  p_gender text,
  p_district_id uuid,
  p_address text,
  p_account_type text,
  p_accepted_terms boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please sign in');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = v_user_id AND u.phone_confirmed_at IS NOT NULL
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Verify your mobile number before completing registration');
  END IF;

  IF p_accepted_terms IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please accept the Terms and Privacy Policy');
  END IF;

  IF p_full_name IS NULL OR length(btrim(p_full_name)) NOT BETWEEN 2 AND 120
    OR p_date_of_birth IS NULL OR p_date_of_birth >= CURRENT_DATE
    OR p_address IS NULL OR length(btrim(p_address)) NOT BETWEEN 5 AND 500
    OR p_account_type IS NULL OR p_account_type NOT IN ('visitor', 'local_resident', 'special_assistance')
    OR (p_gender IS NOT NULL AND p_gender NOT IN ('female', 'male', 'non_binary', 'prefer_not_to_say'))
    OR NOT EXISTS (SELECT 1 FROM public.districts d WHERE d.id = p_district_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Registration details are invalid');
  END IF;

  INSERT INTO public.user_profiles (
    user_id, full_name, email, date_of_birth, gender, district_id, address,
    account_type, phone_verified, accepted_terms_at
  )
  VALUES (
    v_user_id, btrim(p_full_name), NULLIF(btrim(p_email), ''), p_date_of_birth,
    p_gender, p_district_id, btrim(p_address), p_account_type, true, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    date_of_birth = EXCLUDED.date_of_birth,
    gender = EXCLUDED.gender,
    district_id = EXCLUDED.district_id,
    address = EXCLUDED.address,
    account_type = EXCLUDED.account_type,
    phone_verified = true,
    accepted_terms_at = EXCLUDED.accepted_terms_at,
    updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.create_my_visitor_profile(text, text, date, text, uuid, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_my_visitor_profile(text, text, date, text, uuid, text, text, boolean) TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_profiles FROM anon, authenticated;

ALTER TABLE public.darshan_slot_configs
  ADD COLUMN IF NOT EXISTS booking_opens_at timestamptz,
  ADD COLUMN IF NOT EXISTS booking_closes_at timestamptz;

CREATE TABLE IF NOT EXISTS public.admin_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('state_admin', 'district_admin', 'temple_staff')),
  district_id uuid REFERENCES public.districts(id) ON DELETE RESTRICT,
  temple_id uuid REFERENCES public.temples(id) ON DELETE RESTRICT,
  is_active boolean NOT NULL DEFAULT true,
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (role = 'state_admin' AND district_id IS NULL AND temple_id IS NULL)
    OR (role = 'district_admin' AND district_id IS NOT NULL AND temple_id IS NULL)
    OR (role = 'temple_staff' AND temple_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_assignments_active_state_unique
  ON public.admin_assignments(user_id, role) WHERE is_active AND role = 'state_admin';
CREATE UNIQUE INDEX IF NOT EXISTS admin_assignments_active_scoped_unique
  ON public.admin_assignments(user_id, role, district_id, temple_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS admin_assignments_district_idx
  ON public.admin_assignments(district_id, role) WHERE is_active;
CREATE INDEX IF NOT EXISTS admin_assignments_temple_idx
  ON public.admin_assignments(temple_id, role) WHERE is_active;

ALTER TABLE public.admin_assignments ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.admin_assignments TO authenticated;

CREATE OR REPLACE FUNCTION public.is_state_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_assignments a
    WHERE a.user_id = auth.uid() AND a.role = 'state_admin' AND a.is_active
  ) OR EXISTS (
    SELECT 1 FROM public.temple_admins a
    WHERE a.user_id = auth.uid() AND a.role = 'super_admin' AND a.is_active
  );
$$;

CREATE OR REPLACE FUNCTION public.is_district_admin(p_district_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_state_admin() OR EXISTS (
    SELECT 1 FROM public.admin_assignments a
    WHERE a.user_id = auth.uid() AND a.role = 'district_admin'
      AND a.district_id = p_district_id AND a.is_active
  );
$$;

CREATE OR REPLACE FUNCTION public.is_temple_admin(p_temple_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_state_admin()
    OR EXISTS (
      SELECT 1
      FROM public.temples t
      JOIN public.admin_assignments a
        ON a.user_id = auth.uid() AND a.is_active
       AND (
         (a.role = 'district_admin' AND a.district_id = t.district_id)
         OR (a.role = 'temple_staff' AND a.temple_id = t.id)
       )
      WHERE t.id = p_temple_id
    )
    OR EXISTS (
      SELECT 1 FROM public.temple_admins a
      WHERE a.user_id = auth.uid() AND a.is_active
        AND (a.role = 'super_admin' OR a.temple_id = p_temple_id)
    );
$$;

REVOKE ALL ON FUNCTION public.is_state_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_district_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_temple_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_state_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_district_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_temple_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS "admin_assignments_self_or_state_read" ON public.admin_assignments;
CREATE POLICY "admin_assignments_self_or_state_read" ON public.admin_assignments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_state_admin());

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id),
  district_id uuid REFERENCES public.districts(id),
  temple_id uuid REFERENCES public.temples(id),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.admin_audit_logs TO authenticated;
DROP POLICY IF EXISTS "state_admin_read_audit_logs" ON public.admin_audit_logs;
CREATE POLICY "state_admin_read_audit_logs" ON public.admin_audit_logs
  FOR SELECT TO authenticated USING (public.is_state_admin());

CREATE OR REPLACE FUNCTION public.admin_set_assignment(
  p_user_id uuid,
  p_role text,
  p_district_id uuid,
  p_temple_id uuid,
  p_active boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_state_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'State Admin access is required');
  END IF;
  IF p_active IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assignment status is required');
  END IF;
  IF p_user_id IS NULL OR (p_user_id = auth.uid() AND p_role = 'district_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid administrator assignment');
  END IF;
  IF p_role IS NULL OR p_role NOT IN ('state_admin', 'district_admin', 'temple_staff')
    OR (p_role = 'state_admin' AND (p_district_id IS NOT NULL OR p_temple_id IS NOT NULL))
    OR (p_role = 'district_admin' AND (p_district_id IS NULL OR p_temple_id IS NOT NULL))
    OR (p_role = 'temple_staff' AND (p_temple_id IS NULL OR p_district_id IS NOT NULL))
    OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user_id)
    OR (p_district_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.districts d WHERE d.id = p_district_id))
    OR (p_temple_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.temples t WHERE t.id = p_temple_id)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid administrator assignment');
  END IF;

  IF p_role = 'state_admin' AND NOT p_active THEN
    PERFORM pg_advisory_xact_lock(917321);
  END IF;
  IF p_role = 'state_admin' AND NOT p_active
    AND (SELECT count(*) FROM public.admin_assignments a WHERE a.role = 'state_admin' AND a.is_active) <= 1
    AND (SELECT count(*) FROM public.temple_admins a WHERE a.role = 'super_admin' AND a.is_active) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'At least one State Admin must remain active');
  END IF;

  IF p_role = 'district_admin' AND p_active THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':district_admin', 0));
    UPDATE public.admin_assignments
    SET is_active = false, updated_at = now()
    WHERE user_id = p_user_id AND role = 'district_admin' AND is_active
      AND district_id IS DISTINCT FROM p_district_id;
  END IF;

  UPDATE public.admin_assignments
  SET is_active = false, updated_at = now()
  WHERE user_id = p_user_id AND role = p_role
    AND district_id IS NOT DISTINCT FROM p_district_id
    AND temple_id IS NOT DISTINCT FROM p_temple_id
    AND is_active IS DISTINCT FROM p_active;

  IF p_active AND NOT EXISTS (
    SELECT 1 FROM public.admin_assignments a
    WHERE a.user_id = p_user_id AND a.role = p_role
      AND a.district_id IS NOT DISTINCT FROM p_district_id
      AND a.temple_id IS NOT DISTINCT FROM p_temple_id AND a.is_active
  ) THEN
    INSERT INTO public.admin_assignments(user_id, role, district_id, temple_id, is_active, assigned_by)
    VALUES (p_user_id, p_role, p_district_id, p_temple_id, true, auth.uid());
  END IF;

  INSERT INTO public.admin_audit_logs(actor_id, action, target_user_id, district_id, temple_id, details)
  VALUES (auth.uid(), CASE WHEN p_active THEN 'assignment_activated' ELSE 'assignment_deactivated' END,
          p_user_id, p_district_id, p_temple_id, jsonb_build_object('role', p_role));

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_assignment(uuid, text, uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_assignment(uuid, text, uuid, uuid, boolean) TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.admin_assignments, public.admin_audit_logs FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.slot_allocation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid NOT NULL REFERENCES public.districts(id) ON DELETE RESTRICT,
  temple_id uuid NOT NULL REFERENCES public.temples(id) ON DELETE RESTRICT,
  submitted_by uuid NOT NULL REFERENCES auth.users(id),
  category_type text NOT NULL CHECK (category_type IN ('local', 'special')),
  available_date date NOT NULL,
  session_type text NOT NULL CHECK (session_type IN ('morning', 'evening')),
  session_start_time time NOT NULL,
  session_end_time time NOT NULL,
  slot_duration_minutes integer NOT NULL DEFAULT 60 CHECK (slot_duration_minutes = 60),
  total_capacity integer NOT NULL CHECK (total_capacity > 0),
  senior_capacity integer NOT NULL DEFAULT 0 CHECK (senior_capacity >= 0),
  ticket_price numeric(10,2) NOT NULL DEFAULT 0 CHECK (ticket_price >= 0),
  booking_opens_at timestamptz,
  booking_closes_at timestamptz,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'changes_requested', 'published', 'closed')),
  admin_remarks text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  config_id uuid REFERENCES public.darshan_slot_configs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (session_end_time - session_start_time = interval '2 hours'),
  CHECK (session_start_time < session_end_time),
  CHECK (booking_closes_at IS NULL OR booking_opens_at IS NULL OR booking_closes_at > booking_opens_at),
  CHECK (
    (category_type = 'local' AND total_capacity = 100 AND senior_capacity = 25 AND ticket_price = 0)
    OR (category_type = 'special' AND total_capacity = 50 AND senior_capacity = 0 AND ticket_price = 500)
  )
);

CREATE INDEX IF NOT EXISTS slot_allocation_requests_district_status_idx
  ON public.slot_allocation_requests(district_id, status, available_date);
CREATE INDEX IF NOT EXISTS slot_allocation_requests_temple_date_idx
  ON public.slot_allocation_requests(temple_id, available_date, session_type);
ALTER TABLE public.slot_allocation_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.slot_allocation_requests TO authenticated;
DROP POLICY IF EXISTS "slot_request_scoped_read" ON public.slot_allocation_requests;
CREATE POLICY "slot_request_scoped_read" ON public.slot_allocation_requests
  FOR SELECT TO authenticated USING (
    submitted_by = auth.uid() OR public.is_state_admin() OR public.is_district_admin(district_id)
  );
REVOKE INSERT, UPDATE, DELETE ON public.slot_allocation_requests FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_slot_allocation_request(
  p_temple_id uuid,
  p_category_type text,
  p_available_date date,
  p_session_type text,
  p_session_start_time time,
  p_session_end_time time,
  p_total_capacity integer,
  p_senior_capacity integer,
  p_ticket_price numeric,
  p_booking_opens_at timestamptz,
  p_booking_closes_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_district_id uuid;
  v_request_id uuid;
BEGIN
  SELECT district_id INTO v_district_id FROM public.temples WHERE id = p_temple_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Temple not found');
  END IF;
  IF auth.uid() IS NULL OR NOT public.is_district_admin(v_district_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized for this district');
  END IF;
  IF p_available_date IS NULL OR p_available_date < CURRENT_DATE
    OR p_category_type IS NULL OR p_session_type IS NULL
    OR p_session_start_time IS NULL OR p_session_end_time IS NULL
    OR p_total_capacity IS NULL OR p_senior_capacity IS NULL OR p_ticket_price IS NULL
    OR p_session_type NOT IN ('morning', 'evening')
    OR p_session_end_time - p_session_start_time <> interval '2 hours'
    OR p_session_start_time >= p_session_end_time
    OR NOT (
      (p_category_type = 'local' AND p_total_capacity = 100 AND p_senior_capacity = 25 AND p_ticket_price = 0)
      OR (p_category_type = 'special' AND p_total_capacity = 50 AND p_senior_capacity = 0 AND p_ticket_price = 500)
    )
    OR (p_booking_opens_at IS NOT NULL AND p_booking_closes_at IS NOT NULL AND p_booking_closes_at <= p_booking_opens_at) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slot configuration does not meet the authorized capacity and timing rules');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_temple_id::text || p_available_date::text || p_session_type, 0));

  IF EXISTS (
    SELECT 1 FROM public.slot_allocation_requests r
    WHERE r.temple_id = p_temple_id AND r.available_date = p_available_date
      AND r.session_type = p_session_type
      AND r.status IN ('submitted', 'under_review', 'approved', 'published', 'closed')
      AND p_session_start_time < r.session_end_time AND p_session_end_time > r.session_start_time
  ) OR EXISTS (
    SELECT 1 FROM public.darshan_slots s
    WHERE s.temple_id = p_temple_id AND s.slot_date = p_available_date
      AND p_session_start_time < s.slot_end_time AND p_session_end_time > s.slot_start_time
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This time overlaps an existing slot or request');
  END IF;

  INSERT INTO public.slot_allocation_requests(
    district_id, temple_id, submitted_by, category_type, available_date, session_type,
    session_start_time, session_end_time, total_capacity, senior_capacity, ticket_price,
    booking_opens_at, booking_closes_at
  )
  VALUES (
    v_district_id, p_temple_id, auth.uid(), p_category_type, p_available_date, p_session_type,
    p_session_start_time, p_session_end_time, p_total_capacity, p_senior_capacity, p_ticket_price,
    p_booking_opens_at, p_booking_closes_at
  ) RETURNING id INTO v_request_id;

  INSERT INTO public.admin_audit_logs(actor_id, action, district_id, temple_id, details)
  VALUES (auth.uid(), 'slot_request_submitted', v_district_id, p_temple_id, jsonb_build_object('request_id', v_request_id));

  RETURN jsonb_build_object('success', true, 'request_id', v_request_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_slot_allocation_request(uuid, text, date, text, time, time, integer, integer, numeric, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_slot_allocation_request(uuid, text, date, text, time, time, integer, integer, numeric, timestamptz, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_slot_allocation_request(
  p_request_id uuid,
  p_decision text,
  p_remarks text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.slot_allocation_requests%ROWTYPE;
  v_config_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_state_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'State Admin access is required');
  END IF;
  IF p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected', 'changes_requested')
    OR (p_decision <> 'approved' AND NULLIF(btrim(p_remarks), '') IS NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Choose a valid decision and provide remarks when not approving');
  END IF;

  SELECT * INTO v_request FROM public.slot_allocation_requests
  WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slot request not found');
  END IF;
  IF v_request.submitted_by = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Administrators cannot approve their own slot request');
  END IF;
  IF v_request.status NOT IN ('submitted', 'under_review', 'changes_requested') THEN
    RETURN jsonb_build_object('success', false, 'error', 'This slot request has already been processed');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_request.temple_id::text || v_request.available_date::text || v_request.session_type, 0));
  IF p_decision = 'approved' AND EXISTS (
    SELECT 1 FROM public.darshan_slots s
    WHERE s.temple_id = v_request.temple_id AND s.slot_date = v_request.available_date
      AND v_request.session_start_time < s.slot_end_time
      AND v_request.session_end_time > s.slot_start_time
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'The requested time now overlaps a published slot');
  END IF;

  IF p_decision = 'approved' THEN
    INSERT INTO public.darshan_slot_configs(
      temple_id, category_type, session_type, available_date,
      session_start_time, session_end_time, slot_duration_minutes, is_active,
      booking_opens_at, booking_closes_at
    )
    VALUES (
      v_request.temple_id, v_request.category_type, v_request.session_type, v_request.available_date,
      v_request.session_start_time, v_request.session_end_time, 60, true,
      v_request.booking_opens_at, v_request.booking_closes_at
    ) RETURNING id INTO v_config_id;

    INSERT INTO public.darshan_slots(
      config_id, temple_id, category_type, slot_date, session_type,
      slot_start_time, slot_end_time, total_capacity, senior_capacity
    )
    SELECT
      v_config_id, v_request.temple_id, v_request.category_type, v_request.available_date,
      v_request.session_type,
      (v_request.session_start_time + make_interval(hours => n))::time,
      (v_request.session_start_time + make_interval(hours => n + 1))::time,
      v_request.total_capacity, v_request.senior_capacity
    FROM generate_series(0, 1) AS n;
  END IF;

  UPDATE public.slot_allocation_requests
  SET status = CASE WHEN p_decision = 'approved' THEN 'published' ELSE p_decision END,
      admin_remarks = NULLIF(btrim(p_remarks), ''),
      reviewed_by = auth.uid(), reviewed_at = now(), config_id = v_config_id, updated_at = now()
  WHERE id = p_request_id;

  INSERT INTO public.admin_audit_logs(actor_id, action, district_id, temple_id, details)
  VALUES (auth.uid(), 'slot_request_' || CASE WHEN p_decision = 'approved' THEN 'published' ELSE p_decision END,
          v_request.district_id, v_request.temple_id,
          jsonb_build_object('request_id', p_request_id, 'remarks', NULLIF(btrim(p_remarks), '')));

  RETURN jsonb_build_object('success', true, 'status', CASE WHEN p_decision = 'approved' THEN 'published' ELSE p_decision END);
END;
$$;

REVOKE ALL ON FUNCTION public.review_slot_allocation_request(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_slot_allocation_request(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_senior_min_age(p_temple_id uuid, p_min_age int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_temple_admin boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_temple_admin(p_temple_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized for this temple');
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.temple_admins a
    WHERE a.user_id = auth.uid() AND a.is_active
      AND (a.role = 'super_admin' OR a.temple_id = p_temple_id)
  ) INTO v_is_temple_admin;
  IF NOT public.is_state_admin() AND NOT v_is_temple_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'District Admins cannot change global eligibility rules');
  END IF;
  IF p_min_age IS NULL OR p_min_age < 50 OR p_min_age > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Eligibility age must be between 50 and 100');
  END IF;

  UPDATE public.darshan_categories
  SET senior_min_age = p_min_age, updated_at = now()
  WHERE temple_id = p_temple_id AND category_type = 'local';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Local Darshan is not configured for this temple');
  END IF;
  RETURN jsonb_build_object('success', true, 'senior_min_age', p_min_age);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_senior_min_age(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_senior_min_age(uuid, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_slot_booking_window()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opens_at timestamptz;
  v_closes_at timestamptz;
BEGIN
  SELECT c.booking_opens_at, c.booking_closes_at
  INTO v_opens_at, v_closes_at
  FROM public.darshan_slots s
  JOIN public.darshan_slot_configs c ON c.id = s.config_id
  WHERE s.id = NEW.slot_id;

  IF v_opens_at IS NOT NULL AND now() < v_opens_at THEN
    RAISE EXCEPTION 'Bookings for this slot have not opened yet';
  END IF;
  IF v_closes_at IS NOT NULL AND now() >= v_closes_at THEN
    RAISE EXCEPTION 'The booking window for this slot has closed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_slot_booking_window ON public.bookings;
CREATE TRIGGER check_slot_booking_window
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_slot_booking_window();

REVOKE INSERT, UPDATE ON public.bookings FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_ticket(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;
  IF auth.uid() IS NULL OR NOT public.is_temple_admin(v_booking.temple_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: assigned administrator access required');
  END IF;

  IF v_booking.booking_status <> 'confirmed' THEN
    INSERT INTO public.ticket_validations(booking_id, validated_by, is_valid)
    VALUES (p_booking_id, auth.uid(), false);
    RETURN jsonb_build_object('success', true, 'is_valid', false, 'error', 'Ticket is not confirmed');
  END IF;

  IF EXISTS (SELECT 1 FROM public.ticket_validations WHERE booking_id = p_booking_id AND is_valid) THEN
    INSERT INTO public.ticket_validations(booking_id, validated_by, is_valid)
    VALUES (p_booking_id, auth.uid(), false);
    RETURN jsonb_build_object('success', true, 'is_valid', false, 'error', 'Ticket already used — duplicate entry detected');
  END IF;

  INSERT INTO public.ticket_validations(booking_id, validated_by, is_valid)
  VALUES (p_booking_id, auth.uid(), true);
  UPDATE public.bookings SET booking_status = 'completed', updated_at = now() WHERE id = p_booking_id;
  RETURN jsonb_build_object('success', true, 'is_valid', true, 'message', 'Ticket validated successfully');
END;
$$;

REVOKE ALL ON FUNCTION public.validate_ticket(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_ticket(uuid) TO authenticated;
