'use client';

import { useEffect, useMemo, useState } from 'react';

const MADRID_TIMEZONE = 'Europe/Madrid';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  timeZone: MADRID_TIMEZONE,
});

export function MadridClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const dateLabel = useMemo(() => (now ? dateFormatter.format(now) : ''), [now]);

  return (
    <div
      aria-label="Current date"
      className="hidden md:flex items-center rounded-xl border border-[var(--border-default)] px-3 py-1.5 shadow-sm"
      style={{
        background: 'linear-gradient(120deg, rgba(99,102,241,0.14), rgba(26,26,26,0.95))',
      }}
    >
      <time
        dateTime={now ? now.toISOString() : ''}
        className="text-xs font-semibold text-[var(--text-primary)]"
        data-testid="madrid-clock-date"
      >
        {dateLabel}
      </time>
    </div>
  );
}
