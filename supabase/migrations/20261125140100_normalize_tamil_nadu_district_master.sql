/*
# Stage 1: Tamil Nadu district master validation

Normalizes the official district spellings used by the News & Events module.
The migration keeps the existing district UUID and its temples/news relationships.
*/

DO $$
DECLARE
  conflicting_rows integer;
BEGIN
  SELECT count(*)
  INTO conflicting_rows
  FROM districts
  WHERE name IN ('Villupuram', 'Sivagangai');

  IF conflicting_rows > 0 THEN
    IF EXISTS (SELECT 1 FROM districts WHERE name = 'Viluppuram')
       AND EXISTS (SELECT 1 FROM districts WHERE name = 'Villupuram') THEN
      RAISE EXCEPTION 'Cannot normalize Villupuram because Viluppuram already exists';
    END IF;

    IF EXISTS (SELECT 1 FROM districts WHERE name = 'Sivaganga')
       AND EXISTS (SELECT 1 FROM districts WHERE name = 'Sivagangai') THEN
      RAISE EXCEPTION 'Cannot normalize Sivagangai because Sivaganga already exists';
    END IF;

    UPDATE districts SET name = 'Viluppuram', updated_at = now()
    WHERE name = 'Villupuram';

    UPDATE districts SET name = 'Sivaganga', updated_at = now()
    WHERE name = 'Sivagangai';
  END IF;
END;
$$;

DO $$
DECLARE
  district_count integer;
  duplicate_count integer;
  official_names text[] := ARRAY[
    'Ariyalur',
    'Chengalpattu',
    'Chennai',
    'Coimbatore',
    'Cuddalore',
    'Dharmapuri',
    'Dindigul',
    'Erode',
    'Kallakurichi',
    'Kancheepuram',
    'Kanniyakumari',
    'Karur',
    'Krishnagiri',
    'Madurai',
    'Mayiladuthurai',
    'Nagapattinam',
    'Namakkal',
    'Perambalur',
    'Pudukkottai',
    'Ramanathapuram',
    'Ranipet',
    'Salem',
    'Sivaganga',
    'Tenkasi',
    'Thanjavur',
    'Theni',
    'Thoothukudi',
    'Tiruchirappalli',
    'Tirunelveli',
    'Tirupathur',
    'Tiruppur',
    'Tiruvallur',
    'Tiruvannamalai',
    'Tiruvarur',
    'Vellore',
    'Viluppuram',
    'Virudhunagar',
    'The Nilgiris'
  ];
  missing_names text[];
  extra_names text[];
BEGIN
  SELECT count(*), count(*) - count(DISTINCT name)
  INTO district_count, duplicate_count
  FROM districts;

  IF duplicate_count <> 0 THEN
    RAISE EXCEPTION 'District master has duplicate names';
  END IF;

  IF district_count <> array_length(official_names, 1) THEN
    RAISE EXCEPTION 'District master must contain exactly % districts; found %',
      array_length(official_names, 1), district_count;
  END IF;

  SELECT array_agg(name ORDER BY name)
  INTO missing_names
  FROM unnest(official_names) AS name
  WHERE NOT EXISTS (
    SELECT 1 FROM districts d WHERE d.name = name
  );

  SELECT array_agg(d.name ORDER BY d.name)
  INTO extra_names
  FROM districts d
  WHERE d.name <> ALL(official_names);

  IF missing_names IS NOT NULL OR extra_names IS NOT NULL THEN
    RAISE EXCEPTION 'District master mismatch. Missing: %. Extra: %',
      coalesce(missing_names::text, '[]'),
      coalesce(extra_names::text, '[]');
  END IF;
END;
$$;
