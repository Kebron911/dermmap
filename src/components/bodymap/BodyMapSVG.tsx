import { useState } from 'react';
import { Lesion, BodyView } from '../../types';
import clsx from 'clsx';

interface BodyMapSVGProps {
  view: BodyView;
  lesions: Lesion[];
  onBodyClick?: (x: number, y: number, region: string) => void;
  onLesionClick?: (lesion: Lesion) => void;
  interactive?: boolean;
  compact?: boolean;
}

// Lesion status color mapping
export function getLesionColor(lesion: Lesion): string {
  if (lesion.biopsy_result === 'malignant') return '#EF4444';
  if (lesion.biopsy_result === 'atypical') return '#F59E0B';
  if (lesion.action === 'excision') return '#10B981';
  if (lesion.biopsy_result === 'pending') return '#8B5CF6';
  if (lesion.isNew) return '#3B82F6';
  return '#6B7280';
}

export function getLesionLabel(lesion: Lesion): string {
  if (lesion.biopsy_result === 'malignant') return 'Malignant';
  if (lesion.biopsy_result === 'atypical') return 'Atypical';
  if (lesion.action === 'excision') return 'Excised';
  if (lesion.biopsy_result === 'pending') return 'Biopsy Pending';
  if (lesion.action === 'biopsy_scheduled') return 'Biopsy Scheduled';
  if (lesion.isNew) return 'New';
  return 'Monitoring';
}

// Human body SVG paths - Anterior view (front)
const AnteriorBody = () => (
  <g>
    {/* Head */}
    <ellipse cx="100" cy="44" rx="32" ry="38" fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    {/* Ears */}
    <ellipse cx="68" cy="44" rx="5" ry="9" fill="#F5E6D3" stroke="#D4B896" strokeWidth="1" />
    <ellipse cx="132" cy="44" rx="5" ry="9" fill="#F5E6D3" stroke="#D4B896" strokeWidth="1" />
    {/* Neck */}
    <path d="M86 80 L114 80 L112 106 L88 106 Z" fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    {/* Torso */}
    <path
      d="M55 106 Q62 102 88 106 L112 106 Q138 102 145 106 L152 130 L152 230 Q152 238 145 240 L55 240 Q48 238 48 230 L48 130 Z"
      fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5"
    />
    {/* Left Upper Arm */}
    <path d="M48 110 Q36 112 30 130 L26 190 Q24 200 30 202 L44 202 Q50 200 52 190 L56 130 Q58 118 52 110 Z"
      fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    {/* Right Upper Arm */}
    <path d="M152 110 Q164 112 170 130 L174 190 Q176 200 170 202 L156 202 Q150 200 148 190 L144 130 Q142 118 148 110 Z"
      fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    {/* Left Forearm */}
    <path d="M26 202 L30 202 Q36 202 38 210 L38 280 Q38 286 34 288 L24 288 Q20 286 20 280 L20 210 Q20 202 26 202 Z"
      fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    {/* Right Forearm */}
    <path d="M174 202 L170 202 Q164 202 162 210 L162 280 Q162 286 166 288 L176 288 Q180 286 180 280 L180 210 Q180 202 174 202 Z"
      fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    {/* Left Hand */}
    <ellipse cx="29" cy="300" rx="12" ry="16" fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    {/* Right Hand */}
    <ellipse cx="171" cy="300" rx="12" ry="16" fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    {/* Left Hip/Thigh */}
    <path d="M55 240 L95 240 L96 260 L92 380 Q90 390 82 392 L68 392 Q60 390 58 380 L52 260 Z"
      fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    {/* Right Hip/Thigh */}
    <path d="M145 240 L105 240 L104 260 L108 380 Q110 390 118 392 L132 392 Q140 390 142 380 L148 260 Z"
      fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    {/* Left Lower Leg */}
    <path d="M58 386 L82 386 Q88 388 88 396 L86 460 Q86 470 78 472 L64 472 Q56 470 56 460 L54 396 Q54 388 58 386 Z"
      fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    {/* Right Lower Leg */}
    <path d="M142 386 L118 386 Q112 388 112 396 L114 460 Q114 470 122 472 L136 472 Q144 470 144 460 L146 396 Q146 388 142 386 Z"
      fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    {/* Left Foot */}
    <path d="M54 468 L88 468 Q92 470 92 478 L90 486 Q84 490 54 490 Q46 490 46 480 L46 474 Q46 468 54 468 Z"
      fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    {/* Right Foot */}
    <path d="M146 468 L112 468 Q108 470 108 478 L110 486 Q116 490 146 490 Q154 490 154 480 L154 474 Q154 468 146 468 Z"
      fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    {/* Subtle body features */}
    {/* Clavicles */}
    <path d="M88 108 Q100 104 112 108" fill="none" stroke="#D4B896" strokeWidth="1" opacity="0.5" />
    {/* Center line */}
    <path d="M100 108 L100 236" fill="none" stroke="#D4B896" strokeWidth="0.5" opacity="0.3" strokeDasharray="3,4" />
    {/* Chest line */}
    <path d="M55 140 Q100 144 145 140" fill="none" stroke="#D4B896" strokeWidth="0.5" opacity="0.3" />
    {/* Navel */}
    <circle cx="100" cy="195" r="3" fill="none" stroke="#D4B896" strokeWidth="1" opacity="0.4" />
    {/* Facial features */}
    <ellipse cx="91" cy="48" rx="4" ry="5" fill="#8B6B4A" opacity="0.4" />
    <ellipse cx="109" cy="48" rx="4" ry="5" fill="#8B6B4A" opacity="0.4" />
    <path d="M93 66 Q100 71 107 66" fill="none" stroke="#8B6B4A" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
    {/* Nose */}
    <path d="M98 55 L96 62 Q100 64 104 62 L102 55" fill="none" stroke="#D4B896" strokeWidth="1" opacity="0.5" />
  </g>
);

// Posterior view (back)
const PosteriorBody = () => (
  <g>
    {/* Head - back */}
    <ellipse cx="100" cy="44" rx="32" ry="38" fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    <ellipse cx="68" cy="44" rx="5" ry="9" fill="#F5E6D3" stroke="#D4B896" strokeWidth="1" />
    <ellipse cx="132" cy="44" rx="5" ry="9" fill="#F5E6D3" stroke="#D4B896" strokeWidth="1" />
    {/* Neck */}
    <path d="M86 80 L114 80 L112 106 L88 106 Z" fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    {/* Torso back */}
    <path
      d="M55 106 Q62 102 88 106 L112 106 Q138 102 145 106 L152 130 L152 230 Q152 238 145 240 L55 240 Q48 238 48 230 L48 130 Z"
      fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5"
    />
    {/* Left Upper Arm - mirrored for back view */}
    <path d="M48 110 Q36 112 30 130 L26 190 Q24 200 30 202 L44 202 Q50 200 52 190 L56 130 Q58 118 52 110 Z"
      fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    <path d="M152 110 Q164 112 170 130 L174 190 Q176 200 170 202 L156 202 Q150 200 148 190 L144 130 Q142 118 148 110 Z"
      fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    <path d="M26 202 L30 202 Q36 202 38 210 L38 280 Q38 286 34 288 L24 288 Q20 286 20 280 L20 210 Q20 202 26 202 Z"
      fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    <path d="M174 202 L170 202 Q164 202 162 210 L162 280 Q162 286 166 288 L176 288 Q180 286 180 280 L180 210 Q180 202 174 202 Z"
      fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    <ellipse cx="29" cy="300" rx="12" ry="16" fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    <ellipse cx="171" cy="300" rx="12" ry="16" fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    <path d="M55 240 L95 240 L96 260 L92 380 Q90 390 82 392 L68 392 Q60 390 58 380 L52 260 Z"
      fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    <path d="M145 240 L105 240 L104 260 L108 380 Q110 390 118 392 L132 392 Q140 390 142 380 L148 260 Z"
      fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    <path d="M58 386 L82 386 Q88 388 88 396 L86 460 Q86 470 78 472 L64 472 Q56 470 56 460 L54 396 Q54 388 58 386 Z"
      fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    <path d="M142 386 L118 386 Q112 388 112 396 L114 460 Q114 470 122 472 L136 472 Q144 470 144 460 L146 396 Q146 388 142 386 Z"
      fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    <path d="M54 468 L88 468 Q92 470 92 478 L90 486 Q84 490 54 490 Q46 490 46 480 L46 474 Q46 468 54 468 Z"
      fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    <path d="M146 468 L112 468 Q108 470 108 478 L110 486 Q116 490 146 490 Q154 490 154 480 L154 474 Q154 468 146 468 Z"
      fill="#F5E6D3" stroke="#D4B896" strokeWidth="1.5" />
    {/* Spine */}
    <path d="M100 108 L100 236" fill="none" stroke="#D4B896" strokeWidth="1" opacity="0.4" strokeDasharray="2,4" />
    {/* Shoulder blades */}
    <path d="M68 115 Q65 140 70 160 Q80 165 90 160 Q94 140 90 118 Q80 110 68 115 Z"
      fill="none" stroke="#D4B896" strokeWidth="1" opacity="0.35" />
    <path d="M132 115 Q135 140 130 160 Q120 165 110 160 Q106 140 110 118 Q120 110 132 115 Z"
      fill="none" stroke="#D4B896" strokeWidth="1" opacity="0.35" />
    {/* Hair at back of head */}
    <ellipse cx="100" cy="20" rx="28" ry="14" fill="#8B6B4A" opacity="0.15" />
  </g>
);

// Hit area regions for the body map (for click detection)
const bodyRegions = [
  { id: 'scalp', label: 'Scalp', path: 'M72 6 Q100 0 128 6 Q136 20 132 40 Q120 55 100 57 Q80 55 68 40 Q64 20 72 6 Z' },
  { id: 'face', label: 'Face', path: 'M80 38 Q100 58 120 38 Q128 50 128 65 Q120 80 100 82 Q80 80 72 65 Q72 50 80 38 Z' },
  { id: 'neck', label: 'Neck', path: 'M86 80 L114 80 L112 108 L88 108 Z' },
  { id: 'left_shoulder', label: 'Left Shoulder', path: 'M48 108 L48 135 L30 130 Q24 120 24 108 Z' },
  { id: 'right_shoulder', label: 'Right Shoulder', path: 'M152 108 L152 135 L170 130 Q176 120 176 108 Z' },
  { id: 'chest', label: 'Chest', path: 'M58 108 L142 108 L148 170 L52 170 Z' },
  { id: 'abdomen', label: 'Abdomen', path: 'M52 170 L148 170 L145 240 L55 240 Z' },
  { id: 'upper_back', label: 'Upper Back', path: 'M58 108 L142 108 L148 170 L52 170 Z' },
  { id: 'lower_back', label: 'Lower Back', path: 'M52 170 L148 170 L145 240 L55 240 Z' },
  { id: 'left_upper_arm', label: 'Left Upper Arm', path: 'M28 130 L54 130 L52 200 L24 200 Z' },
  { id: 'right_upper_arm', label: 'Right Upper Arm', path: 'M146 130 L172 130 L176 200 L148 200 Z' },
  { id: 'left_forearm', label: 'Left Forearm', path: 'M20 202 L40 202 L40 285 L18 285 Z' },
  { id: 'right_forearm', label: 'Right Forearm', path: 'M160 202 L182 202 L184 285 L162 285 Z' },
  { id: 'left_hand', label: 'Left Hand', path: 'M16 286 Q30 316 42 286 Z' },
  { id: 'right_hand', label: 'Right Hand', path: 'M158 286 Q172 316 184 286 Z' },
  { id: 'left_hip', label: 'Left Hip', path: 'M55 240 L97 240 L96 290 L52 285 Z' },
  { id: 'right_hip', label: 'Right Hip', path: 'M103 240 L145 240 L148 285 L104 290 Z' },
  { id: 'left_thigh', label: 'Left Thigh', path: 'M52 285 L96 290 L92 380 L55 375 Z' },
  { id: 'right_thigh', label: 'Right Thigh', path: 'M104 290 L148 285 L145 375 L108 380 Z' },
  { id: 'left_lower_leg', label: 'Left Lower Leg', path: 'M55 380 L92 380 L88 470 L54 470 Z' },
  { id: 'right_lower_leg', label: 'Right Lower Leg', path: 'M108 380 L145 380 L146 470 L112 470 Z' },
  { id: 'left_foot', label: 'Left Foot', path: 'M44 468 L92 468 L92 492 L44 492 Z' },
  { id: 'right_foot', label: 'Right Foot', path: 'M108 468 L156 468 L156 492 L108 492 Z' },
];

function LesionMarkerDot({ lesion, onClick }: { lesion: Lesion; onClick: () => void }) {
  const color = getLesionColor(lesion);
  const isNew = lesion.isNew;

  return (
    <g
      transform={`translate(${lesion.body_location_x}, ${lesion.body_location_y})`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ cursor: 'pointer' }}
    >
      {/* Ping ring for new lesions */}
      {isNew && (
        <circle r="10" fill={color} opacity="0" className="marker-ping" style={{ transformOrigin: 'center' }} />
      )}
      {/* Outer ring */}
      <circle r="8" fill="white" opacity="0.9" />
      {/* Main dot */}
      <circle r="6" fill={color} className={isNew ? 'marker-pulse' : ''} />
      {/* Inner highlight */}
      <circle r="2.5" fill="white" opacity="0.6" transform="translate(-1.5, -1.5)" />
    </g>
  );
}

export function BodyMapSVG({
  view,
  lesions,
  onBodyClick,
  onLesionClick,
  interactive = false,
  compact = false,
}: BodyMapSVGProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null);

  const viewBox = "0 0 200 510";
  const isPosterior = view === 'posterior';

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive || !onBodyClick) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = 200 / rect.width;
    const scaleY = 510 / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Find which region was clicked
    const clickedRegion = bodyRegions.find((region) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', region.path);
      const pathElem = svg.appendChild(path);
      const inPath = (pathElem as SVGPathElement).isPointInFill(new DOMPoint(x, y));
      svg.removeChild(pathElem);
      return inPath;
    });

    onBodyClick(Math.round(x), Math.round(y), clickedRegion?.id || 'unknown');
  };

  // Filter lesions for current view
  const visibleLesions = lesions.filter((l) => l.body_view === view || view === 'anterior');

  return (
    <div className={clsx('relative flex justify-center', compact ? '' : 'w-full h-full')}>
      <svg
        viewBox={viewBox}
        className={clsx(
          'select-none',
          interactive && 'cursor-crosshair'
        )}
        style={{
          height: compact ? '11rem' : 'clamp(300px, calc(100vh - 240px), 480px)',
          width: 'auto',
          display: 'block',
        }}
        onClick={handleSvgClick}
      >
        {/* Background */}
        <rect width="200" height="510" fill="transparent" />

        {/* Body silhouette */}
        {isPosterior ? <PosteriorBody /> : <AnteriorBody />}

        {/* Interactive hit areas */}
        {interactive && bodyRegions.map((region) => (
          <path
            key={region.id}
            d={region.path}
            fill="transparent"
            stroke="transparent"
            strokeWidth="4"
            onMouseEnter={(e) => {
              setHoveredRegion(region.id);
              const svg = e.currentTarget.ownerSVGElement!;
              const rect = svg.getBoundingClientRect();
              setTooltip({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                label: region.label,
              });
            }}
            onMouseLeave={() => {
              setHoveredRegion(null);
              setTooltip(null);
            }}
          />
        ))}

        {/* Hover highlight */}
        {hoveredRegion && interactive && (
          <path
            d={bodyRegions.find((r) => r.id === hoveredRegion)?.path || ''}
            fill="rgba(20, 184, 166, 0.12)"
            stroke="rgba(20, 184, 166, 0.5)"
            strokeWidth="1"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Lesion markers */}
        {visibleLesions.map((lesion) => (
          <LesionMarkerDot
            key={lesion.lesion_id}
            lesion={lesion}
            onClick={() => onLesionClick?.(lesion)}
          />
        ))}
      </svg>

      {/* Region tooltip */}
      {tooltip && interactive && (
        <div
          className="absolute pointer-events-none bg-slate-900 text-white text-xs px-2 py-1 rounded-lg z-10 whitespace-nowrap"
          style={{ left: tooltip.x + 10, top: tooltip.y - 20 }}
        >
          {tooltip.label}
        </div>
      )}
    </div>
  );
}
