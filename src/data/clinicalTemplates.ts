import { ClinicalNoteTemplate } from '../types';

// Predefined clinical note templates for MAs and Providers
export const CLINICAL_TEMPLATES: ClinicalNoteTemplate[] = [
  // Common templates
  {
    id: 'tmpl-routine-benign',
    name: 'Routine Benign Nevus',
    category: 'common',
    text: 'Benign-appearing compound nevus. Symmetric, regular borders, uniform color. No ABCDE criteria met. Recommend routine monitoring at next annual visit.',
    tags: ['nevus', 'benign', 'routine'],
  },
  {
    id: 'tmpl-seb-keratosis',
    name: 'Seborrheic Keratosis',
    category: 'common',
    text: 'Seborrheic keratosis — well-demarcated waxy/stuck-on appearance. Characteristic horn cysts on dermoscopy. Benign. No intervention required unless symptomatic.',
    tags: ['sk', 'keratosis', 'benign'],
  },
  {
    id: 'tmpl-actinic-keratosis',
    name: 'Actinic Keratosis',
    category: 'common',
    text: 'Actinic keratosis — rough, scaly patch on sun-exposed skin. Consider cryotherapy or topical treatment. Patient counseled on sun protection.',
    tags: ['ak', 'actinic', 'precancer'],
  },
  {
    id: 'tmpl-dermatofibroma',
    name: 'Dermatofibroma',
    category: 'common',
    text: 'Dermatofibroma — firm papule demonstrating positive dimple sign. Central white network on dermoscopy. Benign. Monitor for changes.',
    tags: ['df', 'dermatofibroma', 'benign'],
  },
  {
    id: 'tmpl-solar-lentigo',
    name: 'Solar Lentigo',
    category: 'common',
    text: 'Solar lentigo — flat, uniformly pigmented macule on sun-exposed area. Sharp borders, moth-eaten edge pattern on dermoscopy. Benign. No treatment required.',
    tags: ['lentigo', 'solar', 'benign'],
  },

  // Biopsy templates
  {
    id: 'tmpl-atypical-biopsy',
    name: 'Atypical Nevus — Biopsy',
    category: 'biopsy',
    text: 'Atypical nevus meeting ABCDE criteria. Asymmetry and irregular borders noted. Dermoscopy shows atypical pigment network with regression structures. Shave biopsy performed. Specimen sent to pathology.',
    tags: ['atypical', 'biopsy', 'abcde'],
  },
  {
    id: 'tmpl-suspicious-melanoma',
    name: 'Suspicious for Melanoma',
    category: 'biopsy',
    text: 'Highly suspicious pigmented lesion. ABCDE criteria: A+ B+ C+ D+ E+. Dermoscopy reveals atypical network, blue-white veil, and irregular dots/globules. Excisional biopsy performed with 2mm margin. URGENT pathology requested. Patient counseled on timeline and follow-up.',
    tags: ['melanoma', 'suspicious', 'urgent', 'biopsy'],
  },
  {
    id: 'tmpl-bcc-suspected',
    name: 'BCC Suspected',
    category: 'biopsy',
    text: 'Pearly papule with central ulceration and telangiectasia. Dermoscopy: arborizing vessels, leaf-like structures. Suspect basal cell carcinoma. Shave biopsy performed. Pending pathology confirmation for treatment planning.',
    tags: ['bcc', 'basal cell', 'biopsy'],
  },
  {
    id: 'tmpl-scc-suspected',
    name: 'SCC Suspected',
    category: 'biopsy',
    text: 'Scaly, erythematous plaque with induration. Dermoscopy: white structureless areas, glomerular/coiled vessels. Suspect squamous cell carcinoma. Shave biopsy performed. Await pathology for staging and treatment.',
    tags: ['scc', 'squamous', 'biopsy'],
  },

  // Follow-up templates
  {
    id: 'tmpl-followup-stable',
    name: 'Follow-Up — Stable',
    category: 'follow_up',
    text: 'Follow-up of previously documented lesion. No significant change in size, shape, or color compared to prior visit. Continue routine monitoring. Next follow-up in 6 months.',
    tags: ['follow-up', 'stable', 'monitoring'],
  },
  {
    id: 'tmpl-followup-changed',
    name: 'Follow-Up — Changed',
    category: 'follow_up',
    text: 'Follow-up of previously documented lesion. Notable changes since prior visit: [SIZE/COLOR/BORDER]. Increased from __mm to __mm. New dermoscopic features identified. Recommend biopsy for histopathologic evaluation.',
    tags: ['follow-up', 'changed', 'evolving'],
  },
  {
    id: 'tmpl-post-excision',
    name: 'Post-Excision Follow-Up',
    category: 'follow_up',
    text: 'Post-excision follow-up. Surgical site well-healed with minimal scarring. No evidence of recurrence. Pathology margins were clear. Continue monitoring per NCCN guidelines. Next follow-up per protocol.',
    tags: ['excision', 'follow-up', 'post-op'],
  },

  // Screening templates
  {
    id: 'tmpl-total-body',
    name: 'Total Body Skin Exam',
    category: 'screening',
    text: 'Total body skin examination performed. All accessible skin surfaces examined. [NUMBER] lesions documented and mapped. No lesions meeting ABCDE criteria for immediate concern. Baseline photos obtained for future comparison.',
    tags: ['tbse', 'screening', 'total body'],
  },
  {
    id: 'tmpl-high-risk-screen',
    name: 'High-Risk Screening',
    category: 'screening',
    text: 'High-risk patient screening. Risk factors: [HISTORY/FAMILY/SKIN TYPE]. Complete mole mapping performed with dermoscopic images. [NUMBER] lesions flagged for close monitoring. Recommend 3-month follow-up interval. Patient counseled on self-exam (ABCDE rule) and sun protection.',
    tags: ['high-risk', 'screening', 'mole mapping'],
  },
  {
    id: 'tmpl-sun-counseling',
    name: 'Sun Protection Counseling',
    category: 'screening',
    text: 'Patient counseled on UV protection measures: broad-spectrum SPF 30+ sunscreen daily, protective clothing, avoid peak UV hours (10am-4pm). Discussed skin self-examination technique using ABCDE criteria. Written educational materials provided.',
    tags: ['counseling', 'sun', 'education'],
  },
];

export function getTemplatesByCategory(category?: string): ClinicalNoteTemplate[] {
  if (!category) return CLINICAL_TEMPLATES;
  return CLINICAL_TEMPLATES.filter(t => t.category === category);
}

export function searchTemplates(query: string): ClinicalNoteTemplate[] {
  const q = query.toLowerCase();
  return CLINICAL_TEMPLATES.filter(
    t =>
      t.name.toLowerCase().includes(q) ||
      t.text.toLowerCase().includes(q) ||
      t.tags.some((tag: string) => tag.includes(q)),
  );
}
