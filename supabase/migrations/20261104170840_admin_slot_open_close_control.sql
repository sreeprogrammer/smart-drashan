/*
# Temple Admin slot open and close control

1. New Functions
- `admin_set_slot_closed(p_slot_id, p_closed)`: lets an active Temple Admin close or reopen one darshan slot at their own temple.

2. Behaviour
- Closing a slot stops new bookings for it. Existing confirmed bookings are not changed.
- Reopening a slot allows bookings again, up to its remaining capacity.

3. Security
- Only signed-in, active Temple Admins for the slot's temple can change it.
- Not callable by anonymous visitors.
- The slot row is locked while it is updated so the change is applied safely alongside bookings.
*/

CREATE OR REPLACE FUNCTION public.admin_set_slot_closed(p_slot_id uuid, p_closed boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_temple_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please sign in');
  END IF;

  SELECT temple_id INTO v_temple_id FROM darshan_slots WHERE id = p_slot_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slot not found');
  END IF;

  IF NOT public.is_temple_admin(v_temple_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized for this temple');
  END IF;

  UPDATE darshan_slots SET is_closed = p_closed WHERE id = p_slot_id;

  RETURN jsonb_build_object('success', true, 'is_closed', p_closed);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_slot_closed(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_slot_closed(uuid, boolean) TO authenticated;
