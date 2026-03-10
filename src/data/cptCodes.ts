import { CPTCode } from '../types';

// ---------------------------------------------------------------------------
// Common dermatology CPT codes
// ---------------------------------------------------------------------------
export const CPT_CODES: CPTCode[] = [
  // Evaluation & Management
  { code: '99213', description: 'Office visit, established patient (low complexity)', category: 'evaluation', fee_estimate: 110 },
  { code: '99214', description: 'Office visit, established patient (moderate complexity)', category: 'evaluation', fee_estimate: 165 },
  { code: '99215', description: 'Office visit, established patient (high complexity)', category: 'evaluation', fee_estimate: 225 },
  { code: '99203', description: 'Office visit, new patient (low complexity)', category: 'evaluation', fee_estimate: 135 },
  { code: '99204', description: 'Office visit, new patient (moderate complexity)', category: 'evaluation', fee_estimate: 210 },
  { code: '99205', description: 'Office visit, new patient (high complexity)', category: 'evaluation', fee_estimate: 290 },

  // Biopsy
  { code: '11102', description: 'Tangential biopsy (shave), first lesion', category: 'biopsy', fee_estimate: 175 },
  { code: '11103', description: 'Tangential biopsy (shave), each additional lesion', category: 'biopsy', fee_estimate: 95 },
  { code: '11104', description: 'Punch biopsy, first lesion', category: 'biopsy', fee_estimate: 200 },
  { code: '11105', description: 'Punch biopsy, each additional lesion', category: 'biopsy', fee_estimate: 110 },
  { code: '11106', description: 'Incisional biopsy, first lesion', category: 'biopsy', fee_estimate: 230 },
  { code: '11107', description: 'Incisional biopsy, each additional lesion', category: 'biopsy', fee_estimate: 125 },

  // Excision – Benign
  { code: '11400', description: 'Excision benign lesion, trunk/extremity: ≤0.5cm', category: 'excision', fee_estimate: 260 },
  { code: '11401', description: 'Excision benign lesion, trunk/extremity: 0.6-1.0cm', category: 'excision', fee_estimate: 310 },
  { code: '11402', description: 'Excision benign lesion, trunk/extremity: 1.1-2.0cm', category: 'excision', fee_estimate: 370 },
  { code: '11420', description: 'Excision benign lesion, scalp/neck/hands/feet: ≤0.5cm', category: 'excision', fee_estimate: 280 },
  { code: '11440', description: 'Excision benign lesion, face: ≤0.5cm', category: 'excision', fee_estimate: 300 },

  // Excision – Malignant
  { code: '11600', description: 'Excision malignant lesion, trunk/extremity: ≤0.5cm', category: 'excision', fee_estimate: 320 },
  { code: '11601', description: 'Excision malignant lesion, trunk/extremity: 0.6-1.0cm', category: 'excision', fee_estimate: 400 },
  { code: '11602', description: 'Excision malignant lesion, trunk/extremity: 1.1-2.0cm', category: 'excision', fee_estimate: 480 },
  { code: '11620', description: 'Excision malignant lesion, scalp/neck/hands/feet: ≤0.5cm', category: 'excision', fee_estimate: 350 },
  { code: '11640', description: 'Excision malignant lesion, face: ≤0.5cm', category: 'excision', fee_estimate: 370 },

  // Destruction
  { code: '17000', description: 'Destruction premalignant lesion, first', category: 'destruction', fee_estimate: 95 },
  { code: '17003', description: 'Destruction premalignant lesions, 2-14 (each)', category: 'destruction', fee_estimate: 30 },
  { code: '17110', description: 'Destruction benign lesions, up to 14', category: 'destruction', fee_estimate: 130 },
  { code: '17111', description: 'Destruction benign lesions, 15 or more', category: 'destruction', fee_estimate: 180 },

  // Repair
  { code: '12001', description: 'Simple repair, ≤2.5cm (scalp/trunk/extremity)', category: 'repair', fee_estimate: 250 },
  { code: '12011', description: 'Simple repair, ≤2.5cm (face/ears/eyelids)', category: 'repair', fee_estimate: 275 },
  { code: '12031', description: 'Intermediate repair, ≤2.5cm (scalp/trunk)', category: 'repair', fee_estimate: 350 },
  { code: '12051', description: 'Intermediate repair, ≤2.5cm (face)', category: 'repair', fee_estimate: 400 },

  // Pathology
  { code: '88305', description: 'Surgical pathology, gross & microscopic (skin biopsy)', category: 'pathology', fee_estimate: 150 },
  { code: '88312', description: 'Special stains (immunohistochemistry)', category: 'pathology', fee_estimate: 180 },

  // Photography / Dermatoscopy
  { code: '96931', description: 'Reflectance confocal microscopy, first lesion', category: 'photo', fee_estimate: 200 },
  { code: '96936', description: 'Total body photography', category: 'photo', fee_estimate: 150 },
];

// Helpers
export function getCPTByCode(code: string): CPTCode | undefined {
  return CPT_CODES.find(c => c.code === code);
}

export function getCPTByCategory(category: CPTCode['category']): CPTCode[] {
  return CPT_CODES.filter(c => c.category === category);
}

export function estimateVisitRevenue(codes: string[]): number {
  return codes.reduce((sum, code) => {
    const cpt = getCPTByCode(code);
    return sum + (cpt?.fee_estimate || 0);
  }, 0);
}

// Auto-suggest CPT codes based on lesion data
export function suggestCPTCodes(lesion: {
  action: string;
  biopsy_result: string;
  size_mm: number | null;
  body_region: string;
  photos: { capture_type: string }[];
}): string[] {
  const suggestions: string[] = [];

  // E&M code — moderate complexity
  suggestions.push('99214');

  // Biopsy codes
  if (lesion.action === 'biopsy_performed' || lesion.action === 'biopsy_scheduled') {
    suggestions.push('11102'); // shave biopsy, first
    suggestions.push('88305'); // pathology
  }

  // Excision
  if (lesion.action === 'excision') {
    if (lesion.biopsy_result === 'malignant') {
      if (lesion.size_mm !== null && lesion.size_mm <= 5) suggestions.push('11600');
      else if (lesion.size_mm !== null && lesion.size_mm <= 10) suggestions.push('11601');
      else suggestions.push('11602');
    } else {
      if (lesion.size_mm !== null && lesion.size_mm <= 5) suggestions.push('11400');
      else if (lesion.size_mm !== null && lesion.size_mm <= 10) suggestions.push('11401');
      else suggestions.push('11402');
    }
    suggestions.push('12001'); // simple repair
    suggestions.push('88305'); // pathology
  }

  // Photography
  if (lesion.photos.some(p => p.capture_type === 'dermoscopic')) {
    suggestions.push('96931');
  }

  return [...new Set(suggestions)]; // deduplicate
}
