import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OfflineBanner, OfflineStatusDot } from './OfflineBanner';

const mockStatus = vi.fn();

vi.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => mockStatus(),
}));

describe('OfflineBanner', () => {
  beforeEach(() => {
    mockStatus.mockReset();
  });

  it('renders nothing when online with no offline history', () => {
    mockStatus.mockReturnValue({ isOnline: true, wasOffline: false, pendingSyncCount: 0 });
    const { container } = render(<OfflineBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the syncing banner when returning online', () => {
    mockStatus.mockReturnValue({ isOnline: true, wasOffline: true, pendingSyncCount: 1 });
    render(<OfflineBanner />);

    expect(screen.getByText('Back online — syncing data')).toBeInTheDocument();
  });

  it('renders offline messaging and pending sync count', () => {
    mockStatus.mockReturnValue({ isOnline: false, wasOffline: false, pendingSyncCount: 2 });
    render(<OfflineBanner />);

    expect(screen.getByText('Offline Mode Active')).toBeInTheDocument();
    expect(screen.getByText('2 visits pending sync')).toBeInTheDocument();
  });
});

describe('OfflineStatusDot', () => {
  it('shows online state copy', () => {
    mockStatus.mockReturnValue({ isOnline: true, wasOffline: false, pendingSyncCount: 0 });
    render(<OfflineStatusDot />);

    expect(screen.getByText('Online · Encrypted sync')).toBeInTheDocument();
  });

  it('shows offline count badge', () => {
    mockStatus.mockReturnValue({ isOnline: false, wasOffline: false, pendingSyncCount: 3 });
    render(<OfflineStatusDot />);

    expect(screen.getByText('Offline mode')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
