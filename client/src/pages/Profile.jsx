import { useEffect, useState } from 'react';
import { AlertTriangle, RotateCcw, Save, ShieldCheck, Wallet } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Loading from '../components/Loading.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { userApi } from '../services/api.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { formatDateTime, formatNumber } from '../utils/formatNumber.js';

const DEFAULT_CAPITAL = 100000;

export default function Profile() {
  const { user, refreshUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [name, setName] = useState(user?.name ?? '');
  const [nameMessage, setNameMessage] = useState(null);
  const [savingName, setSavingName] = useState(false);

  const [capitalInput, setCapitalInput] = useState(String(DEFAULT_CAPITAL));
  const [capitalMessage, setCapitalMessage] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const data = await userApi.getProfile();
        if (cancelled) return;
        setProfile(data.user);
        setSummary(data.summary);
        setName(data.user.name);
        setCapitalInput(String(data.user.virtual_balance));
      } catch (loadError) {
        if (!cancelled) setError(loadError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleNameSubmit(event) {
    event.preventDefault();
    setSavingName(true);
    setNameMessage(null);

    try {
      const data = await userApi.updateProfile({ name });
      setProfile(data.user);
      await refreshUser(data.user);
      setNameMessage({ type: 'success', message: 'Name updated' });
    } catch (nameError) {
      setNameMessage({ type: 'error', message: nameError.message });
    } finally {
      setSavingName(false);
    }
  }

  async function handleResetCapital(event) {
    event.preventDefault();
    setCapitalMessage(null);

    if (!confirmReset) {
      setCapitalMessage({
        type: 'error',
        message: 'Please confirm that you understand the portfolio will be cleared.',
      });
      return;
    }

    setResetting(true);

    const amount = Number(capitalInput);

    try {
      const data = await userApi.resetCapital(amount);
      setProfile(data.user);
      setSummary({
        portfolio_value: data.portfolio.portfolio_value,
        total_pnl: data.portfolio.total_pnl,
        total_pnl_percent: data.portfolio.total_pnl_percent,
        holdings_count: data.portfolio.holdings_count,
        trades_count: data.portfolio.trades_count,
      });
      await refreshUser(data.user);
      setCapitalMessage({ type: 'success', message: data.message });
      setConfirmReset(false);
    } catch (resetError) {
      setCapitalMessage({ type: 'error', message: resetError.message });
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-50">
        <Navbar />
        <Loading label="Loading your profile..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <h1 className="text-xl font-black tracking-tight text-ink-900 sm:text-2xl">Profile</h1>
        <p className="mt-1 text-xs text-ink-500">
          Practice account details and virtual capital. Everything here is fictional.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          {/* Account details */}
          <section className="bb-card p-5">
            <h2 className="text-base font-bold text-ink-900">Account</h2>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 border-b border-ink-100 pb-2">
                <dt className="text-ink-500">Name</dt>
                <dd className="font-semibold text-ink-900">{profile?.name}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-ink-100 pb-2">
                <dt className="text-ink-500">Email</dt>
                <dd className="break-all font-semibold text-ink-900">{profile?.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-ink-100 pb-2">
                <dt className="text-ink-500">Member since</dt>
                <dd className="font-semibold text-ink-900">{formatDateTime(profile?.created_at)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-500">Portfolio value</dt>
                <dd className="font-semibold text-ink-900">
                  {formatCurrency(summary?.portfolio_value ?? 0)}
                </dd>
              </div>
            </dl>

            <form className="mt-5 border-t border-ink-100 pt-4" onSubmit={handleNameSubmit}>
              <label className="bb-label" htmlFor="profile-name">Display name</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="profile-name"
                  type="text"
                  required
                  minLength={2}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="bb-input"
                />
                <button type="submit" className="bb-btn-primary" disabled={savingName}>
                  <Save className="h-4 w-4" /> {savingName ? 'Saving...' : 'Save'}
                </button>
              </div>

              {nameMessage && (
                <p
                  className={`mt-2 text-xs font-semibold ${
                    nameMessage.type === 'success' ? 'text-bull-600' : 'text-red-600'
                  }`}
                >
                  {nameMessage.message}
                </p>
              )}
            </form>
          </section>

          {/* Practice capital */}
          <section className="bb-card p-5">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-bull-600" />
              <h2 className="text-base font-bold text-ink-900">Practice Capital</h2>
            </div>

            <div className="mt-4 rounded-lg bg-ink-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Current virtual balance
              </p>
              <p className="mt-1 text-2xl font-black tabular-nums text-ink-900">
                {formatCurrency(profile?.virtual_balance ?? 0)}
              </p>
              <p className="mt-1 text-xs text-ink-500">
                {formatNumber(summary?.holdings_count ?? 0, 0)} holding(s) &middot;{' '}
                {formatNumber(summary?.trades_count ?? 0, 0)} trade(s) recorded
              </p>
            </div>

            <form className="mt-4" onSubmit={handleResetCapital}>
              <label className="bb-label" htmlFor="capital">Set new virtual capital (INR)</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="capital"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={capitalInput}
                  onChange={(event) => setCapitalInput(event.target.value)}
                  className="bb-input"
                />
                <button type="submit" className="bb-btn-primary" disabled={resetting || !confirmReset}>
                  <RotateCcw className="h-4 w-4" /> {resetting ? 'Resetting...' : 'Reset'}
                </button>
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs leading-relaxed text-amber-800">
                  <span className="font-bold">Warning:</span> resetting your practice capital clears
                  your current portfolio. All holdings and your entire trade history are deleted and
                  the new amount becomes your virtual cash. New accounts start at{' '}
                  {formatCurrency(DEFAULT_CAPITAL, { decimals: 0 })}.
                </p>
              </div>

              <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-ink-700">
                <input
                  type="checkbox"
                  checked={confirmReset}
                  onChange={(event) => setConfirmReset(event.target.checked)}
                  className="h-4 w-4 rounded border-ink-300"
                />
                I understand my holdings and trade history will be deleted.
              </label>

              {capitalMessage && (
                <p
                  className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${
                    capitalMessage.type === 'success'
                      ? 'bg-bull-50 text-bull-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {capitalMessage.message}
                </p>
              )}
            </form>
          </section>
        </div>

        <section className="mt-6 flex items-start gap-2 rounded-xl border border-ink-200 bg-white p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-ink-500" />
          <p className="text-xs leading-relaxed text-ink-500">
            Big Bull is an educational paper-trading demo. There is no connection to any real stock
            exchange, broker or payment system. All companies, prices and balances are fictional, and
            prices are generated by a local simulation engine rather than real NSE/BSE quotes. No
            money can be deposited, withdrawn or transferred.
          </p>
        </section>
      </main>
    </div>
  );
}
