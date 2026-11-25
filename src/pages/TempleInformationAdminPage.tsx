import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Shield, Upload } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { useAuth } from '@/lib/auth';
import {
  supabase,
  type TempleInformation,
  type TempleInformationSection as SectionKey,
  type TempleInformationStatus,
} from '@/lib/supabase';
import { TEMPLE_INFORMATION_SECTIONS } from '@/data/templeInformation';

type District = { id: string; name: string };
type Temple = { id: string; name: string; district_id: string };

const EMPTY_DETAILS: Record<SectionKey, Record<string, unknown>> = {
  administration: {
    managing_authority: '',
    executive_officer: '',
    hr_administrative_office: '',
    maintenance_authority: '',
    official_contact_number: '',
    official_website: '',
    administrative_office_address: '',
  },
  facilities: {
    drinking_water: '',
    toilets: '',
    wheelchair_accessibility: '',
    senior_citizen_facilities: '',
    parking: '',
    cloakroom: '',
    resting_areas: '',
    annadhanam: '',
    shoe_storage: '',
    queue_facilities: '',
    drinking_water_points: '',
    accommodation: '',
  },
  transportation: {
    nearest_railway_station: '',
    railway_station_distance: '',
    nearest_bus_stand: '',
    bus_stand_distance: '',
    nearest_airport: '',
    airport_distance: '',
    local_bus_availability: '',
    taxi_auto_availability: '',
    road_connectivity: '',
    google_maps_url: '',
  },
  emergency: {
    nearest_government_hospital: '',
    hospital_address: '',
    hospital_phone_number: '',
    nearest_police_station: '',
    police_station_contact: '',
    fire_and_rescue_services: '',
    ambulance_108: '',
    temple_emergency_contact: '',
    pilgrim_emergency_instructions: '',
  },
  hotels: {
    items: [{
      hotel_name: '',
      hotel_address: '',
      distance_from_temple_km: '',
      contact_number: '',
      category: '',
      accommodation_availability: '',
      google_maps_url: '',
    }],
  },
  timings: {
    morning_opening_time: '',
    morning_darshan_time: '',
    afternoon_closing_time: '',
    evening_opening_time: '',
    evening_darshan_time: '',
    night_closing_time: '',
    special_darshan_timings: '',
    pooja_timings: '',
    festival_day_timing_changes: '',
    weekly_holidays: '',
  },
  festivals: {
    items: [{
      festival_name: '',
      festival_month_or_date: '',
      description: '',
      importance: '',
      special_poojas: '',
      annual_festival_details: '',
      procession_details: '',
      official_announcement_url: '',
    }],
  },
};

const SECTION_KEYS = TEMPLE_INFORMATION_SECTIONS.map((section) => section.id);

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseDetails(text: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(text);
  if (!isObject(parsed)) throw new Error('Information must be a JSON object.');
  return parsed;
}

function detailsForEditor(record: TempleInformation | undefined, section: SectionKey) {
  return record && Object.keys(record.details ?? {}).length
    ? record.details
    : EMPTY_DETAILS[section];
}

function containsInformation(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.some(containsInformation);
  if (isObject(value)) {
    return Object.entries(value).some(([key, item]) => key !== 'photos' && containsInformation(item));
  }
  return false;
}

export default function TempleInformationAdminPage() {
  const { user, adminRole, adminLoading, adminAssignments } = useAuth();
  const [districts, setDistricts] = useState<District[]>([]);
  const [temples, setTemples] = useState<Temple[]>([]);
  const [records, setRecords] = useState<TempleInformation[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedTemple, setSelectedTemple] = useState('');
  const [selectedSection, setSelectedSection] = useState<SectionKey>('administration');
  const [detailsText, setDetailsText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<TempleInformationStatus | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const assignedDistrictId = adminAssignments.find((assignment) => assignment.role === 'district_admin')?.district_id ?? null;
  const allowedAdmin = adminRole === 'state_admin' || (adminRole === 'district_admin' && !!assignedDistrictId);

  useEffect(() => {
    if (adminLoading) return;
    if (!user || !allowedAdmin) {
      setLoading(false);
      return;
    }

    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      const districtsQuery = supabase.from('districts').select('id,name').order('name');
      const templesQuery = supabase.from('temples').select('id,name,district_id').order('name');
      const [districtResult, templeResult] = await Promise.all([
        adminRole === 'district_admin' && assignedDistrictId
          ? districtsQuery.eq('id', assignedDistrictId)
          : districtsQuery,
        adminRole === 'district_admin' && assignedDistrictId
          ? templesQuery.eq('district_id', assignedDistrictId)
          : templesQuery,
      ]);
      if (!active) return;
      if (districtResult.error || templeResult.error) {
        setError(districtResult.error?.message || templeResult.error?.message || 'Temple records could not be loaded.');
        setLoading(false);
        return;
      }

      const districtRows = (districtResult.data ?? []) as District[];
      const templeRows = (templeResult.data ?? []) as Temple[];
      const templeIds = templeRows.map((temple) => temple.id);
      const infoResult = templeIds.length
        ? await supabase.from('temple_information').select('*').in('temple_id', templeIds).order('section').range(0, 1999)
        : { data: [], error: null };
      if (!active) return;
      if (infoResult.error) {
        setError(`Temple information records could not be loaded. Apply the temple-information database migration first. ${infoResult.error.message}`);
        setLoading(false);
        return;
      }
      const rows = (infoResult.data ?? []) as TempleInformation[];
      setDistricts(districtRows);
      setTemples(templeRows);
      setRecords(rows);
      const firstDistrictId = districtRows[0]?.id ?? '';
      setSelectedDistrict(firstDistrictId);
      setSelectedTemple(templeRows.find((temple) => temple.district_id === firstDistrictId)?.id ?? '');
      setLoading(false);
    })().catch((loadError: unknown) => {
      if (!active) return;
      setError(loadError instanceof Error ? loadError.message : 'Temple information could not be loaded.');
      setLoading(false);
    });

    return () => { active = false; };
  }, [adminLoading, adminRole, allowedAdmin, assignedDistrictId, user]);

  const visibleTemples = useMemo(
    () => temples.filter((temple) => !selectedDistrict || temple.district_id === selectedDistrict),
    [selectedDistrict, temples],
  );
  const templeRecords = records.filter((record) => record.temple_id === selectedTemple);
  const selectedRecord = templeRecords.find((record) => record.section === selectedSection);
  const selectedTempleName = temples.find((temple) => temple.id === selectedTemple)?.name ?? '';
  const pendingCount = records.filter((record) => record.status === 'pending').length;
  const rejectedCount = records.filter((record) => record.status === 'rejected').length;

  useEffect(() => {
    setDetailsText(JSON.stringify(detailsForEditor(selectedRecord, selectedSection), null, 2));
    setSourceUrl(selectedRecord?.source_url ?? '');
    setReviewNotes(selectedRecord?.review_notes ?? '');
  }, [selectedRecord, selectedSection]);

  const detailsDirty = detailsText !== JSON.stringify(detailsForEditor(selectedRecord, selectedSection), null, 2)
    || sourceUrl !== (selectedRecord?.source_url ?? '');

  const saveDetails = async () => {
    if (!user || !selectedTemple) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const details = parseDetails(detailsText);
      if (sourceUrl.trim()) {
        const source = new URL(sourceUrl.trim());
        if (!['http:', 'https:'].includes(source.protocol)) throw new Error('Use an HTTP or HTTPS source URL.');
      }
      const { data, error: saveError } = await supabase
        .from('temple_information')
        .upsert({
          temple_id: selectedTemple,
          section: selectedSection,
          details,
          source_url: sourceUrl.trim() || null,
          status: 'pending',
          submitted_by: user.id,
          reviewed_by: null,
          last_verified: null,
        }, { onConflict: 'temple_id,section' })
        .select('*')
        .single();
      if (saveError) throw saveError;
      const updated = data as TempleInformation;
      setRecords((current) => [
        ...current.filter((record) => record.id !== updated.id && !(record.temple_id === updated.temple_id && record.section === updated.section)),
        updated,
      ]);
      setMessage(`${selectedSectionLabel()} information saved and submitted for verification.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Information could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const review = async (decision: 'verified' | 'rejected') => {
    if (!user || !selectedRecord) return;
    if (detailsDirty) {
      setError('Save your changes as a pending submission before reviewing this record.');
      return;
    }
    if (decision === 'verified' && !sourceUrl.trim()) {
      setError('Add an official source URL before verification.');
      return;
    }
    if (decision === 'verified') {
      try {
        if (!containsInformation(parseDetails(detailsText))) {
          setError('Add at least one verified information value before approval.');
          return;
        }
      } catch {
        setError('Correct the information JSON before approval.');
        return;
      }
    }
    if (decision === 'rejected' && !reviewNotes.trim()) {
      setError('Add review notes before rejecting this information.');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { data, error: reviewError } = await supabase
        .from('temple_information')
        .update({
          status: decision,
          reviewed_by: user.id,
          review_notes: reviewNotes.trim(),
          last_verified: decision === 'verified' ? new Date().toISOString() : null,
        })
        .eq('id', selectedRecord.id)
        .select('*')
        .single();
      if (reviewError) throw reviewError;
      const updated = data as TempleInformation;
      setRecords((current) => current.map((record) => record.id === updated.id ? updated : record));
      setMessage(decision === 'verified' ? 'Information is now visible to the public.' : 'Information was rejected and remains hidden from the public.');
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'The information review could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selectedRecord || !selectedTemple) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
      setError('Choose a JPG, PNG, WebP, or AVIF image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Each image must be 10 MB or smaller.');
      return;
    }
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const currentDetails = parseDetails(detailsText);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${selectedTemple}/${selectedSection}/${selectedRecord.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('temple-info-media')
        .upload(storagePath, file, { cacheControl: '3600', contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const photos = Array.isArray(currentDetails.photos) ? currentDetails.photos : [];
      const nextDetails = {
        ...currentDetails,
        photos: [...photos, {
          storage_path: storagePath,
          alt: file.name,
          image_source: '',
          image_license: '',
          caption: '',
        }],
      };
      setDetailsText(JSON.stringify(nextDetails, null, 2));
      setMessage('Photo uploaded privately. Add its source and license in the JSON details, then save the information record.');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Photo upload failed.');
    } finally {
      setUploading(false);
    }
  };

  function selectedSectionLabel() {
    return TEMPLE_INFORMATION_SECTIONS.find((section) => section.id === selectedSection)?.title ?? selectedSection;
  }

  if (loading || adminLoading) {
    return <PageLayout><div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-navy-900/50" /></div></PageLayout>;
  }

  if (!user || !allowedAdmin) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <Shield className="mx-auto mb-4 h-10 w-10 text-gold-600" />
          <h1 className="font-serif text-2xl font-bold text-navy-900">State Admin or District Admin access required</h1>
          <p className="mt-3 text-sm text-navy-900/70">Your assigned database role controls which district records you can update and review.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-600">Temple Information Management</p>
            <h1 className="mt-2 font-serif text-3xl font-bold text-navy-900">Temple details verification</h1>
            <p className="mt-2 text-sm text-navy-900/70">Only State Admins can verify or reject submissions. District Admins can submit information only for their assigned district.</p>
          </div>
          <Link to={adminRole === 'state_admin' ? '/state-admin' : '/district-admin'} className="text-sm font-semibold text-maroon-deep hover:underline">Back to dashboard →</Link>
        </div>

        {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />{error}</div>}
        {message && <div role="status" className="mb-5 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />{message}</div>}

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gold-200 bg-white p-5"><p className="text-sm text-navy-900/60">Temples in scope</p><p className="mt-2 font-serif text-2xl font-bold text-navy-900">{temples.length}</p></div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5"><p className="text-sm text-amber-900/70">Pending information sections</p><p className="mt-2 font-serif text-2xl font-bold text-amber-900">{pendingCount}</p></div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-5"><p className="text-sm text-red-900/70">Rejected sections</p><p className="mt-2 font-serif text-2xl font-bold text-red-900">{rejectedCount}</p></div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div className="space-y-5 rounded-xl border border-gold-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div>
                <label htmlFor="info-district" className="mb-1.5 block text-sm font-semibold text-navy-900">District</label>
                <select id="info-district" value={selectedDistrict} onChange={(event) => {
                  setSelectedDistrict(event.target.value);
                  const nextTemple = temples.find((temple) => temple.district_id === event.target.value);
                  setSelectedTemple(nextTemple?.id ?? '');
                }} disabled={adminRole === 'district_admin'} className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5 text-sm disabled:bg-gray-100">
                  <option value="">All districts</option>
                  {districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="info-temple" className="mb-1.5 block text-sm font-semibold text-navy-900">Temple</label>
                <select id="info-temple" value={selectedTemple} onChange={(event) => setSelectedTemple(event.target.value)} className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5 text-sm">
                  <option value="">Select temple</option>
                  {visibleTemples.map((temple) => <option key={temple.id} value={temple.id}>{temple.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="info-section" className="mb-1.5 block text-sm font-semibold text-navy-900">Information section</label>
              <select id="info-section" value={selectedSection} onChange={(event) => setSelectedSection(event.target.value as SectionKey)} className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5 text-sm">
                {TEMPLE_INFORMATION_SECTIONS.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}
              </select>
            </div>
            {selectedRecord && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-cream p-3 text-sm">
                <span>Verification status</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${selectedRecord.status === 'verified' ? 'bg-emerald-100 text-emerald-800' : selectedRecord.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'}`}>{selectedRecord.status}</span>
                {selectedRecord.last_verified && <span className="w-full text-xs text-navy-900/60">Last verified {new Date(selectedRecord.last_verified).toLocaleDateString()}</span>}
              </div>
            )}
            {selectedRecord?.review_notes && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Reviewer note: {selectedRecord.review_notes}</p>
            )}
            <div>
              <label htmlFor="info-source" className="mb-1.5 block text-sm font-semibold text-navy-900">Official source URL</label>
              <input id="info-source" type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://..." className="w-full rounded-lg border border-navy-200 px-3 py-2.5 text-sm" />
              <p className="mt-1 text-xs text-navy-900/55">A valid source URL and verification date are required before publication.</p>
            </div>
            <div>
              <label htmlFor="info-json" className="mb-1.5 block text-sm font-semibold text-navy-900">{selectedSectionLabel()} information (JSON)</label>
              <textarea id="info-json" value={detailsText} onChange={(event) => setDetailsText(event.target.value)} rows={18} spellCheck={false} className="w-full rounded-lg border border-navy-200 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-100" />
              <p className="mt-2 text-xs leading-relaxed text-navy-900/60">Use the field names in the blank starter template. Leave unknown facts empty. Hotel and festival lists use an <code>items</code> array. No unverified values should be submitted.</p>
            </div>
            <div>
              <label htmlFor="info-photo-upload" className="mb-1.5 block text-sm font-semibold text-navy-900">Facility or festival photos</label>
              <label htmlFor="info-photo-upload" className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gold-300 bg-gold-50 px-4 py-2.5 text-sm font-semibold text-navy-900 ${!selectedRecord || uploading ? 'pointer-events-none opacity-50' : 'hover:bg-gold-100'}`}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {uploading ? 'Uploading…' : 'Upload image'}
              </label>
              <input id="info-photo-upload" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={uploadPhoto} disabled={!selectedRecord || uploading} className="sr-only" />
              <p className="mt-1 text-xs text-navy-900/55">JPG, PNG, WebP, or AVIF; maximum 10 MB. Include an image source and license in the JSON before saving.</p>
            </div>
            <button type="button" onClick={saveDetails} disabled={!selectedTemple || saving || uploading} className="inline-flex items-center gap-2 rounded-lg bg-maroon-deep px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Submit for verification
            </button>
          </div>

          <div className="space-y-5">
            <section className="rounded-xl border border-gold-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-serif text-xl font-bold text-navy-900">Review information</h2>
                  <p className="mt-1 text-sm text-navy-900/60">{selectedTempleName || 'Select a temple'} · {selectedSectionLabel()}</p>
                </div>
                <select aria-label="Filter information status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TempleInformationStatus | 'all')} className="rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm">
                  <option value="pending">Pending</option><option value="rejected">Rejected</option><option value="verified">Verified</option><option value="all">All statuses</option>
                </select>
              </div>
              {!selectedRecord ? (
                <p className="rounded-lg bg-cream p-4 text-sm text-navy-900/65">No record exists for this section. Apply the database migration; it creates one pending record per temple and section.</p>
              ) : statusFilter !== 'all' && selectedRecord.status !== statusFilter ? (
                <p className="rounded-lg bg-cream p-4 text-sm text-navy-900/65">This section is {selectedRecord.status}. Change the status filter to review it.</p>
              ) : (
                <>
                  <p className="mb-4 text-xs text-navy-900/60">Record {selectedRecord.id} · last updated {new Date(selectedRecord.updated_at).toLocaleDateString()}</p>
                  <label htmlFor="review-notes" className="mb-1.5 block text-sm font-semibold text-navy-900">Reviewer notes</label>
                  <textarea id="review-notes" value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} rows={3} maxLength={2000} placeholder="Required when rejecting a submission." className="w-full rounded-lg border border-navy-200 px-3 py-2.5 text-sm" />
                  {adminRole === 'state_admin' ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => review('verified')} disabled={saving || detailsDirty || selectedRecord.status === 'verified'} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Approve &amp; publish</button>
                      <button type="button" onClick={() => review('rejected')} disabled={saving || detailsDirty} className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-800 disabled:opacity-50">Reject</button>
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-navy-900/60">District Admin submissions remain pending until a State Admin reviews them.</p>
                  )}
                  {detailsDirty && <p className="mt-3 text-xs font-medium text-amber-800">Save pending changes before reviewing this record.</p>}
                </>
              )}
            </section>

            <section className="rounded-xl border border-gold-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-3 font-serif text-xl font-bold text-navy-900">Information status in this temple</h2>
              <ul className="space-y-2">
                {SECTION_KEYS.map((sectionId) => {
                  const record = templeRecords.find((item) => item.section === sectionId);
                  const label = TEMPLE_INFORMATION_SECTIONS.find((item) => item.id === sectionId)?.title ?? sectionId;
                  return (
                    <li key={sectionId} className="flex items-center justify-between gap-3 rounded-lg bg-cream px-3 py-2.5 text-sm">
                      <button type="button" onClick={() => setSelectedSection(sectionId)} className="text-left font-medium text-navy-900 hover:text-maroon-deep">{label}</button>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${record?.status === 'verified' ? 'bg-emerald-100 text-emerald-800' : record?.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'}`}>{record?.status ?? 'missing'}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </section>
      </main>
    </PageLayout>
  );
}
