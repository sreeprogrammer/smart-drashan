CREATE TABLE IF NOT EXISTS public.temple_information (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  temple_id uuid NOT NULL REFERENCES public.temples(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN (
    'administration', 'facilities', 'transportation', 'emergency',
    'hotels', 'timings', 'festivals'
  )),
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  source_url text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'rejected')),
  last_verified timestamptz,
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (temple_id, section)
);

CREATE INDEX IF NOT EXISTS idx_temple_information_status
  ON public.temple_information(status, section);
CREATE INDEX IF NOT EXISTS idx_temple_information_temple
  ON public.temple_information(temple_id);

INSERT INTO public.temple_information (temple_id, section, details, status)
SELECT
  t.id,
  section.section,
  COALESCE(section.details, '{}'::jsonb),
  'pending'
FROM public.temples t
CROSS JOIN LATERAL (
  VALUES
    (
      'administration',
      (SELECT to_jsonb(a) - ARRAY['id', 'temple_id', 'last_verified']
       FROM public.temple_administration a WHERE a.temple_id = t.id)
    ),
    (
      'facilities',
      (SELECT jsonb_build_object('items', jsonb_agg(to_jsonb(f) - ARRAY['id', 'temple_id']))
       FROM public.temple_facilities f WHERE f.temple_id = t.id)
    ),
    (
      'transportation',
      (SELECT jsonb_build_object('items', jsonb_agg(to_jsonb(s) - ARRAY['id', 'temple_id', 'created_at']))
       FROM public.nearby_services s WHERE s.temple_id = t.id AND s.service_type = 'transport')
    ),
    (
      'emergency',
      (SELECT jsonb_build_object('items', jsonb_agg(to_jsonb(s) - ARRAY['id', 'temple_id', 'created_at']))
       FROM public.nearby_services s
       WHERE s.temple_id = t.id AND s.service_type IN ('emergency', 'hospital', 'police'))
    ),
    (
      'hotels',
      (SELECT jsonb_build_object('items', jsonb_agg(to_jsonb(h) - ARRAY['id', 'temple_id', 'created_at']))
       FROM public.nearby_hotels h WHERE h.temple_id = t.id)
    ),
    (
      'timings',
      (SELECT jsonb_build_object('items', jsonb_agg(to_jsonb(tm) - ARRAY['id', 'temple_id']))
       FROM public.temple_timings tm WHERE tm.temple_id = t.id)
    ),
    (
      'festivals',
      (SELECT jsonb_build_object('items', jsonb_agg(to_jsonb(e) - ARRAY['id', 'temple_id', 'created_at']))
       FROM public.temple_events e WHERE e.temple_id = t.id)
    )
) AS section(section, details)
ON CONFLICT (temple_id, section) DO NOTHING;

CREATE OR REPLACE FUNCTION public.can_manage_temple_information(p_temple_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.temples t
    WHERE t.id = p_temple_id
      AND public.is_district_admin(t.district_id)
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_temple_information(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_temple_information(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_temple_information_content(p_value jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  item record;
BEGIN
  IF p_value IS NULL OR jsonb_typeof(p_value) = 'null' THEN
    RETURN false;
  ELSIF jsonb_typeof(p_value) = 'string' THEN
    RETURN btrim(p_value #>> '{}') <> '';
  ELSIF jsonb_typeof(p_value) IN ('number', 'boolean') THEN
    RETURN true;
  ELSIF jsonb_typeof(p_value) = 'array' THEN
    FOR item IN SELECT value FROM jsonb_array_elements(p_value) LOOP
      IF public.has_temple_information_content(item.value) THEN
        RETURN true;
      END IF;
    END LOOP;
  ELSIF jsonb_typeof(p_value) = 'object' THEN
    FOR item IN SELECT key, value FROM jsonb_each(p_value) LOOP
      IF item.key <> 'photos'
        AND public.has_temple_information_content(item.value) THEN
        RETURN true;
      END IF;
    END LOOP;
  END IF;
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.has_temple_information_content(jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_temple_information_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF jsonb_typeof(NEW.details) <> 'object' THEN
    RAISE EXCEPTION 'Temple information details must be a JSON object';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.submitted_by := auth.uid();
    NEW.reviewed_by := NULL;
    NEW.last_verified := NULL;
  ELSE
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.temple_id IS DISTINCT FROM OLD.temple_id
      OR NEW.section IS DISTINCT FROM OLD.section
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Temple information identity and creation time cannot be changed';
    END IF;
    IF NOT public.is_state_admin() THEN
      NEW.status := 'pending';
      NEW.submitted_by := auth.uid();
      NEW.reviewed_by := OLD.reviewed_by;
      NEW.last_verified := NULL;
    ELSE
      NEW.submitted_by := OLD.submitted_by;
    END IF;
  END IF;

  IF NEW.status = 'verified' THEN
    IF NOT public.is_state_admin() THEN
      RAISE EXCEPTION 'Only a State Admin can verify temple information';
    END IF;
    IF NOT public.has_temple_information_content(NEW.details) THEN
      RAISE EXCEPTION 'Add verified information before approving this section';
    END IF;
    IF NEW.source_url IS NULL OR NEW.source_url !~ '^https?://[^[:space:]]+$' THEN
      RAISE EXCEPTION 'A valid source URL is required before verification';
    END IF;
    IF NEW.last_verified IS NULL OR NEW.reviewed_by IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Reviewer and verification date are required';
    END IF;
    IF jsonb_typeof(NEW.details -> 'photos') = 'array' AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(NEW.details -> 'photos') photo
      WHERE COALESCE(photo ->> 'alt', '') = ''
        OR COALESCE(photo ->> 'image_source', '') = ''
        OR COALESCE(photo ->> 'image_license', '') = ''
    ) THEN
      RAISE EXCEPTION 'Every uploaded photo needs an image source and license';
    END IF;
  ELSIF NEW.status = 'rejected' AND btrim(COALESCE(NEW.review_notes, '')) = '' THEN
    RAISE EXCEPTION 'Add review notes when rejecting temple information';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS temple_information_workflow ON public.temple_information;
CREATE TRIGGER temple_information_workflow
  BEFORE INSERT OR UPDATE ON public.temple_information
  FOR EACH ROW EXECUTE FUNCTION public.enforce_temple_information_workflow();

ALTER TABLE public.temple_information ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.temple_information TO anon, authenticated;
GRANT INSERT, UPDATE ON public.temple_information TO authenticated;

DROP POLICY IF EXISTS temple_information_public_verified_read ON public.temple_information;
CREATE POLICY temple_information_public_verified_read ON public.temple_information
  FOR SELECT TO anon, authenticated
  USING (status = 'verified');

DROP POLICY IF EXISTS temple_information_admin_read ON public.temple_information;
CREATE POLICY temple_information_admin_read ON public.temple_information
  FOR SELECT TO authenticated
  USING (public.can_manage_temple_information(temple_id));

DROP POLICY IF EXISTS temple_information_admin_submit ON public.temple_information;
CREATE POLICY temple_information_admin_submit ON public.temple_information
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_temple_information(temple_id) AND status = 'pending');

DROP POLICY IF EXISTS temple_information_admin_update ON public.temple_information;
CREATE POLICY temple_information_admin_update ON public.temple_information
  FOR UPDATE TO authenticated
  USING (public.can_manage_temple_information(temple_id))
  WITH CHECK (public.can_manage_temple_information(temple_id));

REVOKE ALL ON public.temple_information FROM PUBLIC;
GRANT SELECT ON public.temple_information TO anon, authenticated;
GRANT INSERT, UPDATE ON public.temple_information TO authenticated;

DROP POLICY IF EXISTS public_read_temple_timings ON public.temple_timings;
DROP POLICY IF EXISTS public_read_temple_facilities ON public.temple_facilities;
DROP POLICY IF EXISTS public_read_nearby_services ON public.nearby_services;
DROP POLICY IF EXISTS public_read_temple_events ON public.temple_events;
DROP POLICY IF EXISTS public_read_nearby_hotels ON public.nearby_hotels;
DROP POLICY IF EXISTS public_read_temple_administration ON public.temple_administration;

REVOKE SELECT ON public.temple_timings, public.temple_facilities,
  public.nearby_services, public.temple_events, public.nearby_hotels,
  public.temple_administration FROM anon;
GRANT SELECT ON public.temple_timings, public.temple_facilities,
  public.nearby_services, public.temple_events, public.nearby_hotels,
  public.temple_administration TO authenticated;

DROP POLICY IF EXISTS admin_read_legacy_temple_timings ON public.temple_timings;
DROP POLICY IF EXISTS admin_read_legacy_temple_facilities ON public.temple_facilities;
DROP POLICY IF EXISTS admin_read_legacy_nearby_services ON public.nearby_services;
DROP POLICY IF EXISTS admin_read_legacy_temple_events ON public.temple_events;
DROP POLICY IF EXISTS admin_read_legacy_nearby_hotels ON public.nearby_hotels;
DROP POLICY IF EXISTS admin_read_legacy_temple_administration ON public.temple_administration;

CREATE POLICY admin_read_legacy_temple_timings ON public.temple_timings
  FOR SELECT TO authenticated USING (public.can_manage_temple_information(temple_id));
CREATE POLICY admin_read_legacy_temple_facilities ON public.temple_facilities
  FOR SELECT TO authenticated USING (public.can_manage_temple_information(temple_id));
CREATE POLICY admin_read_legacy_nearby_services ON public.nearby_services
  FOR SELECT TO authenticated USING (public.can_manage_temple_information(temple_id));
CREATE POLICY admin_read_legacy_temple_events ON public.temple_events
  FOR SELECT TO authenticated USING (public.can_manage_temple_information(temple_id));
CREATE POLICY admin_read_legacy_nearby_hotels ON public.nearby_hotels
  FOR SELECT TO authenticated USING (public.can_manage_temple_information(temple_id));
CREATE POLICY admin_read_legacy_temple_administration ON public.temple_administration
  FOR SELECT TO authenticated USING (public.can_manage_temple_information(temple_id));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'temple-info-media',
  'temple-info-media',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS temple_info_media_read_verified ON storage.objects;
CREATE POLICY temple_info_media_read_verified ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'temple-info-media'
    AND EXISTS (
      SELECT 1
      FROM public.temple_information i
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(i.details -> 'photos') = 'array'
          THEN i.details -> 'photos' ELSE '[]'::jsonb END
      ) photo
      WHERE i.id::text = (storage.foldername(name))[3]
        AND i.temple_id::text = (storage.foldername(name))[1]
        AND i.section = (storage.foldername(name))[2]
        AND i.status = 'verified'
        AND photo ->> 'storage_path' = name
    )
  );

DROP POLICY IF EXISTS temple_info_media_admin_read ON storage.objects;
CREATE POLICY temple_info_media_admin_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'temple-info-media'
    AND EXISTS (
      SELECT 1 FROM public.temples t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND public.can_manage_temple_information(t.id)
    )
  );

DROP POLICY IF EXISTS temple_info_media_admin_insert ON storage.objects;
CREATE POLICY temple_info_media_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'temple-info-media'
    AND (storage.foldername(name))[2] IN (
      'administration', 'facilities', 'transportation', 'emergency',
      'hotels', 'timings', 'festivals'
    )
    AND EXISTS (
      SELECT 1 FROM public.temples t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND public.can_manage_temple_information(t.id)
    )
  );

DROP POLICY IF EXISTS temple_info_media_admin_update ON storage.objects;
CREATE POLICY temple_info_media_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'temple-info-media'
    AND EXISTS (
      SELECT 1 FROM public.temples t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND public.can_manage_temple_information(t.id)
    )
  )
  WITH CHECK (
    bucket_id = 'temple-info-media'
    AND EXISTS (
      SELECT 1 FROM public.temples t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND public.can_manage_temple_information(t.id)
    )
  );

DROP POLICY IF EXISTS temple_info_media_admin_delete ON storage.objects;
CREATE POLICY temple_info_media_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'temple-info-media'
    AND EXISTS (
      SELECT 1 FROM public.temples t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND public.can_manage_temple_information(t.id)
    )
  );
