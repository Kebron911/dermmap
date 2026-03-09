import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { BodyMapView } from './BodyMapView';
import { Visit } from '../../types';

const visits: Visit[] = [
  {
    visit_id: 'v-1',
    visit_date: '2024-01-15',
    provider_id: 'dr-1',
    provider_name: 'Dr. Lee',
    ma_id: 'ma-1',
    ma_name: 'Alex',
    status: 'locked',
    created_at: '2024-01-15T09:00:00Z',
    lesions: [
      {
        lesion_id: 'l-1',
        body_location_x: 80,
        body_location_y: 100,
        body_region: 'chest',
        body_view: 'anterior',
        size_mm: 4,
        shape: 'round',
        color: 'brown',
        border: 'regular',
        symmetry: 'symmetric',
        action: 'monitor',
        clinical_notes: 'Baseline lesion',
        biopsy_result: 'na',
        pathology_notes: '',
        created_at: '2024-01-15T09:10:00Z',
        created_by: 'Alex',
        photos: [],
      },
    ],
  },
  {
    visit_id: 'v-2',
    visit_date: '2024-07-22',
    provider_id: 'dr-1',
    provider_name: 'Dr. Lee',
    ma_id: 'ma-1',
    ma_name: 'Alex',
    status: 'locked',
    created_at: '2024-07-22T10:00:00Z',
    lesions: [
      {
        lesion_id: 'l-2',
        body_location_x: 120,
        body_location_y: 160,
        body_region: 'abdomen',
        body_view: 'anterior',
        size_mm: 2,
        shape: 'oval',
        color: 'tan',
        border: 'regular',
        symmetry: 'symmetric',
        action: 'monitor',
        clinical_notes: 'Follow-up lesion',
        biopsy_result: 'na',
        pathology_notes: '',
        created_at: '2024-07-22T10:10:00Z',
        created_by: 'Alex',
        photos: [],
      },
    ],
  },
];

describe('BodyMapView', () => {
  it('shows the active view label and lesion count', () => {
    render(<BodyMapView visits={visits} />);

    // Check the button is present and active
    expect(screen.getByRole('button', { name: 'Front' })).toHaveClass('bg-white');
    expect(screen.getByText('2 lesions')).toBeInTheDocument();
  });

  it('toggles between front and back views', async () => {
    const user = userEvent.setup();
    render(<BodyMapView visits={visits} />);

    // Should start with Front active
    expect(screen.getByRole('button', { name: 'Front' })).toHaveClass('bg-white');
    
    // Click Back button
    await user.click(screen.getByRole('button', { name: 'Back' }));
    
    // Back should now be active
    expect(screen.getByRole('button', { name: 'Back' })).toHaveClass('bg-white');
  });

  it('exposes placing mode hint when interactive', async () => {
    const user = userEvent.setup();
    render(<BodyMapView visits={visits} interactive />);

    await user.click(screen.getByRole('button', { name: 'Add Lesion' }));

    expect(screen.getByText('Tap the body to place lesion marker')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tap body to place/i })).toBeInTheDocument();
  });
});
