import { useState, useEffect, type FormEvent } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Settings } from 'lucide-react';
import AdminAccessGate from '@/components/AdminAccessGate';
import { useAuth } from '@/lib/auth';
import { fetchSeniorMinAge, setSeniorMinAge } from '@/lib/booking';

export default function AdminSettingsPage() {
  return (
    <AdminAccessGate>
      <SettingsForm />
    </AdminAccessGate>
  );
}

function SettingsForm() {
  const { adminProfile } = useAuth();
  const templeId = adminProfile?.temple_id ?? null;

  const [minAge, setMinAge] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!templeId) return;
    fetchSeniorMinAge(templeId)
      .then((age) => setMinAge(age === null ? '' : String(age)))
      .catch(() => setMessage({ type: 'error', text: 'The current eligibility age could not be loaded.' }))
      .finally(() => setLoading(false));
  }, [templeId]);

  if (!templeId) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <p className="text-navy-900/70">Your account is not assigned to a temple yet.</p>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const age = Number(minAge);
    if (!Number.isInteger(age) || age < 50 || age > 100) {
      setMessage({ type: 'error', text: 'Enter a whole number between 50 and 100.' });
      return;
    }
    setSaving(true);
    try {
      const result = await setSeniorMinAge(templeId, age);
      setMessage(result.success
        ? { type: 'success', text: `Senior citizen eligibility age is now ${age}.` }
        : { type: 'error', text: result.error || 'The setting could not be saved.' });
    } catch {
      setMessage({ type: 'error', text: 'The setting could not be saved. Please try again.' });
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-cream">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-navy-900">Temple settings</h1>
          <p className="mt-2 text-navy-900/70">Set the age from which visitors can apply for reserved senior citizen tickets.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-navy-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2 text-navy-900 font-semibold">
            <Settings className="w-5 h-5 text-gold-600" /> Senior citizen eligibility
          </div>
          <div>
            <label htmlFor="senior-min-age" className="block text-sm font-semibold text-navy-900 mb-2">
              Minimum age (years)
            </label>
            <input
              id="senior-min-age"
              type="number"
              min={50}
              max={100}
              value={minAge}
              onChange={(e) => setMinAge(e.target.value)}
              disabled={loading}
              className="w-32 px-4 py-3 rounded-lg border border-navy-200 bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>

          {message && (
            <div
              role="alert"
              className={`flex items-start gap-2 rounded-lg p-3 text-sm border ${
                message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
              <span>{message.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save setting
          </button>
        </form>
      </main>
    </div>
  );
}
