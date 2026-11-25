UPDATE public.darshan_slots s
SET is_closed = true
WHERE s.slot_date >= CURRENT_DATE
  AND NOT (
    (s.session_type = 'morning' AND s.slot_start_time = TIME '07:00' AND s.slot_end_time = TIME '08:00')
    OR
    (s.session_type = 'evening' AND s.slot_start_time = TIME '19:00' AND s.slot_end_time = TIME '20:00')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.slot_id = s.id
      AND b.booking_status IN ('pending', 'confirmed')
  );

INSERT INTO public.darshan_slot_configs (
  temple_id,
  category_type,
  session_type,
  available_date,
  session_start_time,
  session_end_time,
  slot_duration_minutes,
  is_active
)
SELECT
  c.temple_id,
  c.category_type,
  session.session_type,
  CURRENT_DATE + day_offset.day,
  session.session_start_time,
  session.session_end_time,
  60,
  true
FROM public.darshan_categories c
CROSS JOIN generate_series(0, 29) AS day_offset(day)
CROSS JOIN (
  VALUES
    ('morning'::text, TIME '07:00', TIME '08:00'),
    ('evening'::text, TIME '19:00', TIME '20:00')
) AS session(session_type, session_start_time, session_end_time)
WHERE c.temple_id IS NOT NULL
  AND c.is_active
  AND NOT EXISTS (
    SELECT 1
    FROM public.darshan_slot_configs existing
    WHERE existing.temple_id = c.temple_id
      AND existing.category_type = c.category_type
      AND existing.session_type = session.session_type
      AND existing.available_date = CURRENT_DATE + day_offset.day
      AND existing.session_start_time = session.session_start_time
      AND existing.session_end_time = session.session_end_time
  );

INSERT INTO public.darshan_slots (
  config_id,
  temple_id,
  category_type,
  slot_date,
  session_type,
  slot_start_time,
  slot_end_time,
  total_capacity,
  senior_capacity
)
SELECT
  config.id,
  category.temple_id,
  category.category_type,
  config.available_date,
  config.session_type,
  config.session_start_time,
  config.session_end_time,
  category.total_capacity,
  category.senior_capacity
FROM public.darshan_slot_configs config
JOIN public.darshan_categories category
  ON category.temple_id = config.temple_id
 AND category.category_type = config.category_type
WHERE config.available_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 29
  AND config.slot_duration_minutes = 60
  AND config.is_active
  AND category.is_active
  AND (
    (config.session_type = 'morning'
      AND config.session_start_time = TIME '07:00'
      AND config.session_end_time = TIME '08:00')
    OR
    (config.session_type = 'evening'
      AND config.session_start_time = TIME '19:00'
      AND config.session_end_time = TIME '20:00')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.darshan_slots existing
    WHERE existing.temple_id = config.temple_id
      AND existing.category_type = config.category_type
      AND existing.slot_date = config.available_date
      AND existing.session_type = config.session_type
      AND existing.slot_start_time = config.session_start_time
      AND existing.slot_end_time = config.session_end_time
  );
