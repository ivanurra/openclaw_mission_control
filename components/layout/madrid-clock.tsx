'use client';

import { useEffect, useMemo, useState } from 'react';

const MADRID_TIMEZONE = 'Europe/Madrid';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  timeZone: MADRID_TIMEZONE,
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: MADRID_TIMEZONE,
});

export function MadridClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  const dateLabel = useMemo(() => (now ? dateFormatter.format(now) : ''), [now]);
  const timeLabel = useMemo(() => (now ? timeFormatter.format(now) : ''), [now]);

  return (
    <div
      aria-label="Current date and time"
      className="flex items-center gap-2 rounded-xl border border-[var(--border-default)] px-3 py-1.5 shadow-sm"
      style={{
        background: 'linear-gradient(120deg, rgba(99,102,241,0.16), rgba(26,26,26,0.95))',
      }}
    >
      <time
        dateTime={now ? now.toISOString() : ''}
        className="text-xs font-semibold text-[var(--text-primary)]"
        data-testid="madrid-clock-date"
      >
        {dateLabel}
      </time>
      <span aria-hidden className="h-1 w-1 rounded-full bg-[var(--accent-primary)]/80" />
      <time
        dateTime={now ? now.toISOString() : ''}
        className="font-mono text-xs font-semibold tabular-nums tracking-[0.08em] text-[var(--text-primary)]"
        data-testid="madrid-clock-time"
      >
        {timeLabel}
      </time>
    </div>
  );
}
