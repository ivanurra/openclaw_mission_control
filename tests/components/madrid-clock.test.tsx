import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MadridClock } from '../../components/layout/madrid-clock';

describe('MadridClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-07T10:15:30.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders only the current date in English format', () => {
    render(<MadridClock />);

    expect(screen.getByLabelText('Current date')).toBeInTheDocument();
    expect(screen.queryByText('Madrid')).not.toBeInTheDocument();

    const dateLabel = screen.getByTestId('madrid-clock-date');
    expect(dateLabel.textContent).toMatch(/Saturday,\s*07 February/i);
  });
});
