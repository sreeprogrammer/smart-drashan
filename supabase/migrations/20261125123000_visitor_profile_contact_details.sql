ALTER TABLE public.user_profiles
  ALTER COLUMN date_of_birth DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS place text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS pincode text;

UPDATE public.user_profiles
SET age = EXTRACT(YEAR FROM age(CURRENT_DATE, date_of_birth))::integer
WHERE age IS NULL AND date_of_birth IS NOT NULL;

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_age_range,
  ADD CONSTRAINT user_profiles_age_range CHECK (age IS NULL OR age BETWEEN 0 AND 120);

DROP FUNCTION IF EXISTS public.create_my_visitor_profile(text, text, date, text, uuid, text, text, boolean);

CREATE OR REPLACE FUNCTION public.create_my_visitor_profile(
  p_full_name text,
  p_email text,
  p_age integer,
  p_gender text,
  p_district_id uuid,
  p_address text,
  p_account_type text,
  p_accepted_terms boolean,
  p_place text,
  p_city text,
  p_state text,
  p_country text,
  p_pincode text
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
    OR p_age IS NULL OR p_age NOT BETWEEN 0 AND 120
    OR p_address IS NULL OR length(btrim(p_address)) NOT BETWEEN 5 AND 500
    OR p_place IS NULL OR length(btrim(p_place)) NOT BETWEEN 1 AND 120
    OR p_city IS NULL OR length(btrim(p_city)) NOT BETWEEN 1 AND 120
    OR p_state IS NULL OR length(btrim(p_state)) NOT BETWEEN 1 AND 120
    OR p_country IS NULL OR length(btrim(p_country)) NOT BETWEEN 1 AND 120
    OR p_pincode IS NULL OR btrim(p_pincode) !~ '^[0-9]{6}$'
    OR p_account_type IS NULL OR p_account_type NOT IN ('visitor', 'local_resident', 'special_assistance')
    OR (p_gender IS NOT NULL AND p_gender NOT IN ('female', 'male', 'non_binary', 'prefer_not_to_say'))
    OR NOT EXISTS (SELECT 1 FROM public.districts d WHERE d.id = p_district_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Registration details are invalid');
  END IF;

  INSERT INTO public.user_profiles (
    user_id, full_name, email, age, gender, district_id, address, place, city, state, country, pincode,
    account_type, phone_verified, accepted_terms_at
  )
  VALUES (
    v_user_id, btrim(p_full_name), NULLIF(btrim(p_email), ''), p_age, p_gender, p_district_id,
    btrim(p_address), btrim(p_place), btrim(p_city), btrim(p_state), btrim(p_country), btrim(p_pincode),
    p_account_type, true, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    age = EXCLUDED.age,
    gender = EXCLUDED.gender,
    district_id = EXCLUDED.district_id,
    address = EXCLUDED.address,
    place = EXCLUDED.place,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    country = EXCLUDED.country,
    pincode = EXCLUDED.pincode,
    account_type = EXCLUDED.account_type,
    phone_verified = true,
    accepted_terms_at = EXCLUDED.accepted_terms_at,
    updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.create_my_visitor_profile(text, text, integer, text, uuid, text, text, boolean, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_my_visitor_profile(text, text, integer, text, uuid, text, text, boolean, text, text, text, text, text) TO authenticated;
