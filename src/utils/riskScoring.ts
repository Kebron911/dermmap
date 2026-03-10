import { Lesion, LesionChange, RiskScore, DermoscopyFeature } from '../types';

// ---------------------------------------------------------------------------
// ABCDE Risk Scoring Algorithm
// Scores each criterion 0–2. Total 0–10.
// ---------------------------------------------------------------------------
export function calculateRiskScore(
  lesion: Lesion,
  priorLesion?: Lesion | null,
): RiskScore {
  let asymmetry = 0;
  let border = 0;
  let color = 0;
  let diameter = 0;
  let evolution = 0;

  // A – Asymmetry
  if (lesion.symmetry === 'asymmetric') asymmetry = 2;
  else if (lesion.symmetry === 'not_assessed') asymmetry = 1;

  // B – Border
  if (lesion.border === 'irregular') border = 2;
  else if (lesion.border === 'not_assessed') border = 1;

  // C – Color (multicolored is highest risk)
  const highRiskColors: string[] = ['multicolored', 'black'];
  const medRiskColors: string[] = ['dark_brown', 'red'];
  if (lesion.color && highRiskColors.includes(lesion.color)) color = 2;
  else if (lesion.color && medRiskColors.includes(lesion.color)) color = 1;

  // D – Diameter (>6mm is classic threshold)
  if (lesion.size_mm !== null) {
    if (lesion.size_mm >= 6) diameter = 2;
    else if (lesion.size_mm >= 4) diameter = 1;
  }

  // E – Evolution (compare to prior visit)
  if (priorLesion) {
    let evolutionPoints = 0;
    if (priorLesion.size_mm !== null && lesion.size_mm !== null) {
      const delta = lesion.size_mm - priorLesion.size_mm;
      if (delta >= 2) evolutionPoints += 2;
      else if (delta >= 1) evolutionPoints += 1;
    }
    if (priorLesion.color !== lesion.color) evolutionPoints += 1;
    if (priorLesion.border !== lesion.border) evolutionPoints += 1;
    evolution = Math.min(2, evolutionPoints);
  } else if (lesion.isNew) {
    evolution = 1; // new lesion without baseline gets partial score
  }

  // Add weight from dermoscopy features
  const dermFeatures = lesion.dermoscopy_features || [];
  const highConcern: DermoscopyFeature[] = ['blue_white_veil', 'atypical_network', 'regression_structures', 'streaks'];
  const featureBonus = dermFeatures.filter(f => highConcern.includes(f)).length;

  const total = Math.min(10, asymmetry + border + color + diameter + evolution + Math.min(2, featureBonus));

  let level: RiskScore['level'];
  let recommendation: string;
  if (total <= 2) {
    level = 'low';
    recommendation = 'Routine monitoring. Recheck at next annual visit.';
  } else if (total <= 4) {
    level = 'moderate';
    recommendation = 'Close monitoring recommended. Follow up in 3-6 months with dermoscopic comparison.';
  } else if (total <= 7) {
    level = 'high';
    recommendation = 'Biopsy recommended. Multiple ABCDE criteria met.';
  } else {
    level = 'very_high';
    recommendation = 'URGENT: Excisional biopsy recommended. High suspicion for melanoma. Refer to dermatologic surgery.';
  }

  return { total, asymmetry, border, color, diameter, evolution, level, recommendation };
}

// ---------------------------------------------------------------------------
// Change Detection — compare a lesion across two visits
// ---------------------------------------------------------------------------
export function detectChanges(
  current: Lesion,
  prior: Lesion,
  currentVisitId: string,
  priorVisitId: string,
): LesionChange {
  const sizeDelta =
    current.size_mm !== null && prior.size_mm !== null
      ? current.size_mm - prior.size_mm
      : null;

  const colorChanged = current.color !== prior.color;
  const borderChanged = current.border !== prior.border;
  const symmetryChanged = current.symmetry !== prior.symmetry;

  const currentFeatures = current.dermoscopy_features || [];
  const priorFeatures = prior.dermoscopy_features || [];
  const newFeatures = currentFeatures.filter(f => !priorFeatures.includes(f));

  // Determine overall concern level
  let concern: LesionChange['overall_concern'] = 'none';
  let summaryParts: string[] = [];

  if (sizeDelta !== null && sizeDelta > 0) {
    summaryParts.push(`Size increased ${sizeDelta}mm (${prior.size_mm}→${current.size_mm}mm)`);
  }
  if (colorChanged) summaryParts.push(`Color changed (${prior.color}→${current.color})`);
  if (borderChanged) summaryParts.push(`Border changed (${prior.border}→${current.border})`);
  if (symmetryChanged) summaryParts.push(`Symmetry changed (${prior.symmetry}→${current.symmetry})`);
  if (newFeatures.length > 0) summaryParts.push(`New features: ${newFeatures.join(', ')}`);

  const changeCount = summaryParts.length;
  const sizeGrew = sizeDelta !== null && sizeDelta >= 2;

  if (changeCount === 0) {
    concern = 'none';
    summaryParts = ['No significant changes detected.'];
  } else if (sizeGrew || changeCount >= 3) {
    concern = 'high';
  } else if (changeCount >= 2) {
    concern = 'moderate';
  } else {
    concern = 'low';
  }

  return {
    lesion_id: current.lesion_id,
    previous_visit_id: priorVisitId,
    current_visit_id: currentVisitId,
    size_delta_mm: sizeDelta,
    color_changed: colorChanged,
    border_changed: borderChanged,
    symmetry_changed: symmetryChanged,
    new_features: newFeatures,
    overall_concern: concern,
    summary: summaryParts.join('. ') + '.',
  };
}

// ---------------------------------------------------------------------------
// Find the matching lesion from a previous visit (by region proximity)
// ---------------------------------------------------------------------------
export function findPriorLesion(
  currentLesion: Lesion,
  priorVisitLesions: Lesion[],
  threshold = 20,
): Lesion | null {
  let best: Lesion | null = null;
  let bestDist = Infinity;

  for (const prior of priorVisitLesions) {
    if (prior.body_view !== currentLesion.body_view) continue;
    const dx = prior.body_location_x - currentLesion.body_location_x;
    const dy = prior.body_location_y - currentLesion.body_location_y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < threshold && dist < bestDist) {
      best = prior;
      bestDist = dist;
    }
  }
  return best;
}

// Convenience: risk level → color
export function riskColor(level: RiskScore['level']): string {
  switch (level) {
    case 'low': return '#10B981';
    case 'moderate': return '#F59E0B';
    case 'high': return '#F97316';
    case 'very_high': return '#EF4444';
  }
}

export function riskLabel(level: RiskScore['level']): string {
  switch (level) {
    case 'low': return 'Low Risk';
    case 'moderate': return 'Moderate Risk';
    case 'high': return 'High Risk';
    case 'very_high': return 'Very High Risk';
  }
}
