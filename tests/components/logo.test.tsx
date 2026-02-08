import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Logo } from '../../components/layout/logo';

describe('Logo', () => {
  it('renders the brand text by default', () => {
    render(<Logo />);
    expect(screen.getByText('Mission Control')).toBeInTheDocument();
  });

  it('can hide the brand text', () => {
    render(<Logo showText={false} />);
    expect(screen.queryByText('Mission Control')).not.toBeInTheDocument();
  });
});
