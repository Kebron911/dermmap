import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { AppShell } from './AppShell';

vi.mock('./Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar" />, 
}));

vi.mock('./OfflineBanner', () => ({
  OfflineBanner: () => <div data-testid="offline-banner" />,
}));

describe('AppShell', () => {
  it('renders children and global shell elements', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div>Shell Content</div>
        </AppShell>
      </MemoryRouter>
    );

    expect(screen.getByText('DEMO — SYNTHETIC DATA — NOT FOR CLINICAL USE')).toBeInTheDocument();
    expect(screen.getByText('Shell Content')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
  });
});
