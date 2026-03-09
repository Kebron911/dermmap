import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useNetworkStatus } from './useNetworkStatus';

describe('useNetworkStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts online with no pending sync', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
    expect(result.current.pendingSyncCount).toBe(0);
  });

  it('handles offline to online sync flow', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      window.dispatchEvent(new Event('offline'));
    });

    await act(async () => {});

    expect(result.current.isOnline).toBe(false);
    expect(result.current.pendingSyncCount).toBe(2);

    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.wasOffline).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await act(async () => {});

    expect(result.current.pendingSyncCount).toBe(0);
    expect(result.current.wasOffline).toBe(false);
  });
});
