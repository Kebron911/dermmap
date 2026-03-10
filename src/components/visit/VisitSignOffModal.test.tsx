import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { VisitSignOffModal } from './VisitSignOffModal';
import { Visit } from '../../types';

const makeMockVisit = (overrides: Partial<Visit> = {}): Visit => ({
  visit_id: 'v-test-1',
  patient_id: 'p-test-1',
  visit_date: '2024-01-15',
  visit_type: 'routine_screening',
  status: 'in_progress',
  chief_complaint: 'Annual skin check',
  lesions: [],
  created_by: 'MA Smith',
  created_at: new Date().toISOString(),
  ma_name: 'MA Smith',
  ...overrides,
});

describe('VisitSignOffModal', () => {
  it('renders modal with visit summary', () => {
    const mockVisit = makeMockVisit({ 
      lesions: [
        { lesion_id: 'l1', photos: ['photo1.jpg'], action: 'biopsy_scheduled' } as any,
        { lesion_id: 'l2', photos: [], action: 'monitor' } as any,
      ],
      ma_name: 'MA Johnson'
    });
    const mockOnClose = vi.fn();
    const mockOnSignOff = vi.fn();

    render(
      <VisitSignOffModal
        visit={mockVisit}
        patientName="Jane Doe"
        onClose={mockOnClose}
        onSignOff={mockOnSignOff}
      />
    );

    expect(screen.getByText('Complete Documentation')).toBeInTheDocument();
    expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/2 lesion/i)).toBeInTheDocument();
    expect(screen.getByText(/MA Johnson/i)).toBeInTheDocument();
  });

  it('displays all status options', () => {
    const mockVisit = makeMockVisit();
    const mockOnClose = vi.fn();
    const mockOnSignOff = vi.fn();

    render(
      <VisitSignOffModal
        visit={mockVisit}
        patientName="Jane Doe"
        onClose={mockOnClose}
        onSignOff={mockOnSignOff}
      />
    );

    expect(screen.getByRole('button', { name: /In Progress/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pending Review/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Signed & Complete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Locked & Finalized/i })).toBeInTheDocument();
  });

  it('allows selecting a status', () => {
    const mockVisit = makeMockVisit();
    const mockOnClose = vi.fn();
    const mockOnSignOff = vi.fn();

    render(
      <VisitSignOffModal
        visit={mockVisit}
        patientName="Jane Doe"
        onClose={mockOnClose}
        onSignOff={mockOnSignOff}
      />
    );

    const pendingButton = screen.getByRole('button', { name: /Pending Review/i });
    fireEvent.click(pendingButton);

    // Check that button has selection indicator
    expect(pendingButton.querySelector('svg')).toBeInTheDocument();
  });

  it('requires provider attestation for signed status', () => {
    const mockVisit = makeMockVisit();
    const mockOnClose = vi.fn();
    const mockOnSignOff = vi.fn();

    render(
      <VisitSignOffModal
        visit={mockVisit}
        patientName="Jane Doe"
        onClose={mockOnClose}
        onSignOff={mockOnSignOff}
      />
    );

    // Select signed status
    const signedButton = screen.getByRole('button', { name: /Signed & Complete/i });
    fireEvent.click(signedButton);

    // Check for attestation textarea
    const attestationField = screen.getByPlaceholderText(/I have reviewed all documented lesions/i);
    expect(attestationField).toBeInTheDocument();
  });

  it('requires provider attestation for locked status', () => {
    const mockVisit = makeMockVisit();
    const mockOnClose = vi.fn();
    const mockOnSignOff = vi.fn();

    render(
      <VisitSignOffModal
        visit={mockVisit}
        patientName="Jane Doe"
        onClose={mockOnClose}
        onSignOff={mockOnSignOff}
      />
    );

    // Select locked status
    const lockedButton = screen.getByRole('button', { name: /Locked & Finalized/i });
    fireEvent.click(lockedButton);

    // Check for attestation textarea
    const attestationField = screen.getByPlaceholderText(/I have reviewed all documented lesions/i);
    expect(attestationField).toBeInTheDocument();
  });

  it('allows entering attestation text', () => {
    const mockVisit = makeMockVisit();
    const mockOnClose = vi.fn();
    const mockOnSignOff = vi.fn();

    render(
      <VisitSignOffModal
        visit={mockVisit}
        patientName="Jane Doe"
        onClose={mockOnClose}
        onSignOff={mockOnSignOff}
      />
    );

    // Select signed status
    const signedButton = screen.getByRole('button', { name: /Signed & Complete/i });
    fireEvent.click(signedButton);

    // Enter attestation text
    const attestationField = screen.getByPlaceholderText(/I have reviewed all documented lesions/i);
    fireEvent.change(attestationField, { target: { value: 'I attest that I have reviewed all documentation' } });

    expect(attestationField).toHaveValue('I attest that I have reviewed all documentation');
  });

  it('disables update button without attestation for signed status', () => {
    const mockVisit = makeMockVisit();
    const mockOnClose = vi.fn();
    const mockOnSignOff = vi.fn();

    render(
      <VisitSignOffModal
        visit={mockVisit}
        patientName="Jane Doe"
        onClose={mockOnClose}
        onSignOff={mockOnSignOff}
      />
    );

    // Select signed status but don't attest
    const signedButton = screen.getByRole('button', { name: /Signed & Complete/i });
    fireEvent.click(signedButton);

    const updateButton = screen.getByRole('button', { name: /Update Status/i });
    expect(updateButton).toBeDisabled();
  });

  it('enables update button with attestation for signed status', () => {
    const mockVisit = makeMockVisit();
    const mockOnClose = vi.fn();
    const mockOnSignOff = vi.fn();

    render(
      <VisitSignOffModal
        visit={mockVisit}
        patientName="Jane Doe"
        onClose={mockOnClose}
        onSignOff={mockOnSignOff}
      />
    );

    // Select signed status and attest
    const signedButton = screen.getByRole('button', { name: /Signed & Complete/i });
    fireEvent.click(signedButton);

    const attestationField = screen.getByPlaceholderText(/I have reviewed all documented lesions/i);
    fireEvent.change(attestationField, { target: { value: 'I attest' } });

    const updateButton = screen.getByRole('button', { name: /Update Status/i });
    expect(updateButton).not.toBeDisabled();
  });

  it('calls onSignOff with status when update is clicked', () => {
    vi.useFakeTimers();
    const mockVisit = makeMockVisit();
    const mockOnClose = vi.fn();
    const mockOnSignOff = vi.fn();

    render(
      <VisitSignOffModal
        visit={mockVisit}
        patientName="Jane Doe"
        onClose={mockOnClose}
        onSignOff={mockOnSignOff}
      />
    );

    // Select pending review (no attestation needed)
    const pendingButton = screen.getByRole('button', { name: /Pending Review/i });
    fireEvent.click(pendingButton);

    // Click update
    const updateButton = screen.getByRole('button', { name: /Update Status/i });
    fireEvent.click(updateButton);

    // Run all timers to trigger the delayed callback
    vi.runAllTimers();
    
    expect(mockOnSignOff).toHaveBeenCalledWith('pending_review');
    
    vi.useRealTimers();
  });

  it('calls onClose when cancel is clicked', () => {
    const mockVisit = makeMockVisit();
    const mockOnClose = vi.fn();
    const mockOnSignOff = vi.fn();

    render(
      <VisitSignOffModal
        visit={mockVisit}
        patientName="Jane Doe"
        onClose={mockOnClose}
        onSignOff={mockOnSignOff}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows warning banner for locked status', () => {
    const mockVisit = makeMockVisit();
    const mockOnClose = vi.fn();
    const mockOnSignOff = vi.fn();

    render(
      <VisitSignOffModal
        visit={mockVisit}
        patientName="Jane Doe"
        onClose={mockOnClose}
        onSignOff={mockOnSignOff}
      />
    );

    // Select locked status
    const lockedButton = screen.getByRole('button', { name: /Locked & Finalized/i });
    fireEvent.click(lockedButton);

    // Check for warning banner
    expect(screen.getByText(/Locking this visit will/i)).toBeInTheDocument();
  });

  it('does not require attestation for pending_review status', () => {
    const mockVisit = makeMockVisit();
    const mockOnClose = vi.fn();
    const mockOnSignOff = vi.fn();

    render(
      <VisitSignOffModal
        visit={mockVisit}
        patientName="Jane Doe"
        onClose={mockOnClose}
        onSignOff={mockOnSignOff}
      />
    );

    // Select pending review
    const pendingButton = screen.getByRole('button', { name: /Pending Review/i });
    fireEvent.click(pendingButton);

    // Update button should be enabled without attestation
    const updateButton = screen.getByRole('button', { name: /Update Status/i });
    expect(updateButton).not.toBeDisabled();
  });

  it('does not require attestation for in_progress status', () => {
    const mockVisit = makeMockVisit();
    const mockOnClose = vi.fn();
    const mockOnSignOff = vi.fn();

    render(
      <VisitSignOffModal
        visit={mockVisit}
        patientName="Jane Doe"
        onClose={mockOnClose}
        onSignOff={mockOnSignOff}
      />
    );

    // Select keep as in progress
    const inProgressButton = screen.getByRole('button', { name: /In Progress/i });
    fireEvent.click(inProgressButton);

    // Update button should be enabled without attestation
    const updateButton = screen.getByRole('button', { name: /Update Status/i });
    expect(updateButton).not.toBeDisabled();
  });
});
