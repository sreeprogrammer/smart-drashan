import { ExternalLink, Phone } from 'lucide-react';
import type { TempleInformation, TempleInformationSection as SectionKey } from '@/lib/supabase';
import { TEMPLE_INFORMATION_SECTIONS } from '@/data/templeInformation';

const NA = 'Information not available – Admin update required.';

const FIELDS: Partial<Record<SectionKey, Array<[string, string]>>> = {
  administration: [
    ['managing_authority', 'Temple management authority'],
    ['executive_officer', 'Temple executive officer'],
    ['hr_administrative_office', 'HR & administrative office'],
    ['maintenance_authority', 'Temple maintenance authority'],
    ['official_contact_number', 'Official contact number'],
    ['official_website', 'Official website'],
    ['administrative_office_address', 'Administrative office address'],
  ],
  facilities: [
    ['drinking_water', 'Drinking water'],
    ['toilets', 'Toilets and washrooms'],
    ['wheelchair_accessibility', 'Wheelchair accessibility'],
    ['senior_citizen_facilities', 'Senior citizen facilities'],
    ['parking', 'Parking facilities'],
    ['cloakroom', 'Cloakroom / luggage storage'],
    ['resting_areas', 'Resting areas'],
    ['annadhanam', 'Annadhanam (free food)'],
    ['shoe_storage', 'Shoe storage'],
    ['queue_facilities', 'Queue facilities'],
    ['drinking_water_points', 'Drinking water points'],
    ['accommodation', 'Accommodation facilities'],
  ],
  transportation: [
    ['nearest_railway_station', 'Nearest railway station'],
    ['railway_station_distance', 'Railway station distance'],
    ['nearest_bus_stand', 'Nearest bus stand'],
    ['bus_stand_distance', 'Bus stand distance'],
    ['nearest_airport', 'Nearest airport'],
    ['airport_distance', 'Airport distance'],
    ['local_bus_availability', 'Local bus availability'],
    ['taxi_auto_availability', 'Taxi and auto availability'],
    ['road_connectivity', 'Road connectivity'],
    ['google_maps_url', 'Google Maps navigation'],
  ],
  emergency: [
    ['nearest_government_hospital', 'Nearest government hospital'],
    ['hospital_address', 'Hospital address'],
    ['hospital_phone_number', 'Hospital phone number'],
    ['nearest_police_station', 'Nearest police station'],
    ['police_station_contact', 'Police station contact'],
    ['fire_and_rescue_services', 'Fire and rescue services'],
    ['ambulance_108', 'Ambulance / 108 emergency'],
    ['temple_emergency_contact', 'Temple emergency contact'],
    ['pilgrim_emergency_instructions', 'Emergency instructions for pilgrims'],
  ],
  timings: [
    ['morning_opening_time', 'Morning opening time'],
    ['morning_darshan_time', 'Morning darshan time'],
    ['afternoon_closing_time', 'Afternoon closing time'],
    ['evening_opening_time', 'Evening opening time'],
    ['evening_darshan_time', 'Evening darshan time'],
    ['night_closing_time', 'Night closing time'],
    ['special_darshan_timings', 'Special darshan timings'],
    ['pooja_timings', 'Pooja timings'],
    ['festival_day_timing_changes', 'Festival-day timing changes'],
    ['weekly_holidays', 'Weekly holidays'],
  ],
};

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return NA;
  if (typeof value === 'boolean') return value ? 'Available' : 'Not available';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => displayValue(item)).join(', ') : NA;
  }
  return NA;
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function labelFor(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function RecordCard({ value }: { value: Record<string, unknown> }) {
  const entries = Object.entries(value).filter(([key]) => !['id', 'temple_id', 'created_at'].includes(key));
  if (!entries.length) return null;
  return (
    <div className="rounded-lg border border-gold-100 bg-gold-50/50 p-4">
      <dl className="grid gap-3 sm:grid-cols-2">
        {entries.map(([key, item]) => {
          const url = safeUrl(item);
          const isPhone = /phone|contact|number/i.test(key) && typeof item === 'string' && /^[+\d().\-\s]+$/.test(item);
          return (
            <div key={key} className="min-w-0">
              <dt className="text-xs font-semibold text-gold-700">{labelFor(key)}</dt>
              <dd className="mt-1 break-words text-sm text-navy-900/80">
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-maroon-deep hover:underline">
                    {String(item)}<ExternalLink className="h-3 w-3 flex-shrink-0" />
                  </a>
                ) : isPhone ? (
                  <a href={`tel:${item}`} className="inline-flex items-center gap-1 text-maroon-deep hover:underline">
                    <Phone className="h-3 w-3" />{String(item)}
                  </a>
                ) : displayValue(item)}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

export default function TempleInformationSection({
  section,
  record,
  photoUrls,
  photoLoadError,
  sectionRef,
}: {
  section: (typeof TEMPLE_INFORMATION_SECTIONS)[number];
  record: TempleInformation | undefined;
  photoUrls: Record<string, string>;
  photoLoadError: string | null;
  sectionRef: (element: HTMLElement | null) => void;
}) {
  const Icon = section.icon;
  const details = record?.details ?? {};
  const fields = FIELDS[section.id] ?? [];
  const items = Array.isArray(details.items)
    ? details.items.filter((item): item is Record<string, unknown> => (
      !!item && typeof item === 'object' && !Array.isArray(item)
      && Object.values(item).some(hasValue)
    ))
    : [];
  const photos = Array.isArray(details.photos)
    ? details.photos.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
    : [];
  const hasContent = fields.some(([key]) => details[key] !== undefined && details[key] !== null && details[key] !== '')
    || items.length > 0
    || photos.length > 0;

  return (
    <section id={section.id} ref={sectionRef} className="mb-12 scroll-mt-28">
      <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl font-bold text-navy-900">
        <Icon className="h-6 w-6 text-gold-600" /> {section.title}
      </h2>
      <details open className="rounded-xl border border-gold-200 bg-white shadow-sm">
        <summary className="cursor-pointer list-none rounded-xl px-5 py-4 font-semibold text-navy-900 marker:hidden">
          {record ? `Verified information · last checked ${record.last_verified ? new Date(record.last_verified).toLocaleDateString() : 'date unavailable'}` : NA}
        </summary>
        <div className="space-y-5 border-t border-gold-100 p-5">
          {photoLoadError && photos.length > 0 && (
            <p role="status" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              Verified photos could not be loaded: {photoLoadError}
            </p>
          )}
          {!record || !hasContent ? (
            <p className="text-sm italic text-navy-900/60">{NA}</p>
          ) : (
            <>
              {fields.length > 0 && (
                <dl className="grid gap-4 sm:grid-cols-2">
                  {fields.map(([key, label]) => {
                    const value = details[key];
                    const url = safeUrl(value);
                    const isPhone = /phone|contact|number/i.test(key) && typeof value === 'string' && /^[+\d().\-\s]+$/.test(value);
                    return (
                      <div key={key} className="min-w-0">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-gold-700">{label}</dt>
                        <dd className="mt-1 break-words text-sm text-navy-900/80">
                          {url ? (
                            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-maroon-deep hover:underline">
                              {key === 'google_maps_url' ? 'Open Google Maps' : String(value)}<ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : isPhone ? (
                            <a href={`tel:${value}`} className="inline-flex items-center gap-1 text-maroon-deep hover:underline">
                              <Phone className="h-3.5 w-3.5" />{value}
                            </a>
                          ) : displayValue(value)}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              )}
              {items.length > 0 && (
                <div className="space-y-3">
                  {items.map((item, index) => <RecordCard key={index} value={item} />)}
                </div>
              )}
              {photos.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {photos.map((photo, index) => {
                    const storagePath = typeof photo.storage_path === 'string' ? photo.storage_path : '';
                    const imageUrl = storagePath ? photoUrls[storagePath] : safeUrl(photo.image_url);
                    const imageSourceUrl = safeUrl(photo.image_source);
                    return (
                      <figure key={storagePath || index} className="overflow-hidden rounded-lg border border-gold-100 bg-cream">
                        <div className="flex aspect-video items-center justify-center bg-navy-900/5 p-2">
                          {imageUrl ? (
                            <img src={imageUrl} alt={String(photo.alt || photo.caption || section.title)} loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            <span className="px-3 text-center text-xs text-navy-900/60">{NA}</span>
                          )}
                        </div>
                        {Boolean(photo.caption || photo.image_source || photo.image_license) && (
                          <figcaption className="space-y-1 p-3 text-xs text-navy-900/70">
                            {Boolean(photo.caption) && <p className="font-medium">{String(photo.caption)}</p>}
                            {Boolean(photo.image_source) && (
                              <p>Source: {imageSourceUrl ? <a href={imageSourceUrl} target="_blank" rel="noopener noreferrer" className="text-maroon-deep hover:underline">Image source</a> : String(photo.image_source)}</p>
                            )}
                            {Boolean(photo.image_license) && <p>License: {String(photo.image_license)}</p>}
                          </figcaption>
                        )}
                      </figure>
                    );
                  })}
                </div>
              )}
              {record.source_url && safeUrl(record.source_url) && (
                <p className="border-t border-gold-100 pt-4 text-xs text-navy-900/60">
                  Verified source:{' '}
                  <a href={record.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-maroon-deep hover:underline">
                    Official information <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              )}
            </>
          )}
        </div>
      </details>
    </section>
  );
}
