import { useState, type FormEvent } from 'react';
import { Loader2, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface AdminCredentialLoginProps {
  onAuthenticated: () => void | Promise<unknown>;
}

export default function AdminCredentialLogin({ onAuthenticated }: AdminCredentialLoginProps) {
  const { signInWithLocalAdmin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signInWithLocalAdmin(username, password, secretCode);
      if (result.error) {
        setError(result.error);
        return;
      }

      setUsername('');
      setPassword('');
      setSecretCode('');
      await onAuthenticated();
    } catch {
      setError('Admin sign-in could not be completed. Check the server configuration and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md space-y-4 text-left">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div>
        <label htmlFor="admin-username" className="mb-1.5 block text-sm font-medium text-navy-900">Username</label>
        <input
          id="admin-username"
          name="username"
          autoComplete="username"
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="w-full rounded-lg border border-navy-200 px-3 py-2.5 outline-none focus:border-gold-500"
        />
      </div>
      <div>
        <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium text-navy-900">Password</label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-navy-200 px-3 py-2.5 outline-none focus:border-gold-500"
        />
      </div>
      <div>
        <label htmlFor="admin-secret-code" className="mb-1.5 block text-sm font-medium text-navy-900">Secret code</label>
        <input
          id="admin-secret-code"
          name="secretCode"
          type="password"
          autoComplete="one-time-code"
          required
          value={secretCode}
          onChange={(event) => setSecretCode(event.target.value)}
          className="w-full rounded-lg border border-navy-200 px-3 py-2.5 outline-none focus:border-gold-500"
        />
      </div>
      <p className="text-xs text-navy-900/55">Local demo only. Booking approvals are saved in this browser.</p>
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-navy-900 to-navy-800 px-6 py-3 font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shield className="h-5 w-5" />}
        {loading ? 'Signing in…' : 'Admin sign in'}
      </button>
    </form>
  );
}
