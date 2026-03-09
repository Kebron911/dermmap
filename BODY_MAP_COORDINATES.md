# Body Map Coordinate Reference

This document provides the correct coordinates for placing lesions on the DermMap body SVG.

## SVG Coordinate System
- ViewBox: `0 0 200 510`
- Width: 200 units
- Height: 510 units

## Anterior (Front) View - Coordinate Guide

### Head & Neck
| Region | Approximate X | Approximate Y | Description |
|--------|--------------|--------------|-------------|
| Scalp (top) | 100 | 10-20 | Top of head |
| Scalp (sides) | 72-128 | 15-30 | Side of head |
| Face (forehead) | 100 | 35-45 | Upper face |
| Face (center) | 100 | 45-65 | Mid face |
| Face (cheeks) | 85-115 | 48-60 | Cheek area |
| Neck | 100 | 80-105 | Front of neck |

### Upper Body
| Region | Approximate X | Approximate Y | Description |
|--------|--------------|--------------|-------------|
| Left Shoulder | 35-50 | 110-135 | Left shoulder area |
| Right Shoulder | 150-165 | 110-135 | Right shoulder area |
| Chest (left) | 70-90 | 120-165 | Left chest |
| Chest (center) | 95-105 | 120-165 | Center chest |
| Chest (right) | 110-130 | 120-165 | Right chest |
| Abdomen (upper) | 90-110 | 175-210 | Upper abdomen |
| Abdomen (lower) | 90-110 | 210-235 | Lower abdomen |

### Arms & Hands
| Region | Approximate X | Approximate Y | Description |
|--------|--------------|--------------|-------------|
| Left Upper Arm | 30-52 | 135-200 | Left upper arm |
| Right Upper Arm | 148-170 | 135-200 | Right upper arm |
| Left Forearm | 24-38 | 210-285 | Left forearm |
| Right Forearm | 162-176 | 210-285 | Right forearm |
| Left Hand | 20-38 | 288-312 | Left hand |
| Right Hand | 162-180 | 288-312 | Right hand |

### Lower Body
| Region | Approximate X | Approximate Y | Description |
|--------|--------------|--------------|-------------|
| Left Hip | 60-90 | 240-280 | Left hip area |
| Right Hip | 110-140 | 240-280 | Right hip area |
| Left Thigh | 60-92 | 280-380 | Left thigh |
| Right Thigh | 108-140 | 280-380 | Right thigh |
| Left Lower Leg | 56-86 | 390-465 | Left lower leg |
| Right Lower Leg | 114-144 | 390-465 | Right lower leg |
| Left Foot | 48-88 | 470-488 | Left foot |
| Right Foot | 112-152 | 470-488 | Right foot |

## Posterior (Back) View - Coordinate Guide

### Head & Neck
| Region | Approximate X | Approximate Y | Description |
|--------|--------------|--------------|-------------|
| Scalp (back) | 100 | 10-30 | Back of head |
| Neck (back) | 100 | 80-105 | Back of neck |

### Upper Body
| Region | Approximate X | Approximate Y | Description |
|--------|--------------|--------------|-------------|
| Left Shoulder (back) | 35-50 | 110-135 | Left shoulder blade |
| Right Shoulder (back) | 150-165 | 110-135 | Right shoulder blade |
| Upper Back (left) | 70-95 | 120-165 | Left upper back |
| Upper Back (center) | 95-105 | 120-165 | Center upper back |
| Upper Back (right) | 105-130 | 120-165 | Right upper back |
| Lower Back (upper) | 70-130 | 175-210 | Upper lower back |
| Lower Back (lower) | 70-130 | 210-235 | Lower lower back |
| Buttocks | 70-130 | 240-270 | Buttocks area |

### Arms (Posterior)
Same X/Y coordinates as anterior view for arms and hands.

## Example Lesion Coordinates

```typescript
// Correct examples from synthetic data:
{
  body_region: 'left_shoulder',
  body_location_x: 40,
  body_location_y: 120,
  body_view: 'anterior'
}

{
  body_region: 'chest',
  body_location_x: 80,
  body_location_y: 140,
  body_view: 'anterior'
}

{
  body_region: 'abdomen',
  body_location_x: 100,
  body_location_y: 200,
  body_view: 'anterior'
}

{
  body_region: 'left_upper_arm',
  body_location_x: 38,
  body_location_y: 160,
  body_view: 'anterior'
}

{
  body_region: 'left_lower_leg',
  body_location_x: 71,
  body_location_y: 430,
  body_view: 'anterior'
}

{
  body_region: 'right_shoulder',
  body_location_x: 160,
  body_location_y: 120,
  body_view: 'posterior'
}

{
  body_region: 'neck',
  body_location_x: 100,
  body_location_y: 93,
  body_view: 'anterior'
}

{
  body_region: 'face',
  body_location_x: 100,
  body_location_y: 50,
  body_view: 'anterior'
}
```

## How to Test New Coordinates

1. Open the app in dev mode: `npm run dev`
2. Navigate to a patient with the lesion
3. Check the body map view
4. Verify the lesion marker appears in the correct anatomical location
5. The lesion should be visually positioned over the corresponding body part in the SVG

## Common Mistakes

❌ **WRONG**: Placing shoulder lesions in the face area (y < 80)
✅ **CORRECT**: Shoulders are at y = 110-135

❌ **WRONG**: Placing leg lesions in the hip area (y = 280-310)
✅ **CORRECT**: Lower legs are at y = 390-465

❌ **WRONG**: Using the same coordinates for left and right sides
✅ **CORRECT**: Left side uses x < 100, right side uses x > 100

## SVG Body Part Boundaries (for reference)

See [BodyMapSVG.tsx](../src/components/bodymap/BodyMapSVG.tsx) for the actual SVG path definitions.

Key SVG elements:
- **Head**: `<ellipse cx="100" cy="44" rx="32" ry="38" />`
- **Neck**: `<path d="M86 80 L114 80 L112 106 L88 106 Z" />`
- **Left Upper Arm**: `<path d="M48 110 Q36 112 30 130 L26 190..." />`
- **Right Upper Arm**: `<path d="M152 110 Q164 112 170 130 L174 190..." />`
- **Torso**: `<path d="M55 106 Q62 102 88 106 L112 106 Q138 102 145 106 L152 130 L152 230..." />`
- **Left Lower Leg**: `<path d="M58 386 L82 386 Q88 388 88 396 L86 460..." />`
- **Right Lower Leg**: `<path d="M142 386 L118 386 Q112 388 112 396 L114 460..." />`

## Version History

- **v1.0** (2025-01-06): Fixed all lesion coordinates in synthetic data to match actual SVG body regions
  - Fixed left_shoulder from (82, 68) → (40, 120)
  - Fixed right_shoulder from (155, 58) → (160, 120)
  - Fixed left_upper_arm from (90, 78) → (38, 160)
  - Fixed left_lower_leg from (60, 310) → (71, 430)
  - Fixed neck from (100, 55) → (100, 93)
  - Fixed face from (100, 35) → (100, 50)
