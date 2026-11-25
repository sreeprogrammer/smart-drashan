CREATE OR REPLACE FUNCTION public.admin_approve_booking(
  p_booking_id uuid,
  p_remarks text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_new_status text;
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF auth.uid() IS NULL OR NOT public.is_temple_admin(v_booking.temple_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: admin access required for this temple');
  END IF;

  IF v_booking.booking_status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only pending bookings can be approved');
  END IF;

  v_new_status := v_booking.booking_status;

  IF v_booking.category_type = 'local' THEN
    UPDATE public.bookings
    SET aadhaar_verification_status = 'approved',
        booking_status = 'confirmed',
        admin_remarks = p_remarks,
        verified_by = auth.uid(),
        verified_at = now(),
        updated_at = now()
    WHERE id = p_booking_id;
    v_new_status := 'confirmed';
  ELSE
    UPDATE public.bookings
    SET residency_verification_status = 'approved',
        admin_remarks = p_remarks,
        verified_by = auth.uid(),
        verified_at = now(),
        updated_at = now()
    WHERE id = p_booking_id;

    IF v_booking.payment_status = 'paid' THEN
      UPDATE public.bookings
      SET booking_status = 'confirmed', updated_at = now()
      WHERE id = p_booking_id;
      v_new_status := 'confirmed';
    END IF;
  END IF;

  INSERT INTO public.booking_audit_logs (
    booking_id, action, performed_by, remarks, old_status, new_status
  )
  VALUES (
    p_booking_id, 'admin_approved', auth.uid(), p_remarks,
    v_booking.booking_status, v_new_status
  );

  RETURN jsonb_build_object('success', true, 'new_status', v_new_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_booking(
  p_booking_id uuid,
  p_rejection_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF auth.uid() IS NULL OR NOT public.is_temple_admin(v_booking.temple_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: admin access required for this temple');
  END IF;

  IF v_booking.booking_status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only pending bookings can be rejected');
  END IF;

  UPDATE public.bookings
  SET booking_status = 'rejected',
      rejection_reason = p_rejection_reason,
      verified_by = auth.uid(),
      verified_at = now(),
      updated_at = now()
  WHERE id = p_booking_id;

  IF v_booking.is_senior THEN
    UPDATE public.darshan_slots
    SET booked_senior = GREATEST(booked_senior - v_booking.visitor_count, 0)
    WHERE id = v_booking.slot_id;
  ELSE
    UPDATE public.darshan_slots
    SET booked_general = GREATEST(booked_general - v_booking.visitor_count, 0)
    WHERE id = v_booking.slot_id;
  END IF;

  INSERT INTO public.booking_audit_logs (
    booking_id, action, performed_by, remarks, old_status, new_status
  )
  VALUES (
    p_booking_id, 'admin_rejected', auth.uid(), p_rejection_reason,
    v_booking.booking_status, 'rejected'
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF auth.uid() IS NULL OR v_booking.user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF v_booking.booking_status NOT IN ('pending', 'confirmed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'This booking can no longer be cancelled');
  END IF;

  UPDATE public.bookings
  SET booking_status = 'cancelled', updated_at = now()
  WHERE id = p_booking_id;

  IF v_booking.is_senior THEN
    UPDATE public.darshan_slots
    SET booked_senior = GREATEST(booked_senior - v_booking.visitor_count, 0)
    WHERE id = v_booking.slot_id;
  ELSE
    UPDATE public.darshan_slots
    SET booked_general = GREATEST(booked_general - v_booking.visitor_count, 0)
    WHERE id = v_booking.slot_id;
  END IF;

  INSERT INTO public.booking_audit_logs (
    booking_id, action, performed_by, remarks, old_status, new_status
  )
  VALUES (
    p_booking_id, 'booking_cancelled', auth.uid(), 'Cancelled by user',
    v_booking.booking_status, 'cancelled'
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_booking(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_booking(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_reject_booking(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reject_booking(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.cancel_booking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid) TO authenticated;
