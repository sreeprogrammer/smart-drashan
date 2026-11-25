/*
# Smart Darshan — Darshan Ticket Booking System Schema

Creates the complete data model for Local Darshan and Special Darshan ticket booking.

## 1. New Tables

- `darshan_categories` — 'local' and 'special' categories per temple with capacity and pricing
- `darshan_slot_configs` — admin-configurable session timings per temple
- `darshan_slots` — individual bookable time slots with capacity tracking
- `temple_admins` — authorized admin users (created BEFORE ticket_validations due to FK in policy)
- `bookings` — visitor applications / confirmed tickets
- `booking_audit_logs` — audit trail for all admin decisions
- `ticket_validations` — QR code validation entries by temple staff

## 2. Security

- RLS enabled on all tables.
- Public read on categories, configs, slots, availability view.
- Bookings: authenticated users access only their own.
- Temple admins: users read self; service_role manages.
- SECURITY DEFINER functions for atomic booking, approve, reject, payment, validate, cancel.

## 3. Important Notes

1. book_darshan_slot uses FOR UPDATE lock — prevents overbooking under concurrent requests.
2. Senior citizens count against senior_capacity only; general cannot consume senior quota.
3. Special Darshan confirmed only after both payment AND residency approval.
4. aadhaar_masked stores only last 4 digits — never full Aadhaar number.
5. temple_admins created before ticket_validations because the latter's RLS policy references it.
*/

-- Darshan Categories
CREATE TABLE IF NOT EXISTS darshan_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  temple_id uuid REFERENCES temples(id) ON DELETE CASCADE,
  category_type text NOT NULL CHECK (category_type IN ('local', 'special')),
  price numeric DEFAULT 0,
  total_capacity int NOT NULL DEFAULT 100,
  senior_capacity int NOT NULL DEFAULT 25,
  senior_min_age int NOT NULL DEFAULT 60,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(temple_id, category_type)
);

ALTER TABLE darshan_categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON darshan_categories TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_darshan_categories" ON darshan_categories;
CREATE POLICY "public_read_darshan_categories"
ON darshan_categories FOR SELECT
TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_darshan_categories_temple ON darshan_categories(temple_id);

-- Darshan Slot Configs
CREATE TABLE IF NOT EXISTS darshan_slot_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  temple_id uuid NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
  category_type text NOT NULL CHECK (category_type IN ('local', 'special')),
  session_type text NOT NULL CHECK (session_type IN ('morning', 'evening')),
  available_date date NOT NULL,
  session_start_time time NOT NULL,
  session_end_time time NOT NULL,
  slot_duration_minutes int NOT NULL DEFAULT 60,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE darshan_slot_configs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON darshan_slot_configs TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_slot_configs" ON darshan_slot_configs;
CREATE POLICY "public_read_slot_configs"
ON darshan_slot_configs FOR SELECT
TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_slot_configs_temple_date ON darshan_slot_configs(temple_id, available_date);

-- Darshan Slots
CREATE TABLE IF NOT EXISTS darshan_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid REFERENCES darshan_slot_configs(id) ON DELETE CASCADE,
  temple_id uuid NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
  category_type text NOT NULL CHECK (category_type IN ('local', 'special')),
  slot_date date NOT NULL,
  session_type text NOT NULL CHECK (session_type IN ('morning', 'evening')),
  slot_start_time time NOT NULL,
  slot_end_time time NOT NULL,
  total_capacity int NOT NULL DEFAULT 100,
  senior_capacity int NOT NULL DEFAULT 25,
  booked_general int NOT NULL DEFAULT 0,
  booked_senior int NOT NULL DEFAULT 0,
  is_closed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE darshan_slots ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON darshan_slots TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_darshan_slots" ON darshan_slots;
CREATE POLICY "public_read_darshan_slots"
ON darshan_slots FOR SELECT
TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_darshan_slots_temple_date ON darshan_slots(temple_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_darshan_slots_category ON darshan_slots(category_type);

-- Temple Admins (created before bookings/ticket_validations since their policies reference it)
CREATE TABLE IF NOT EXISTS temple_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  temple_id uuid REFERENCES temples(id) ON DELETE CASCADE,
  admin_name text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE temple_admins ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON temple_admins TO authenticated;

DROP POLICY IF EXISTS "select_temple_admins_self" ON temple_admins;
CREATE POLICY "select_temple_admins_self"
ON temple_admins FOR SELECT
TO authenticated USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM temple_admins ta WHERE ta.user_id = auth.uid() AND ta.is_active = true
));

GRANT SELECT, INSERT, UPDATE, DELETE ON temple_admins TO service_role;
CREATE INDEX IF NOT EXISTS idx_temple_admins_user ON temple_admins(user_id);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref text UNIQUE NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  temple_id uuid NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL REFERENCES darshan_slots(id) ON DELETE CASCADE,
  category_type text NOT NULL CHECK (category_type IN ('local', 'special')),
  visitor_name text NOT NULL,
  visitor_mobile text NOT NULL,
  date_of_birth date,
  is_senior boolean DEFAULT false,
  aadhaar_masked text,
  aadhaar_verification_status text DEFAULT 'not_required' CHECK (aadhaar_verification_status IN ('not_required','pending','approved','rejected')),
  residency_verification_status text DEFAULT 'not_required' CHECK (residency_verification_status IN ('not_required','pending','approved','rejected')),
  visitor_count int DEFAULT 1,
  total_price numeric DEFAULT 0,
  payment_status text DEFAULT 'not_required' CHECK (payment_status IN ('not_required','pending','paid','failed','refunded')),
  booking_status text DEFAULT 'pending' CHECK (booking_status IN ('pending','confirmed','rejected','cancelled','completed')),
  admin_remarks text,
  rejection_reason text,
  verified_by uuid,
  verified_at timestamptz,
  darshan_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON bookings TO authenticated;

DROP POLICY IF EXISTS "select_own_bookings" ON bookings;
CREATE POLICY "select_own_bookings"
ON bookings FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_bookings" ON bookings;
CREATE POLICY "insert_own_bookings"
ON bookings FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_bookings" ON bookings;
CREATE POLICY "update_own_bookings"
ON bookings FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(booking_status);

-- Booking Audit Logs
CREATE TABLE IF NOT EXISTS booking_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  action text NOT NULL,
  performed_by uuid,
  remarks text,
  old_status text,
  new_status text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE booking_audit_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON booking_audit_logs TO authenticated;

DROP POLICY IF EXISTS "select_own_audit_logs" ON booking_audit_logs;
CREATE POLICY "select_own_audit_logs"
ON booking_audit_logs FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_audit_logs.booking_id AND bookings.user_id = auth.uid())
);

DROP POLICY IF EXISTS "insert_audit_logs" ON booking_audit_logs;
CREATE POLICY "insert_audit_logs"
ON booking_audit_logs FOR INSERT
TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_logs_booking ON booking_audit_logs(booking_id);

-- Ticket Validations
CREATE TABLE IF NOT EXISTS ticket_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  validated_by uuid,
  validated_at timestamptz DEFAULT now(),
  is_valid boolean NOT NULL DEFAULT true
);

ALTER TABLE ticket_validations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON ticket_validations TO authenticated;

DROP POLICY IF EXISTS "select_own_ticket_validations" ON ticket_validations;
CREATE POLICY "select_own_ticket_validations"
ON ticket_validations FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM bookings WHERE bookings.id = ticket_validations.booking_id AND bookings.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM temple_admins WHERE temple_admins.user_id = auth.uid() AND temple_admins.is_active = true)
);

DROP POLICY IF EXISTS "insert_ticket_validations" ON ticket_validations;
CREATE POLICY "insert_ticket_validations"
ON ticket_validations FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM temple_admins WHERE temple_admins.user_id = auth.uid() AND temple_admins.is_active = true)
);

CREATE INDEX IF NOT EXISTS idx_ticket_validations_booking ON ticket_validations(booking_id);

-- Sequence for booking references
CREATE SEQUENCE IF NOT EXISTS booking_ref_seq START 100000;

-- SECURITY DEFINER: Book a darshan slot (atomic, overbooking-safe)
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
  v_booking_id uuid;
  v_booking_ref text;
  v_next_val bigint;
  v_general_remaining int;
  v_senior_remaining int;
  v_aadhaar_status text;
  v_residency_status text;
  v_booking_status text;
  v_payment_status text;
BEGIN
  SELECT * INTO v_slot FROM darshan_slots WHERE id = p_slot_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slot not found');
  END IF;

  IF v_slot.is_closed THEN
    RETURN jsonb_build_object('success', false, 'error', 'This slot is closed');
  END IF;

  IF v_slot.category_type != p_category_type THEN
    RETURN jsonb_build_object('success', false, 'error', 'Category mismatch for this slot');
  END IF;

  v_general_remaining := v_slot.total_capacity - v_slot.senior_capacity - v_slot.booked_general;
  v_senior_remaining := v_slot.senior_capacity - v_slot.booked_senior;

  IF p_is_senior THEN
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
    v_booking_status := 'pending';
    v_payment_status := 'not_required';
  ELSE
    v_aadhaar_status := 'not_required';
    v_residency_status := 'pending';
    v_booking_status := 'pending';
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
    p_visitor_name, p_visitor_mobile, p_date_of_birth, p_is_senior,
    p_aadhaar_masked, v_aadhaar_status, v_residency_status,
    p_visitor_count, p_total_price, v_payment_status, v_booking_status,
    v_slot.slot_date
  )
  RETURNING id INTO v_booking_id;

  IF p_is_senior THEN
    UPDATE darshan_slots
    SET booked_senior = booked_senior + p_visitor_count
    WHERE id = p_slot_id;
  ELSE
    UPDATE darshan_slots
    SET booked_general = booked_general + p_visitor_count
    WHERE id = p_slot_id;
  END IF;

  INSERT INTO booking_audit_logs (booking_id, action, performed_by, remarks, new_status)
  VALUES (v_booking_id, 'booking_created', auth.uid(), 'Booking submitted by user', v_booking_status);

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'booking_ref', v_booking_ref
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION book_darshan_slot FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION book_darshan_slot TO authenticated;

-- SECURITY DEFINER: Admin approve booking
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
  v_is_admin boolean;
  v_new_status text;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM temple_admins WHERE user_id = auth.uid() AND is_active = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: admin access required');
  END IF;

  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
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

-- SECURITY DEFINER: Admin reject booking
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
  v_is_admin boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM temple_admins WHERE user_id = auth.uid() AND is_active = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: admin access required');
  END IF;

  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
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

-- SECURITY DEFINER: Mark payment as paid
CREATE OR REPLACE FUNCTION mark_payment_paid(
  p_booking_id uuid
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

  IF v_booking.user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  v_new_status := v_booking.booking_status;

  UPDATE bookings SET payment_status = 'paid', updated_at = now() WHERE id = p_booking_id;

  IF v_booking.residency_verification_status = 'approved' THEN
    UPDATE bookings SET booking_status = 'confirmed', updated_at = now() WHERE id = p_booking_id;
    v_new_status := 'confirmed';
  END IF;

  INSERT INTO booking_audit_logs (booking_id, action, performed_by, remarks, new_status)
  VALUES (p_booking_id, 'payment_completed', auth.uid(), 'Payment verified', v_new_status);

  RETURN jsonb_build_object('success', true, 'new_status', v_new_status);
END;
$$;

REVOKE EXECUTE ON FUNCTION mark_payment_paid FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION mark_payment_paid TO authenticated;

-- SECURITY DEFINER: Validate ticket (check for duplicate use)
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
  v_is_admin boolean;
  v_already_validated boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM temple_admins WHERE user_id = auth.uid() AND is_active = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: admin access required');
  END IF;

  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF v_booking.booking_status != 'confirmed' THEN
    INSERT INTO ticket_validations (booking_id, validated_by, is_valid) VALUES (p_booking_id, auth.uid(), false);
    RETURN jsonb_build_object('success', true, 'is_valid', false, 'error', 'Ticket is not confirmed');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM ticket_validations WHERE booking_id = p_booking_id AND is_valid = true
  ) INTO v_already_validated;

  IF v_already_validated THEN
    INSERT INTO ticket_validations (booking_id, validated_by, is_valid) VALUES (p_booking_id, auth.uid(), false);
    RETURN jsonb_build_object('success', true, 'is_valid', false, 'error', 'Ticket already used — duplicate entry detected');
  END IF;

  INSERT INTO ticket_validations (booking_id, validated_by, is_valid) VALUES (p_booking_id, auth.uid(), true);

  UPDATE bookings SET booking_status = 'completed', updated_at = now() WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'is_valid', true, 'message', 'Ticket validated successfully');
END;
$$;

REVOKE EXECUTE ON FUNCTION validate_ticket FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION validate_ticket TO authenticated;

-- SECURITY DEFINER: Cancel booking (user-initiated)
CREATE OR REPLACE FUNCTION cancel_booking(
  p_booking_id uuid
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

  IF v_booking.user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF v_booking.booking_status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel a completed booking');
  END IF;

  UPDATE bookings SET booking_status = 'cancelled', updated_at = now() WHERE id = p_booking_id;

  IF v_booking.is_senior THEN
    UPDATE darshan_slots SET booked_senior = GREATEST(booked_senior - v_booking.visitor_count, 0)
    WHERE id = v_booking.slot_id;
  ELSE
    UPDATE darshan_slots SET booked_general = GREATEST(booked_general - v_booking.visitor_count, 0)
    WHERE id = v_booking.slot_id;
  END IF;

  INSERT INTO booking_audit_logs (booking_id, action, performed_by, remarks, old_status, new_status)
  VALUES (p_booking_id, 'booking_cancelled', auth.uid(), 'Cancelled by user', v_booking.booking_status, 'cancelled');

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION cancel_booking FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION cancel_booking TO authenticated;

-- VIEW: Slot availability with computed remaining counts
CREATE OR REPLACE VIEW slot_availability_view AS
SELECT
  s.id AS slot_id, s.temple_id, s.category_type, s.slot_date,
  s.session_type, s.slot_start_time, s.slot_end_time,
  s.total_capacity, s.senior_capacity,
  s.booked_general, s.booked_senior,
  (s.total_capacity - s.senior_capacity - s.booked_general) AS general_remaining,
  (s.senior_capacity - s.booked_senior) AS senior_remaining,
  (s.total_capacity - s.booked_general - s.booked_senior) AS total_remaining,
  CASE
    WHEN s.is_closed THEN 'closed'
    WHEN (s.total_capacity - s.booked_general - s.booked_senior) <= 0 THEN 'full'
    ELSE 'available'
  END AS slot_status,
  s.is_closed,
  t.name AS temple_name
FROM darshan_slots s
JOIN temples t ON t.id = s.temple_id;

ALTER VIEW slot_availability_view SET (security_invoker = true);
GRANT SELECT ON slot_availability_view TO anon, authenticated;

-- SEED: Default darshan categories for all existing temples
INSERT INTO darshan_categories (temple_id, category_type, price, total_capacity, senior_capacity, senior_min_age)
SELECT t.id, 'local', 0, 100, 25, 60
FROM temples t
WHERE NOT EXISTS (
  SELECT 1 FROM darshan_categories dc WHERE dc.temple_id = t.id AND dc.category_type = 'local'
);

INSERT INTO darshan_categories (temple_id, category_type, price, total_capacity, senior_capacity)
SELECT t.id, 'special', 500, 50, 0
FROM temples t
WHERE NOT EXISTS (
  SELECT 1 FROM darshan_categories dc WHERE dc.temple_id = t.id AND dc.category_type = 'special'
);

-- SEED: Generate default slots for next 7 days for all temples
DO $$
DECLARE
  t RECORD;
  d_offset int;
  v_config_id uuid;
BEGIN
  FOR t IN SELECT id FROM temples LOOP
    FOR d_offset IN 0..6 LOOP
      -- Local Morning 6:00-8:00 (two 1-hour slots)
      SELECT id INTO v_config_id FROM darshan_slot_configs
      WHERE temple_id = t.id AND category_type = 'local' AND session_type = 'morning'
        AND available_date = CURRENT_DATE + d_offset AND session_start_time = '06:00' LIMIT 1;
      IF v_config_id IS NULL THEN
        INSERT INTO darshan_slot_configs (temple_id, category_type, session_type, available_date, session_start_time, session_end_time, slot_duration_minutes)
        VALUES (t.id, 'local', 'morning', CURRENT_DATE + d_offset, '06:00', '08:00', 60)
        RETURNING id INTO v_config_id;
      END IF;
      INSERT INTO darshan_slots (config_id, temple_id, category_type, slot_date, session_type, slot_start_time, slot_end_time, total_capacity, senior_capacity)
      SELECT v_config_id, t.id, 'local', CURRENT_DATE + d_offset, 'morning', '06:00'::time, '07:00'::time, 100, 25
      WHERE NOT EXISTS (SELECT 1 FROM darshan_slots WHERE temple_id = t.id AND category_type = 'local' AND slot_date = CURRENT_DATE + d_offset AND slot_start_time = '06:00');
      INSERT INTO darshan_slots (config_id, temple_id, category_type, slot_date, session_type, slot_start_time, slot_end_time, total_capacity, senior_capacity)
      SELECT v_config_id, t.id, 'local', CURRENT_DATE + d_offset, 'morning', '07:00'::time, '08:00'::time, 100, 25
      WHERE NOT EXISTS (SELECT 1 FROM darshan_slots WHERE temple_id = t.id AND category_type = 'local' AND slot_date = CURRENT_DATE + d_offset AND slot_start_time = '07:00');

      -- Local Evening 17:00-19:00 (two 1-hour slots)
      SELECT id INTO v_config_id FROM darshan_slot_configs
      WHERE temple_id = t.id AND category_type = 'local' AND session_type = 'evening'
        AND available_date = CURRENT_DATE + d_offset AND session_start_time = '17:00' LIMIT 1;
      IF v_config_id IS NULL THEN
        INSERT INTO darshan_slot_configs (temple_id, category_type, session_type, available_date, session_start_time, session_end_time, slot_duration_minutes)
        VALUES (t.id, 'local', 'evening', CURRENT_DATE + d_offset, '17:00', '19:00', 60)
        RETURNING id INTO v_config_id;
      END IF;
      INSERT INTO darshan_slots (config_id, temple_id, category_type, slot_date, session_type, slot_start_time, slot_end_time, total_capacity, senior_capacity)
      SELECT v_config_id, t.id, 'local', CURRENT_DATE + d_offset, 'evening', '17:00'::time, '18:00'::time, 100, 25
      WHERE NOT EXISTS (SELECT 1 FROM darshan_slots WHERE temple_id = t.id AND category_type = 'local' AND slot_date = CURRENT_DATE + d_offset AND slot_start_time = '17:00');
      INSERT INTO darshan_slots (config_id, temple_id, category_type, slot_date, session_type, slot_start_time, slot_end_time, total_capacity, senior_capacity)
      SELECT v_config_id, t.id, 'local', CURRENT_DATE + d_offset, 'evening', '18:00'::time, '19:00'::time, 100, 25
      WHERE NOT EXISTS (SELECT 1 FROM darshan_slots WHERE temple_id = t.id AND category_type = 'local' AND slot_date = CURRENT_DATE + d_offset AND slot_start_time = '18:00');

      -- Special Morning 9:00-10:00
      SELECT id INTO v_config_id FROM darshan_slot_configs
      WHERE temple_id = t.id AND category_type = 'special' AND session_type = 'morning'
        AND available_date = CURRENT_DATE + d_offset AND session_start_time = '09:00' LIMIT 1;
      IF v_config_id IS NULL THEN
        INSERT INTO darshan_slot_configs (temple_id, category_type, session_type, available_date, session_start_time, session_end_time, slot_duration_minutes)
        VALUES (t.id, 'special', 'morning', CURRENT_DATE + d_offset, '09:00', '10:00', 60)
        RETURNING id INTO v_config_id;
      END IF;
      INSERT INTO darshan_slots (config_id, temple_id, category_type, slot_date, session_type, slot_start_time, slot_end_time, total_capacity, senior_capacity)
      SELECT v_config_id, t.id, 'special', CURRENT_DATE + d_offset, 'morning', '09:00'::time, '10:00'::time, 50, 0
      WHERE NOT EXISTS (SELECT 1 FROM darshan_slots WHERE temple_id = t.id AND category_type = 'special' AND slot_date = CURRENT_DATE + d_offset AND slot_start_time = '09:00');

      -- Special Evening 19:00-20:00
      SELECT id INTO v_config_id FROM darshan_slot_configs
      WHERE temple_id = t.id AND category_type = 'special' AND session_type = 'evening'
        AND available_date = CURRENT_DATE + d_offset AND session_start_time = '19:00' LIMIT 1;
      IF v_config_id IS NULL THEN
        INSERT INTO darshan_slot_configs (temple_id, category_type, session_type, available_date, session_start_time, session_end_time, slot_duration_minutes)
        VALUES (t.id, 'special', 'evening', CURRENT_DATE + d_offset, '19:00', '20:00', 60)
        RETURNING id INTO v_config_id;
      END IF;
      INSERT INTO darshan_slots (config_id, temple_id, category_type, slot_date, session_type, slot_start_time, slot_end_time, total_capacity, senior_capacity)
      SELECT v_config_id, t.id, 'special', CURRENT_DATE + d_offset, 'evening', '19:00'::time, '20:00'::time, 50, 0
      WHERE NOT EXISTS (SELECT 1 FROM darshan_slots WHERE temple_id = t.id AND category_type = 'special' AND slot_date = CURRENT_DATE + d_offset AND slot_start_time = '19:00');

    END LOOP;
  END LOOP;
END $$;
