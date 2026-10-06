import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ink-50 px-4 text-center">
      <img src="/logo.svg" alt="Big Bull logo" className="h-12 w-12" />
      <p className="mt-6 text-5xl font-black tracking-tight text-ink-900">404</p>
      <h1 className="mt-2 text-lg font-bold text-ink-900">This page is not in the demo market</h1>
      <p className="mt-2 max-w-md text-sm text-ink-500">
        The link you followed does not exist on Big Bull. Everything here is a fictional paper
        trading sandbox.
      </p>
      <Link to="/" className="bb-btn-primary mt-6">
        Back to dashboard
      </Link>
    </div>
  );
}
