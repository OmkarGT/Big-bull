import { Loader2 } from 'lucide-react';

/** Full-page spinner used while a page loads its data. */
export default function Loading({ label = 'Loading simulated market...', fullScreen = true }) {
  const wrapper = fullScreen
    ? 'min-h-[60vh] w-full flex flex-col items-center justify-center gap-3 text-ink-500'
    : 'w-full flex flex-col items-center justify-center gap-3 py-10 text-ink-500';

  return (
    <div className={wrapper} role="status" aria-live="polite">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
