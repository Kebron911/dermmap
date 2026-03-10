import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Sidebar } from './Sidebar';
import { useAppStore } from '../../store/appStore';
import { SYNTHETIC_PATIENTS } from '../../data/syntheticData';

const mockStatus = vi.fn();

vi.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => mockStatus(),
}));

const seedPatients = () => structuredClone(SYNTHETIC_PATIENTS);

const resetStore = () => {
  useAppStore.setState(
    {
      ...useAppStore.getState(),
      patients: seedPatients(),
      currentUser: null,
      selectedPatient: null,
      currentVisit: null,
      selectedLesion: null,
      pendingLesion: null,
      currentPage: 'login',
      docStartTime: null,
    },
    true
  );
};

describe('Sidebar', () => {
  beforeEach(() => {
    mockStatus.mockReturnValue({ isOnline: true, wasOffline: false, pendingSyncCount: 0 });
    resetStore();
  });

  it('renders role-specific navigation and user info', () => {
    useAppStore.setState({
      currentUser: {
        id: 'ma-100',
        name: 'Jamie Doe',
        role: 'ma',
        email: 'jamie@example.com',
      },
      token: 'test-token',
    });

    render(<Sidebar />);

    expect(screen.getByText('Jamie Doe')).toBeInTheDocument();
    expect(screen.getByText('Medical Assistant')).toBeInTheDocument();
    expect(screen.getByText("Today's Schedule")).toBeInTheDocument();
    expect(screen.getByText('Patient Search')).toBeInTheDocument();
    expect(screen.queryByText('Analytics')).not.toBeInTheDocument();
  });

  it('updates the active page and supports logout', async () => {
    const user = userEvent.setup();

    useAppStore.setState({
      currentUser: {
        id: 'ma-100',
        name: 'Jamie Doe',
        role: 'ma',
        email: 'jamie@example.com',
      },
      token: 'test-token',
    });

    render(<Sidebar />);

    await user.click(screen.getByRole('button', { name: 'Patient Search' }));
    expect(useAppStore.getState().currentPage).toBe('search');

    await user.click(screen.getByRole('button', { name: 'Sign Out' }));
    expect(useAppStore.getState().currentUser).toBeNull();
  });
});
