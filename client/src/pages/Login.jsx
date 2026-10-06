import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FlaskConical, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { formatCurrency } from '../utils/formatCurrency.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(form);
      navigate('/', { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-50 px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/logo.svg" alt="Big Bull logo" className="h-14 w-14" />
          <h1 className="mt-3 text-2xl font-black tracking-tight text-ink-900">BIG BULL</h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-bull-600">
            <FlaskConical className="h-3.5 w-3.5" /> Paper Trading
          </p>
          <p className="mt-2 text-sm text-ink-500">
            Practice buying and selling fictional stocks with virtual INR.
          </p>
        </div>

        <div className="bb-card p-6">
          <h2 className="text-lg font-bold text-ink-900">Log in</h2>

          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="bb-label" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                className="bb-input"
              />
            </div>

            <div>
              <label className="bb-label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Your password"
                value={form.password}
                onChange={handleChange}
                className="bb-input"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                {error}
              </p>
            )}

            <button type="submit" className="bb-btn-primary w-full" disabled={submitting}>
              <LogIn className="h-4 w-4" />
              {submitting ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-ink-500">
            No account yet?{' '}
            <Link to="/signup" className="font-semibold text-bull-600 hover:underline">
              Create one with {formatCurrency(100000, { decimals: 0 })} virtual capital
            </Link>
          </p>
        </div>

        <p className="mt-4 flex items-start gap-1.5 text-center text-[11px] text-ink-500">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Demo only. No real broker, no real money, no real market data. Every company on Big Bull
          is fictional.
        </p>
      </div>
    </div>
  );
}
