CREATE OR REPLACE FUNCTION public.admin_set_senior_min_age(p_temple_id uuid, p_min_age int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please sign in');
  END IF;

  IF NOT public.is_temple_admin(p_temple_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized for this temple');
  END IF;

  IF p_min_age IS NULL OR p_min_age < 50 OR p_min_age > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Eligibility age must be between 50 and 100');
  END IF;

  UPDATE darshan_categories
     SET senior_min_age = p_min_age
   WHERE temple_id = p_temple_id AND category_type = 'local';

  RETURN jsonb_build_object('success', true, 'senior_min_age', p_min_age);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_senior_min_age(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_senior_min_age(uuid, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_senior_min_age(p_temple_id uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT senior_min_age FROM darshan_categories
   WHERE temple_id = p_temple_id AND category_type = 'local'
   LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_senior_min_age(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_senior_min_age(uuid) TO authenticated;
