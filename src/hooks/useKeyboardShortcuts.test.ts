import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { fireEvent } from '@testing-library/react';

describe('useKeyboardShortcuts', () => {
  it('fires the handler for a matching key combo', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ 'ctrl+k': handler }));

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not fire when typing in an input', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ 'ctrl+k': handler }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: 'k', ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('ignores unregistered combos', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ 'ctrl+k': handler }));

    fireEvent.keyDown(window, { key: 'j', ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
  });
});
