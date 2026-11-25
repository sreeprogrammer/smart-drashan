/*
# Smart Darshan — District & Temple Information System Schema

Creates the complete data model for the Tamil Nadu district and temple information system.

## 1. New Tables

- `districts` — all 38 Tamil Nadu districts with names, descriptions, history, images, collector info
  - id (uuid PK), name (text, unique), tamil_name (text), region (text), description (text),
    history (text), cultural_significance (text), area_sq_km (numeric), formed_year (int),
    tourist_attractions (text[]), cultural_heritage (text[]), famous_festivals (text[]),
    image (text), official_website (text), collector_name (text), collector_image (text),
    collector_designation (text), collector_contact (text), verified_at (timestamptz)

- `temples` — 114 featured temples (3 per district) with full detail information
  - id (uuid PK), district_id (uuid FK), name (text), tamil_name (text), location (text),
    address (text), category (text), deity (text), goddess (text), architecture_style (text),
    description (text), history (text), historical_significance (text), religious_significance (text),
    latitude (numeric), longitude (numeric), verification_status (text default 'pending'),
    featured_image (text), created_at, updated_at

- `temple_images` — gallery images for each temple (up to 10 per temple)
  - id (uuid PK), temple_id (uuid FK), image_url (text), caption (text),
    display_order (int), image_type (text), verified_source (text)

- `temple_timings` — opening/closing times per temple
  - id (uuid PK), temple_id (uuid FK), day_label (text), morning_open (text),
    morning_close (text), evening_open (text), evening_close (text), special_darshan (text),
    special_pooja (text), festival_timing_note (text), last_verified (timestamptz)

- `temple_facilities` — facility availability per temple
  - id (uuid PK), temple_id (uuid FK), facility_type (text), status (text default 'unverified')

- `nearby_services` — bus stands, railway stations, airports, police, hospitals near each temple
  - id (uuid PK), temple_id (uuid FK), service_type (text), service_name (text),
    address (text), distance_km (numeric), contact (text), additional_info (text)

- `temple_events` — festivals and special events per temple
  - id (uuid PK), temple_id (uuid FK), event_name (text), event_date (text),
    description (text)

- `nearby_hotels` — accommodation near each temple
  - id (uuid PK), temple_id (uuid FK), hotel_name (text), image (text), address (text),
    distance_km (numeric), contact (text), website (text), category (text)

- `temple_administration` — maintenance and admin info per temple
  - id (uuid PK), temple_id (uuid FK), executive_officer (text), maintenance_incharge (text),
    managing_department (text), contact_number (text), official_website (text),
    last_verified (timestamptz)

## 2. Security
- RLS enabled on all tables.
- Public read access (anon + authenticated) for all tables — this is a public information portal.
- Write access restricted to service_role only (admin updates via secure  / admin panel).
- No user_id columns — this is a public content system, not user-scoped data.
*/

-- Districts
CREATE TABLE IF NOT EXISTS districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  tamil_name text,
  region text,
  description text,
  history text,
  cultural_significance text,
  area_sq_km numeric,
  formed_year int,
  tourist_attractions text[],
  cultural_heritage text[],
  famous_festivals text[],
  image text,
  official_website text,
  collector_name text,
  collector_image text,
  collector_designation text,
  collector_contact text,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON districts TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_districts" ON districts;
CREATE POLICY "public_read_districts" ON districts FOR SELECT
  TO anon, authenticated USING (true);

-- Temples
CREATE TABLE IF NOT EXISTS temples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid REFERENCES districts(id) ON DELETE CASCADE,
  name text NOT NULL,
  tamil_name text,
  location text,
  address text,
  category text,
  deity text,
  goddess text,
  architecture_style text,
  description text,
  history text,
  historical_significance text,
  religious_significance text,
  latitude numeric,
  longitude numeric,
  verification_status text DEFAULT 'pending',
  featured_image text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE temples ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON temples TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_temples" ON temples;
CREATE POLICY "public_read_temples" ON temples FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_temples_district_id ON temples(district_id);

-- Temple Images
CREATE TABLE IF NOT EXISTS temple_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  temple_id uuid REFERENCES temples(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  display_order int DEFAULT 0,
  image_type text,
  verified_source text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE temple_images ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON temple_images TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_temple_images" ON temple_images;
CREATE POLICY "public_read_temple_images" ON temple_images FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_temple_images_temple_id ON temple_images(temple_id);

-- Temple Timings
CREATE TABLE IF NOT EXISTS temple_timings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  temple_id uuid REFERENCES temples(id) ON DELETE CASCADE,
  day_label text DEFAULT 'All Days',
  morning_open text,
  morning_close text,
  evening_open text,
  evening_close text,
  special_darshan text,
  special_pooja text,
  festival_timing_note text,
  last_verified timestamptz
);

ALTER TABLE temple_timings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON temple_timings TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_temple_timings" ON temple_timings;
CREATE POLICY "public_read_temple_timings" ON temple_timings FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_temple_timings_temple_id ON temple_timings(temple_id);

-- Temple Facilities
CREATE TABLE IF NOT EXISTS temple_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  temple_id uuid REFERENCES temples(id) ON DELETE CASCADE,
  facility_type text NOT NULL,
  status text DEFAULT 'unverified'
);

ALTER TABLE temple_facilities ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON temple_facilities TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_temple_facilities" ON temple_facilities;
CREATE POLICY "public_read_temple_facilities" ON temple_facilities FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_temple_facilities_temple_id ON temple_facilities(temple_id);

-- Nearby Services
CREATE TABLE IF NOT EXISTS nearby_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  temple_id uuid REFERENCES temples(id) ON DELETE CASCADE,
  service_type text NOT NULL,
  service_name text,
  address text,
  distance_km numeric,
  contact text,
  additional_info text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE nearby_services ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON nearby_services TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_nearby_services" ON nearby_services;
CREATE POLICY "public_read_nearby_services" ON nearby_services FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_nearby_services_temple_id ON nearby_services(temple_id);

-- Temple Events
CREATE TABLE IF NOT EXISTS temple_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  temple_id uuid REFERENCES temples(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  event_date text,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE temple_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON temple_events TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_temple_events" ON temple_events;
CREATE POLICY "public_read_temple_events" ON temple_events FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_temple_events_temple_id ON temple_events(temple_id);

-- Nearby Hotels
CREATE TABLE IF NOT EXISTS nearby_hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  temple_id uuid REFERENCES temples(id) ON DELETE CASCADE,
  hotel_name text NOT NULL,
  image text,
  address text,
  distance_km numeric,
  contact text,
  website text,
  category text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE nearby_hotels ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON nearby_hotels TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_nearby_hotels" ON nearby_hotels;
CREATE POLICY "public_read_nearby_hotels" ON nearby_hotels FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_nearby_hotels_temple_id ON nearby_hotels(temple_id);

-- Temple Administration
CREATE TABLE IF NOT EXISTS temple_administration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  temple_id uuid REFERENCES temples(id) ON DELETE CASCADE UNIQUE,
  executive_officer text,
  maintenance_incharge text,
  managing_department text,
  contact_number text,
  official_website text,
  last_verified timestamptz
);

ALTER TABLE temple_administration ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON temple_administration TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_temple_administration" ON temple_administration;
CREATE POLICY "public_read_temple_administration" ON temple_administration FOR SELECT
  TO anon, authenticated USING (true);
