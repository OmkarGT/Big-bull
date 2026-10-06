import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FlaskConical, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { formatCurrency } from '../utils/formatCurrency.js';

const STARTING_CAPITAL = 100000;

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password });
      navigate('/', { replace: true });
    } catch (signupError) {
      setError(signupError.message);
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
        </div>

        <div className="bb-card p-6">
          <h2 className="text-lg font-bold text-ink-900">Create your practice account</h2>
          <p className="mt-1 text-sm text-ink-500">
            You start with {formatCurrency(STARTING_CAPITAL, { decimals: 0 })} of virtual money.
          </p>

          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="bb-label" htmlFor="name">Full name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                minLength={2}
                placeholder="Raju Chintu"
                value={form.name}
                onChange={handleChange}
                className="bb-input"
              />
            </div>

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
                autoComplete="new-password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={form.password}
                onChange={handleChange}
                className="bb-input"
              />
            </div>

            <div>
              <label className="bb-label" htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Repeat your password"
                value={form.confirmPassword}
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
              <UserPlus className="h-4 w-4" />
              {submitting ? 'Creating account...' : 'Sign up'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-ink-500">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-bull-600 hover:underline">
              Login
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-[11px] text-ink-500">
          Educational demo. All companies, prices and balances are fictional.
        </p>
      </div>
    </div>
  );
}
