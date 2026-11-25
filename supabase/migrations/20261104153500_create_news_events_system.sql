/*
# News & Events: verified temple news, festivals and admin publishing

## 1. Plain-English summary
Adds the database foundation for the district-wise Tamil Nadu temple News & Events section. Articles are linked to a real district and, where relevant, a real temple. Visitors only ever see articles that an administrator has verified against an official source and published. No news content is inserted by this migration.

## 2. New tables
- news_categories: the 13 fixed news categories (code and English label).
- news_sources: official sources to check (HR&CE, HR&CE festival calendar, Tamil Nadu district portals, NIC district website list). Tracks whether each source is active and when it last synced successfully.
- news_articles: one row per news item or event. Holds headline (English and optional Tamil), description, location, event dates and timings, event status (scheduled, cancelled, postponed), source organisation and URL, optional authorised image URL, verification status, last verified date, publish flag and archive flag.
- news_audit_logs: one row for every create or update of an article, with the administrator's user ID, the action and the submitted fields.
- news_sync_logs: records of synchronisation runs against official sources.

## 3. Modified tables
- None. Districts and temples are referenced, not changed.

## 4. Security changes
- Row level security is enabled on every new table.
- Public visitors (anon and signed-in users) can read only articles that are verified, published and not archived, and only active sources and categories.
- Administrator checks use is_news_admin(), a SECURITY DEFINER helper that checks the temple_admins table. Policies call this helper so they never recurse into temple_admins.
- Administrators can read all articles and audit logs through policies.
- All article writes go through admin_save_news_article(), which checks administrator status, validates the district and temple relationship, writes the article and writes an audit row in the same transaction. No direct write access is granted to any table.
- A database rule prevents publishing an article that is not verified, and verified articles must carry a source URL, source organisation and verification date.
- Functions are not callable by anonymous visitors.

## 5. Important notes
1. Duplicate protection: an article cannot be stored twice with the same source URL and headline.
2. Tamil text is optional. Nothing is machine-translated; Tamil fields stay empty unless an administrator enters verified text.
3. Recurring annual festivals are flagged separately so their dates are never assumed for the current year.
*/

CREATE OR REPLACE FUNCTION is_news_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM temple_admins ta
    WHERE ta.user_id = auth.uid() AND ta.is_active
  );
$$;

REVOKE EXECUTE ON FUNCTION is_news_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_news_admin() TO authenticated;

CREATE TABLE IF NOT EXISTS news_categories (
  code text PRIMARY KEY,
  label_en text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

INSERT INTO news_categories (code, label_en, sort_order) VALUES
  ('temple_news', 'Temple News', 1),
  ('festival_announcement', 'Festival Announcements', 2),
  ('brahmotsavam', 'Brahmotsavam', 3),
  ('kumbabishekam', 'Kumbabishekam', 4),
  ('temple_renovation', 'Temple Renovation', 5),
  ('special_poojas', 'Special Poojas', 6),
  ('special_darshan', 'Special Darshan', 7),
  ('opening_closing_update', 'Temple Opening and Closing Updates', 8),
  ('temple_administration', 'Temple Administration Announcements', 9),
  ('government_announcement', 'Government Announcements', 10),
  ('devotee_facilities', 'Devotee Facilities', 11),
  ('temple_car_festival', 'Temple Car Festival', 12),
  ('cultural_religious_event', 'Cultural and Religious Events', 13)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE news_categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON news_categories TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_news_categories" ON news_categories;
CREATE POLICY "public_read_news_categories" ON news_categories FOR SELECT
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS news_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organization text NOT NULL,
  url text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  last_sync_status text NOT NULL DEFAULT 'never_run'
    CHECK (last_sync_status IN ('never_run', 'success', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO news_sources (name, organization, url) VALUES
  ('Tamil Nadu HR&CE Department', 'Tamil Nadu HR&CE Department', 'https://hrce.tn.gov.in/'),
  ('HR&CE Festival Calendar', 'Tamil Nadu HR&CE Department', 'https://hrce.tn.gov.in/hrcehome/hrce-festival-calendar.php'),
  ('Tamil Nadu District Portals', 'Tamil Nadu Government', 'https://www.tndistricts.nic.in/'),
  ('Official District Websites List', 'National Informatics Centre, Tamil Nadu', 'https://tn.nic.in/publication/list-of-websites/')
ON CONFLICT (url) DO NOTHING;

ALTER TABLE news_sources ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON news_sources TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_active_news_sources" ON news_sources;
CREATE POLICY "public_read_active_news_sources" ON news_sources FOR SELECT
  TO anon, authenticated USING (is_active);

CREATE TABLE IF NOT EXISTS news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid NOT NULL REFERENCES districts(id),
  temple_id uuid REFERENCES temples(id),
  source_id uuid REFERENCES news_sources(id),
  category_code text NOT NULL REFERENCES news_categories(code),
  headline text NOT NULL CHECK (length(btrim(headline)) > 0),
  headline_ta text,
  description text,
  description_ta text,
  location text,
  is_event boolean NOT NULL DEFAULT false,
  event_start_date date,
  event_end_date date,
  event_timings text,
  event_status text NOT NULL DEFAULT 'scheduled'
    CHECK (event_status IN ('scheduled', 'cancelled', 'postponed')),
  is_recurring_annual boolean NOT NULL DEFAULT false,
  source_published_at date,
  source_organization text,
  source_url text CHECK (source_url IS NULL OR source_url ~* '^https?://'),
  image_url text CHECK (image_url IS NULL OR image_url ~* '^https://'),
  image_credit text,
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  last_verified_at timestamptz,
  is_published boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT news_publish_requires_verification CHECK (NOT is_published OR verification_status = 'verified'),
  CONSTRAINT news_verified_requires_source CHECK (
    verification_status <> 'verified'
    OR (source_url IS NOT NULL AND source_organization IS NOT NULL AND last_verified_at IS NOT NULL)
  ),
  CONSTRAINT news_event_dates_order CHECK (
    event_start_date IS NULL OR event_end_date IS NULL OR event_end_date >= event_start_date
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS news_articles_source_headline_key
  ON news_articles (source_url, headline) WHERE source_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS news_articles_district_idx ON news_articles (district_id);
CREATE INDEX IF NOT EXISTS news_articles_temple_idx ON news_articles (temple_id);
CREATE INDEX IF NOT EXISTS news_articles_event_date_idx ON news_articles (event_start_date);
CREATE INDEX IF NOT EXISTS news_articles_public_idx ON news_articles (is_published, is_archived, verification_status);

ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON news_articles TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_verified_news" ON news_articles;
CREATE POLICY "public_read_verified_news" ON news_articles FOR SELECT
  TO anon, authenticated
  USING (is_published AND NOT is_archived AND verification_status = 'verified');

DROP POLICY IF EXISTS "news_admin_read_all_articles" ON news_articles;
CREATE POLICY "news_admin_read_all_articles" ON news_articles FOR SELECT
  TO authenticated USING (is_news_admin());

CREATE TABLE IF NOT EXISTS news_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES news_articles(id),
  admin_user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS news_audit_logs_article_idx ON news_audit_logs (article_id);

ALTER TABLE news_audit_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON news_audit_logs TO authenticated;

DROP POLICY IF EXISTS "news_admin_read_audit_logs" ON news_audit_logs;
CREATE POLICY "news_admin_read_audit_logs" ON news_audit_logs FOR SELECT
  TO authenticated USING (is_news_admin());

CREATE TABLE IF NOT EXISTS news_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES news_sources(id),
  status text NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  message text,
  items_found integer NOT NULL DEFAULT 0,
  items_added integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

ALTER TABLE news_sync_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON news_sync_logs TO authenticated;

DROP POLICY IF EXISTS "news_admin_read_sync_logs" ON news_sync_logs;
CREATE POLICY "news_admin_read_sync_logs" ON news_sync_logs FOR SELECT
  TO authenticated USING (is_news_admin());

CREATE OR REPLACE FUNCTION admin_save_news_article(p_id uuid, p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_district uuid := NULLIF(p_payload->>'district_id', '')::uuid;
  v_temple uuid := NULLIF(p_payload->>'temple_id', '')::uuid;
  v_verified text := COALESCE(NULLIF(p_payload->>'verification_status', ''), 'pending');
  v_verified_at timestamptz := CASE WHEN v_verified = 'verified' THEN now() ELSE NULL END;
  v_id uuid;
  v_action text;
BEGIN
  IF NOT is_news_admin() THEN
    RAISE EXCEPTION 'Only authorised temple administrators can manage news' USING ERRCODE = '42501';
  END IF;

  IF v_district IS NULL OR NOT EXISTS (SELECT 1 FROM districts WHERE id = v_district) THEN
    RAISE EXCEPTION 'A valid district is required';
  END IF;

  IF v_temple IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM temples WHERE id = v_temple AND district_id = v_district
  ) THEN
    RAISE EXCEPTION 'The selected temple does not belong to the selected district';
  END IF;

  IF p_id IS NULL THEN
    v_action := 'created';
    INSERT INTO news_articles (
      district_id, temple_id, source_id, category_code, headline, headline_ta,
      description, description_ta, location, is_event, event_start_date, event_end_date,
      event_timings, event_status, is_recurring_annual, source_published_at,
      source_organization, source_url, image_url, image_credit, verification_status,
      last_verified_at, is_published, is_archived, created_by
    ) VALUES (
      v_district, v_temple, NULLIF(p_payload->>'source_id', '')::uuid,
      p_payload->>'category_code', p_payload->>'headline', NULLIF(p_payload->>'headline_ta', ''),
      NULLIF(p_payload->>'description', ''), NULLIF(p_payload->>'description_ta', ''),
      NULLIF(p_payload->>'location', ''), COALESCE((p_payload->>'is_event')::boolean, false),
      NULLIF(p_payload->>'event_start_date', '')::date, NULLIF(p_payload->>'event_end_date', '')::date,
      NULLIF(p_payload->>'event_timings', ''), COALESCE(NULLIF(p_payload->>'event_status', ''), 'scheduled'),
      COALESCE((p_payload->>'is_recurring_annual')::boolean, false),
      NULLIF(p_payload->>'source_published_at', '')::date,
      NULLIF(p_payload->>'source_organization', ''), NULLIF(p_payload->>'source_url', ''),
      NULLIF(p_payload->>'image_url', ''), NULLIF(p_payload->>'image_credit', ''),
      v_verified, v_verified_at,
      COALESCE((p_payload->>'is_published')::boolean, false),
      COALESCE((p_payload->>'is_archived')::boolean, false), v_uid
    )
    RETURNING id INTO v_id;
  ELSE
    v_action := 'updated';
    UPDATE news_articles SET
      district_id = v_district,
      temple_id = v_temple,
      source_id = NULLIF(p_payload->>'source_id', '')::uuid,
      category_code = p_payload->>'category_code',
      headline = p_payload->>'headline',
      headline_ta = NULLIF(p_payload->>'headline_ta', ''),
      description = NULLIF(p_payload->>'description', ''),
      description_ta = NULLIF(p_payload->>'description_ta', ''),
      location = NULLIF(p_payload->>'location', ''),
      is_event = COALESCE((p_payload->>'is_event')::boolean, false),
      event_start_date = NULLIF(p_payload->>'event_start_date', '')::date,
      event_end_date = NULLIF(p_payload->>'event_end_date', '')::date,
      event_timings = NULLIF(p_payload->>'event_timings', ''),
      event_status = COALESCE(NULLIF(p_payload->>'event_status', ''), 'scheduled'),
      is_recurring_annual = COALESCE((p_payload->>'is_recurring_annual')::boolean, false),
      source_published_at = NULLIF(p_payload->>'source_published_at', '')::date,
      source_organization = NULLIF(p_payload->>'source_organization', ''),
      source_url = NULLIF(p_payload->>'source_url', ''),
      image_url = NULLIF(p_payload->>'image_url', ''),
      image_credit = NULLIF(p_payload->>'image_credit', ''),
      verification_status = v_verified,
      last_verified_at = v_verified_at,
      is_published = COALESCE((p_payload->>'is_published')::boolean, false),
      is_archived = COALESCE((p_payload->>'is_archived')::boolean, false),
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Article not found';
    END IF;
  END IF;

  INSERT INTO news_audit_logs (article_id, admin_user_id, action, details)
  VALUES (v_id, v_uid, v_action, p_payload);

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_save_news_article(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_save_news_article(uuid, jsonb) TO authenticated;
