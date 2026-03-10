import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BiopsyResultModal } from './BiopsyResultModal';
import { Lesion } from '../../types';

const makeMockLesion = (overrides: Partial<Lesion> = {}): Lesion => ({
  lesion_id: 'l-test-1',
  body_location_x: 100,
  body_location_y: 120,
  body_region: 'chest',
  body_view: 'anterior',
  size_mm: 4,
  shape: 'round',
  color: 'brown',
  border: 'regular',
  symmetry: 'symmetric',
  action: 'biopsy_scheduled',
  clinical_notes: 'Suspicious lesion',
  biopsy_result: 'pending',
  pathology_notes: '',
  created_at: new Date().toISOString(),
  created_by: 'Dr. Test',
  photos: [],
  ...overrides,
});

describe('BiopsyResultModal', () => {
  it('renders modal with lesion information', () => {
    const mockLesion = makeMockLesion({ body_region: 'left_arm', size_mm: 5 });
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();

    render(
      <BiopsyResultModal
        lesion={mockLesion}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Biopsy Results')).toBeInTheDocument();
    expect(screen.getByText(/Update Pathology/i)).toBeInTheDocument();
  });

  it('displays all biopsy result options', () => {
    const mockLesion = makeMockLesion();
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();

    render(
      <BiopsyResultModal
        lesion={mockLesion}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Benign')).toBeInTheDocument();
    expect(screen.getByText('Atypical')).toBeInTheDocument();
    expect(screen.getByText('Malignant')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Not Applicable')).toBeInTheDocument();
  });

  it('allows selecting a biopsy result', () => {
    const mockLesion = makeMockLesion({ biopsy_result: 'pending' });
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();

    render(
      <BiopsyResultModal
        lesion={mockLesion}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const benignButton = screen.getByRole('button', { name: /Benign/i });
    fireEvent.click(benignButton);

    // Check that the button is visually selected (has checkmark icon)
    expect(benignButton.querySelector('svg')).toBeInTheDocument();
  });

  it('allows entering pathology notes', () => {
    const mockLesion = makeMockLesion();
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();

    render(
      <BiopsyResultModal
        lesion={mockLesion}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const notesTextarea = screen.getByPlaceholderText(/Enter pathology report details/i);
    fireEvent.change(notesTextarea, { target: { value: 'Melanoma in situ, margins clear' } });

    expect(notesTextarea).toHaveValue('Melanoma in situ, margins clear');
  });

  it('calls onSave with result and notes when saved', () => {
    vi.useFakeTimers();
    const mockLesion = makeMockLesion({ biopsy_result: 'pending' });
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();

    render(
      <BiopsyResultModal
        lesion={mockLesion}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Select malignant
    const malignantButton = screen.getByRole('button', { name: /Malignant/i });
    fireEvent.click(malignantButton);

    // Enter pathology notes
    const notesTextarea = screen.getByPlaceholderText(/Enter pathology report details/i);
    fireEvent.change(notesTextarea, { target: { value: 'Melanoma confirmed' } });

    // Click save
    const saveButton = screen.getByRole('button', { name: /Save Results/i });
    fireEvent.click(saveButton);

    // Run all timers to trigger the delayed callback
    vi.runAllTimers();
    
    expect(mockOnSave).toHaveBeenCalledWith('malignant', 'Melanoma confirmed');
    
    vi.useRealTimers();
  });

  it('calls onClose when cancel is clicked', () => {
    const mockLesion = makeMockLesion();
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();

    render(
      <BiopsyResultModal
        lesion={mockLesion}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('displays current lesion clinical notes if present', () => {
    const mockLesion = makeMockLesion({ 
      clinical_notes: 'Atypical appearance with irregular borders' 
    });
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();

    render(
      <BiopsyResultModal
        lesion={mockLesion}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText(/Atypical appearance with irregular borders/i)).toBeInTheDocument();
  });

  it('pre-fills with existing biopsy result and pathology notes', () => {
    const mockLesion = makeMockLesion({ 
      biopsy_result: 'atypical',
      pathology_notes: 'Dysplastic nevus, recommend monitoring'
    });
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();

    render(
      <BiopsyResultModal
        lesion={mockLesion}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const notesTextarea = screen.getByPlaceholderText(/Enter pathology report details/i);
    expect(notesTextarea).toHaveValue('Dysplastic nevus, recommend monitoring');
  });
});
