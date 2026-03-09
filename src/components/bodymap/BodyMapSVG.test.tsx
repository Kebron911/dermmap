import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BodyMapSVG, getLesionColor, getLesionLabel } from './BodyMapSVG';
import { Lesion } from '../../types';

const makeLesion = (overrides: Partial<Lesion> = {}): Lesion => ({
  lesion_id: 'l-1',
  body_location_x: 90,
  body_location_y: 120,
  body_region: 'chest',
  body_view: 'anterior',
  size_mm: 5,
  shape: 'oval',
  color: 'brown',
  border: 'regular',
  symmetry: 'symmetric',
  action: 'monitor',
  clinical_notes: 'Baseline',
  biopsy_result: 'na',
  pathology_notes: '',
  created_at: new Date().toISOString(),
  created_by: 'tester',
  photos: [],
  ...overrides,
});

describe('BodyMapSVG helpers', () => {
  it('returns the expected lesion color', () => {
    expect(getLesionColor(makeLesion({ biopsy_result: 'malignant' }))).toBe('#EF4444');
    expect(getLesionColor(makeLesion({ biopsy_result: 'atypical' }))).toBe('#F59E0B');
    expect(getLesionColor(makeLesion({ action: 'excision' }))).toBe('#10B981');
    expect(getLesionColor(makeLesion({ biopsy_result: 'pending' }))).toBe('#8B5CF6');
    expect(getLesionColor(makeLesion({ isNew: true }))).toBe('#3B82F6');
  });

  it('returns the expected lesion label', () => {
    expect(getLesionLabel(makeLesion({ biopsy_result: 'malignant' }))).toBe('Malignant');
    expect(getLesionLabel(makeLesion({ biopsy_result: 'atypical' }))).toBe('Atypical');
    expect(getLesionLabel(makeLesion({ action: 'excision' }))).toBe('Excised');
    expect(getLesionLabel(makeLesion({ biopsy_result: 'pending' }))).toBe('Biopsy Pending');
    expect(getLesionLabel(makeLesion({ action: 'biopsy_scheduled' }))).toBe('Biopsy Scheduled');
    expect(getLesionLabel(makeLesion({ isNew: true }))).toBe('New');
  });
});

describe('BodyMapSVG', () => {
  it('renders marker styling for new lesions', () => {
    const lesion = makeLesion({ lesion_id: 'l-new', isNew: true });
    const { container } = render(
      <BodyMapSVG view="anterior" lesions={[lesion]} />
    );

    const pulseMarker = container.querySelector('circle.marker-pulse');
    expect(pulseMarker).not.toBeNull();
  });

  it('invokes body click callbacks and shows hover tooltips when interactive', () => {
    const onBodyClick = vi.fn();
    const lesion = makeLesion({ lesion_id: 'l-new', isNew: true });
    const { container } = render(
      <BodyMapSVG view="anterior" lesions={[lesion]} interactive onBodyClick={onBodyClick} />
    );

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();

    const rect = {
      width: 200,
      height: 510,
      left: 0,
      top: 0,
      right: 200,
      bottom: 510,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;

    if (svg) {
      svg.getBoundingClientRect = () => rect;
    }

    const svgElementProto = (window as typeof window & { SVGElement?: typeof SVGElement }).SVGElement?.prototype;
    if (svgElementProto && !('isPointInFill' in svgElementProto)) {
      Object.defineProperty(svgElementProto, 'isPointInFill', {
        value: () => true,
        configurable: true,
      });
    }

    const svgPathProto = (window as typeof window & { SVGPathElement?: typeof SVGPathElement }).SVGPathElement?.prototype;
    if (svgPathProto && !('isPointInFill' in svgPathProto)) {
      Object.defineProperty(svgPathProto, 'isPointInFill', {
        value: () => true,
        configurable: true,
      });
    }

    if (!('DOMPoint' in window)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).DOMPoint = class DOMPoint {
        x: number; y: number; z: number; w: number;
        constructor(x = 0, y = 0, z = 0, w = 1) { this.x = x; this.y = y; this.z = z; this.w = w; }
        toJSON() { return { x: this.x, y: this.y, z: this.z, w: this.w }; }
      };
    }

    if (svg) {
      fireEvent.click(svg, { clientX: 50, clientY: 50 });
    }

    expect(onBodyClick).toHaveBeenCalled();

    const hitArea = container.querySelector('path[stroke="transparent"]');
    if (hitArea) {
      fireEvent.mouseEnter(hitArea, { clientX: 60, clientY: 60 });
    }

    expect(screen.getByText('Scalp')).toBeInTheDocument();
  });
});
