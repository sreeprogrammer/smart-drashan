/*
# Harden darshan booking rules

Moves eligibility, pricing and duplicate checks onto the server, adds the
senior citizen verification table, scopes admin actions to the admin's own
temple, and closes the audit log to direct writes.

## 1. New Tables
- `senior_verifications` - one row per senior citizen application. Holds the
  visitor's name and date of birth, a status (pending / approved / rejected),
  and the reviewing admin. No Aadhaar number is stored.

## 2. Modified Functions
- `book_darshan_slot` - eligibility (age and approved verification), senior
  flag, ticket price and duplicate-booking checks now run on the server. The
  client's senior flag and price are no longer trusted.
- `admin_approve_booking`, `admin_reject_booking`, `validate_ticket` - only
  active admins of the booking's temple (or super admins) may act.
- New helper `is_temple_admin(temple_id)`.

## 3. Security Changes
- `senior_verifications`: RLS on; users see and create only their own rows;
  temple admins see rows for their temple.
- `bookings`: temple admins can read bookings for their temple.
- `booking_audit_logs`: direct inserts by signed-in users removed. Entries are
  written only by the booking functions.

## 4. Important Notes
1. Age is calculated on the server from the date of birth.
2. Senior tickets require an approved verification for the same temple and
   date of birth.
3. Ticket price for special darshan is calculated on the server.
4. Re-running this migration is safe.
*/

CREATE OR REPLACE FUNCTION is_temple_admin(p_temple_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM temple_admins ta
    WHERE ta.user_id = auth.uid()
      AND ta.is_active = true
      AND (ta.role = 'super_admin' OR ta.temple_id = p_temple_id)
  );
$$;

REVOKE EXECUTE ON FUNCTION is_temple_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_temple_admin(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS senior_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  temple_id uuid NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
  visitor_name text NOT NULL,
  date_of_birth date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_remarks text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE senior_verifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON senior_verifications TO authenticated;

CREATE INDEX IF NOT EXISTS idx_senior_verifications_user_temple ON senior_verifications(user_id, temple_id);
CREATE INDEX IF NOT EXISTS idx_senior_verifications_temple_status ON senior_verifications(temple_id, status);

DROP POLICY IF EXISTS "select_own_senior_verifications" ON senior_verifications;
CREATE POLICY "select_own_senior_verifications"
ON senior_verifications FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_temple_senior_verifications" ON senior_verifications;
CREATE POLICY "select_temple_senior_verifications"
ON senior_verifications FOR SELECT
TO authenticated USING (is_temple_admin(temple_id));

DROP POLICY IF EXISTS "insert_own_senior_verifications" ON senior_verifications;
CREATE POLICY "insert_own_senior_verifications"
ON senior_verifications FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending' AND reviewed_by IS NULL);

DROP POLICY IF EXISTS "select_temple_bookings" ON bookings;
CREATE POLICY "select_temple_bookings"
ON bookings FOR SELECT
TO authenticated USING (is_temple_admin(temple_id));

DROP POLICY IF EXISTS "insert_audit_logs" ON booking_audit_logs;
REVOKE INSERT ON booking_audit_logs FROM authenticated;

CREATE OR REPLACE FUNCTION book_darshan_slot(
  p_temple_id uuid,
  p_slot_id uuid,
  p_category_type text,
  p_visitor_name text,
  p_visitor_mobile text,
  p_date_of_birth date,
  p_is_senior boolean,
  p_aadhaar_masked text,
  p_visitor_count int,
  p_total_price numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot RECORD;
  v_category RECORD;
  v_booking_id uuid;
  v_booking_ref text;
  v_next_val bigint;
  v_general_remaining int;
  v_senior_remaining int;
  v_age int;
  v_is_senior boolean := false;
  v_price numeric := 0;
  v_aadhaar_status text;
  v_residency_status text;
  v_payment_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please sign in to book darshan');
  END IF;

  IF p_visitor_count IS NULL OR p_visitor_count < 1 OR p_visitor_count > 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Visitor count must be between 1 and 10');
  END IF;

  IF p_category_type NOT IN ('local', 'special') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unknown darshan category');
  END IF;

  SELECT * INTO v_slot FROM darshan_slots WHERE id = p_slot_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slot not found');
  END IF;

  IF v_slot.temple_id <> p_temple_id OR v_slot.category_type <> p_category_type THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slot does not match the selected temple or category');
  END IF;

  IF v_slot.is_closed THEN
    RETURN jsonb_build_object('success', false, 'error', 'This slot is closed');
  END IF;

  IF v_slot.slot_date < CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error', 'This slot has already passed');
  END IF;

  IF EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.user_id = auth.uid()
      AND b.slot_id = p_slot_id
      AND b.booking_status IN ('pending', 'confirmed')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have a booking for this slot');
  END IF;

  SELECT * INTO v_category FROM darshan_categories
  WHERE temple_id = p_temple_id AND category_type = p_category_type AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'This darshan category is not available');
  END IF;

  IF p_category_type = 'local' THEN
    IF p_date_of_birth IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Date of birth is required');
    END IF;
    v_age := date_part('year', age(CURRENT_DATE, p_date_of_birth))::int;
    IF p_is_senior THEN
      IF v_age < v_category.senior_min_age THEN
        RETURN jsonb_build_object('success', false, 'error', 'Senior citizen eligibility age not met');
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM senior_verifications sv
        WHERE sv.user_id = auth.uid()
          AND sv.temple_id = p_temple_id
          AND sv.date_of_birth = p_date_of_birth
          AND sv.status = 'approved'
      ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Senior citizen verification is not approved');
      END IF;
      v_is_senior := true;
    END IF;
    v_price := 0;
  ELSE
    v_is_senior := false;
    v_price := v_category.price * p_visitor_count;
  END IF;

  v_general_remaining := v_slot.total_capacity - v_slot.senior_capacity - v_slot.booked_general;
  v_senior_remaining := v_slot.senior_capacity - v_slot.booked_senior;

  IF v_is_senior THEN
    IF v_senior_remaining < p_visitor_count THEN
      RETURN jsonb_build_object('success', false, 'error', 'Senior citizen capacity is full for this slot');
    END IF;
  ELSE
    IF v_general_remaining < p_visitor_count THEN
      RETURN jsonb_build_object('success', false, 'error', 'General capacity is full for this slot');
    END IF;
  END IF;

  SELECT nextval('booking_ref_seq') INTO v_next_val;
  v_booking_ref := CASE
    WHEN p_category_type = 'local' THEN 'SD-LOCAL-' || v_next_val::text
    ELSE 'SD-SPECIAL-' || v_next_val::text
  END;

  IF p_category_type = 'local' THEN
    v_aadhaar_status := 'pending';
    v_residency_status := 'not_required';
    v_payment_status := 'not_required';
  ELSE
    v_aadhaar_status := 'not_required';
    v_residency_status := 'pending';
    v_payment_status := 'pending';
  END IF;

  INSERT INTO bookings (
    booking_ref, user_id, temple_id, slot_id, category_type,
    visitor_name, visitor_mobile, date_of_birth, is_senior,
    aadhaar_masked, aadhaar_verification_status, residency_verification_status,
    visitor_count, total_price, payment_status, booking_status,
    darshan_date
  ) VALUES (
    v_booking_ref, auth.uid(), p_temple_id, p_slot_id, p_category_type,
    p_visitor_name, p_visitor_mobile, p_date_of_birth, v_is_senior,
    p_aadhaar_masked, v_aadhaar_status, v_residency_status,
    p_visitor_count, v_price, v_payment_status, 'pending',
    v_slot.slot_date
  )
  RETURNING id INTO v_booking_id;

  IF v_is_senior THEN
    UPDATE darshan_slots SET booked_senior = booked_senior + p_visitor_count WHERE id = p_slot_id;
  ELSE
    UPDATE darshan_slots SET booked_general = booked_general + p_visitor_count WHERE id = p_slot_id;
  END IF;

  INSERT INTO booking_audit_logs (booking_id, action, performed_by, remarks, new_status)
  VALUES (v_booking_id, 'booking_created', auth.uid(), 'Booking submitted by user', 'pending');

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'booking_ref', v_booking_ref,
    'total_price', v_price
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION book_darshan_slot FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION book_darshan_slot TO authenticated;

CREATE OR REPLACE FUNCTION admin_approve_booking(
  p_booking_id uuid,
  p_remarks text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_new_status text;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF NOT is_temple_admin(v_booking.temple_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: admin access required for this temple');
  END IF;

  v_new_status := v_booking.booking_status;

  IF v_booking.category_type = 'local' THEN
    UPDATE bookings SET
      aadhaar_verification_status = 'approved',
      booking_status = 'confirmed',
      admin_remarks = p_remarks,
      verified_by = auth.uid(),
      verified_at = now(),
      updated_at = now()
    WHERE id = p_booking_id;
    v_new_status := 'confirmed';
  ELSE
    UPDATE bookings SET
      residency_verification_status = 'approved',
      admin_remarks = p_remarks,
      verified_by = auth.uid(),
      verified_at = now(),
      updated_at = now()
    WHERE id = p_booking_id;
    IF v_booking.payment_status = 'paid' THEN
      UPDATE bookings SET booking_status = 'confirmed', updated_at = now() WHERE id = p_booking_id;
      v_new_status := 'confirmed';
    END IF;
  END IF;

  INSERT INTO booking_audit_logs (booking_id, action, performed_by, remarks, old_status, new_status)
  VALUES (p_booking_id, 'admin_approved', auth.uid(), p_remarks, v_booking.booking_status, v_new_status);

  RETURN jsonb_build_object('success', true, 'new_status', v_new_status);
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_approve_booking FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_approve_booking TO authenticated;

CREATE OR REPLACE FUNCTION admin_reject_booking(
  p_booking_id uuid,
  p_rejection_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF NOT is_temple_admin(v_booking.temple_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: admin access required for this temple');
  END IF;

  UPDATE bookings SET
    booking_status = 'rejected',
    rejection_reason = p_rejection_reason,
    verified_by = auth.uid(),
    verified_at = now(),
    updated_at = now()
  WHERE id = p_booking_id;

  IF v_booking.is_senior THEN
    UPDATE darshan_slots SET booked_senior = GREATEST(booked_senior - v_booking.visitor_count, 0)
    WHERE id = v_booking.slot_id;
  ELSE
    UPDATE darshan_slots SET booked_general = GREATEST(booked_general - v_booking.visitor_count, 0)
    WHERE id = v_booking.slot_id;
  END IF;

  INSERT INTO booking_audit_logs (booking_id, action, performed_by, remarks, old_status, new_status)
  VALUES (p_booking_id, 'admin_rejected', auth.uid(), p_rejection_reason, v_booking.booking_status, 'rejected');

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_reject_booking FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_reject_booking TO authenticated;

CREATE OR REPLACE FUNCTION validate_ticket(
  p_booking_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_already_validated boolean;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF NOT is_temple_admin(v_booking.temple_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: admin access required for this temple');
  END IF;

  IF v_booking.booking_status <> 'confirmed' THEN
    INSERT INTO ticket_validations (booking_id, validated_by, is_valid) VALUES (p_booking_id, auth.uid(), false);
    RETURN jsonb_build_object('success', true, 'is_valid', false, 'error', 'Ticket is not confirmed');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM ticket_validations WHERE booking_id = p_booking_id AND is_valid = true
  ) INTO v_already_validated;

  IF v_already_validated THEN
    INSERT INTO ticket_validations (booking_id, validated_by, is_valid) VALUES (p_booking_id, auth.uid(), false);
    RETURN jsonb_build_object('success', true, 'is_valid', false, 'error', 'Ticket already used - duplicate entry detected');
  END IF;

  INSERT INTO ticket_validations (booking_id, validated_by, is_valid) VALUES (p_booking_id, auth.uid(), true);
  UPDATE bookings SET booking_status = 'completed', updated_at = now() WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'is_valid', true, 'message', 'Ticket validated successfully');
END;
$$;

REVOKE EXECUTE ON FUNCTION validate_ticket FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION validate_ticket TO authenticated;
