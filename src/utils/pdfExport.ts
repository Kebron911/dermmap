import jsPDF from 'jspdf';
import { Patient, Visit, Lesion } from '../types';
import { format, parseISO, differenceInYears } from 'date-fns';

// Color palette matching the clinical design
const COLORS = {
  primary: [13, 148, 136] as [number, number, number],       // teal-600
  dark: [15, 23, 42] as [number, number, number],             // slate-900
  medium: [71, 85, 105] as [number, number, number],          // slate-500
  light: [148, 163, 184] as [number, number, number],         // slate-400
  border: [226, 232, 240] as [number, number, number],        // slate-200
  bg: [248, 250, 252] as [number, number, number],            // slate-50
  white: [255, 255, 255] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  green: [16, 185, 129] as [number, number, number],
  blue: [59, 130, 246] as [number, number, number],
};

const PAGE_W = 215.9;  // Letter width mm
const PAGE_H = 279.4;  // Letter height mm
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;

function setFill(doc: jsPDF, color: [number, number, number]) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setTextColor(doc: jsPDF, color: [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function setDrawColor(doc: jsPDF, color: [number, number, number]) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function addPageIfNeeded(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN - 15) {
    doc.addPage();
    return MARGIN + 5;
  }
  return y;
}

function drawDivider(doc: jsPDF, y: number, color = COLORS.border) {
  setDrawColor(doc, color);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  return y + 4;
}

function getLesionStatusColor(lesion: Lesion): [number, number, number] {
  if (lesion.biopsy_result === 'malignant') return COLORS.red;
  if (lesion.biopsy_result === 'atypical') return COLORS.amber;
  if (lesion.action === 'excision') return COLORS.green;
  if (lesion.biopsy_result === 'pending') return [139, 92, 246];
  return COLORS.blue;
}

function getLesionStatusLabel(lesion: Lesion): string {
  if (lesion.biopsy_result === 'malignant') return 'MALIGNANT';
  if (lesion.biopsy_result === 'atypical') return 'ATYPICAL';
  if (lesion.biopsy_result === 'benign') return 'BENIGN';
  if (lesion.action === 'excision') return 'EXCISED';
  if (lesion.biopsy_result === 'pending') return 'PENDING';
  if (lesion.action === 'biopsy_scheduled') return 'BIOPSY SCHED.';
  return 'MONITORING';
}

function drawLesionPhotoBox(doc: jsPDF, x: number, y: number, w: number, h: number, lesion: Lesion, photoIdx: number) {
  const captureType = lesion.photos[photoIdx]?.capture_type || 'clinical';
  const isDerm = captureType === 'dermoscopic';

  // Photo box background
  setFill(doc, [26, 26, 46]);
  setDrawColor(doc, COLORS.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  // Simulate dermoscopic pattern
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(6);
  doc.text(isDerm ? 'Dermoscopic' : 'Clinical Photo', x + w / 2, y + h / 2 - 2, { align: 'center' });
  doc.text(`Photo ${photoIdx + 1}`, x + w / 2, y + h / 2 + 4, { align: 'center' });

  // Bottom label
  setFill(doc, [0, 0, 0]);
  doc.rect(x, y + h - 5, w, 5, 'F');
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(5);
  doc.text(isDerm ? 'DERM.' : 'CLIN.', x + w / 2, y + h - 1.5, { align: 'center' });
}

export async function exportVisitPDF(patient: Patient, visit: Visit, clinicName = 'Riverside Dermatology Associates'): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const age = differenceInYears(new Date(), parseISO(patient.date_of_birth));
  const visitDate = format(parseISO(visit.visit_date), 'MMMM d, yyyy');
  const generatedAt = format(new Date(), "MMM d, yyyy 'at' h:mm a");

  let y = MARGIN;

  // ─── PAGE HEADER ───────────────────────────────────────────────
  // Teal header bar
  setFill(doc, COLORS.primary);
  doc.rect(0, 0, PAGE_W, 22, 'F');

  // DermMap logo text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  setTextColor(doc, COLORS.white);
  doc.text('DermMap', MARGIN, 14);

  // Clinic name
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setTextColor(doc, [200, 240, 235]);
  doc.text(clinicName, MARGIN + 30, 14);

  // Document title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DERMATOLOGY LESION DOCUMENTATION', PAGE_W - MARGIN, 9, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('CONFIDENTIAL — PROTECTED HEALTH INFORMATION', PAGE_W - MARGIN, 16, { align: 'right' });

  y = 30;

  // ─── PATIENT DEMOGRAPHICS ───────────────────────────────────────
  // Patient info card
  setFill(doc, COLORS.bg);
  setDrawColor(doc, COLORS.border);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN, y, CONTENT_W, 28, 2, 2, 'FD');

  // Left column
  const col1 = MARGIN + 5;
  const col2 = MARGIN + CONTENT_W / 2;
  const rowH = 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  setTextColor(doc, COLORS.medium);
  doc.text('PATIENT', col1, y + 6);
  doc.text('VISIT INFORMATION', col2, y + 6);

  const fields = [
    [`${patient.last_name}, ${patient.first_name}`, col1, y + 12, true],
    [`DOB: ${format(parseISO(patient.date_of_birth), 'MM/dd/yyyy')} · Age: ${age}`, col1, y + 18, false],
    [`MRN: ${patient.mrn}`, col1, y + 24, false],
    [`Fitzpatrick Type ${patient.skin_type} · ${patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}`, col1, y + 30, false],
    [`Visit Date: ${visitDate}`, col2, y + 12, false],
    [`Provider: ${visit.provider_name}`, col2, y + 18, false],
    [`Documented by: ${visit.ma_name}`, col2, y + 24, false],
    [`Status: ${visit.status.replace(/_/g, ' ').toUpperCase()}`, col2, y + 30, false],
  ];

  fields.forEach(([text, x, fy, bold]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 10 : 8);
    setTextColor(doc, bold ? COLORS.dark : COLORS.medium);
    doc.text(text as string, x as number, fy as number);
  });

  y += 35;

  // ─── VISIT SUMMARY BAR ─────────────────────────────────────────
  const totalPhotos = visit.lesions.reduce((acc, l) => acc + l.photos.length, 0);
  const flagged = visit.lesions.filter(l => l.action === 'biopsy_scheduled' || l.action === 'biopsy_performed' || l.biopsy_result === 'malignant' || l.biopsy_result === 'atypical').length;

  const summaryItems = [
    { label: 'Lesions Documented', value: visit.lesions.length.toString() },
    { label: 'Photos Captured', value: totalPhotos.toString() },
    { label: 'Flagged for Review', value: flagged.toString(), highlight: flagged > 0 },
    { label: 'Prior Visits', value: 'On File' },
  ];

  const boxW = CONTENT_W / summaryItems.length;
  summaryItems.forEach((item, i) => {
    const bx = MARGIN + i * boxW;
    setFill(doc, item.highlight ? [254, 243, 199] : COLORS.white);
    setDrawColor(doc, item.highlight ? COLORS.amber : COLORS.border);
    doc.setLineWidth(0.3);
    doc.rect(bx, y, boxW, 14, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    setTextColor(doc, item.highlight ? COLORS.amber : COLORS.primary);
    doc.text(item.value, bx + boxW / 2, y + 8, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    setTextColor(doc, COLORS.medium);
    doc.text(item.label, bx + boxW / 2, y + 12, { align: 'center' });
  });

  y += 20;

  // ─── LESIONS ────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setTextColor(doc, COLORS.dark);
  doc.text('Lesion Documentation', MARGIN, y);

  // Teal underline
  setFill(doc, COLORS.primary);
  doc.rect(MARGIN, y + 1.5, 50, 0.8, 'F');

  y += 8;

  visit.lesions.forEach((lesion, idx) => {
    y = addPageIfNeeded(doc, y, 55);

    const statusColor = getLesionStatusColor(lesion);
    const statusLabel = getLesionStatusLabel(lesion);

    // Lesion header row
    setFill(doc, [248, 250, 252]);
    setDrawColor(doc, COLORS.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CONTENT_W, 8, 1, 1, 'FD');

    // Number badge
    setFill(doc, statusColor);
    doc.circle(MARGIN + 5, y + 4, 3.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setTextColor(doc, COLORS.white);
    doc.text((idx + 1).toString(), MARGIN + 5, y + 5.5, { align: 'center' });

    // Location
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    setTextColor(doc, COLORS.dark);
    doc.text(
      lesion.body_region.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      MARGIN + 12, y + 5.5
    );

    // Status badge
    setFill(doc, [...statusColor.map(c => Math.min(255, c + 180))] as [number, number, number]);
    const badgeW = doc.getTextWidth(statusLabel) + 6;
    doc.roundedRect(PAGE_W - MARGIN - badgeW - 2, y + 1.5, badgeW + 4, 5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    setTextColor(doc, statusColor);
    doc.text(statusLabel, PAGE_W - MARGIN - badgeW / 2, y + 5, { align: 'center' });

    y += 10;

    // Data grid
    const dataItems = [
      { label: 'Size', value: lesion.size_mm ? `${lesion.size_mm} mm` : 'Not assessed' },
      { label: 'Shape', value: lesion.shape || 'Not assessed' },
      { label: 'Color', value: lesion.color?.replace(/_/g, ' ') || 'Not assessed' },
      { label: 'Border', value: lesion.border.replace(/_/g, ' ') },
      { label: 'Symmetry', value: lesion.symmetry.replace(/_/g, ' ') },
      { label: 'Action', value: lesion.action.replace(/_/g, ' ') },
    ];

    const cellW = CONTENT_W / 3;
    const cellH = 10;

    dataItems.forEach((item, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const cx = MARGIN + col * cellW;
      const cy = y + row * cellH;

      setFill(doc, COLORS.white);
      setDrawColor(doc, COLORS.border);
      doc.setLineWidth(0.2);
      doc.rect(cx, cy, cellW, cellH, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      setTextColor(doc, COLORS.light);
      doc.text(item.label.toUpperCase(), cx + 3, cy + 3.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      setTextColor(doc, COLORS.dark);
      doc.text(item.value.charAt(0).toUpperCase() + item.value.slice(1), cx + 3, cy + 8);
    });

    y += cellH * 2 + 3;

    // Photos row
    if (lesion.photos.length > 0) {
      y = addPageIfNeeded(doc, y, 32);
      const photoW = 28;
      const photoH = 28;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      setTextColor(doc, COLORS.medium);
      doc.text('Clinical Images:', MARGIN, y + 4);

      lesion.photos.forEach((photo, pi) => {
        if (pi >= 5) return;
        const px = MARGIN + 25 + pi * (photoW + 3);
        if (photo.url && photo.url.startsWith('data:image')) {
          // Embed the actual captured image
          try {
            const fmt = photo.url.startsWith('data:image/png') ? 'PNG' : 'JPEG';
            doc.addImage(photo.url, fmt, px, y, photoW, photoH);
            // Caption bar
            setFill(doc, [0, 0, 0]);
            doc.rect(px, y + photoH - 5, photoW, 5, 'F');
            doc.setTextColor(200, 200, 200);
            doc.setFontSize(5);
            const label = photo.capture_type === 'dermoscopic' ? 'DERM.' : 'CLIN.';
            doc.text(label, px + photoW / 2, y + photoH - 1.5, { align: 'center' });
          } catch {
            drawLesionPhotoBox(doc, px, y, photoW, photoH, lesion, pi);
          }
        } else {
          drawLesionPhotoBox(doc, px, y, photoW, photoH, lesion, pi);
        }
      });

      y += photoH + 4;
    }

    // Clinical notes
    if (lesion.clinical_notes) {
      y = addPageIfNeeded(doc, y, 16);
      setFill(doc, [239, 246, 255]);
      setDrawColor(doc, [191, 219, 254]);
      doc.setLineWidth(0.3);
      doc.roundedRect(MARGIN, y, CONTENT_W, 14, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      setTextColor(doc, [37, 99, 235]);
      doc.text('Clinical Notes (Provider):', MARGIN + 3, y + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setTextColor(doc, COLORS.dark);
      const lines = doc.splitTextToSize(lesion.clinical_notes, CONTENT_W - 6);
      doc.text(lines.slice(0, 2), MARGIN + 3, y + 10);

      y += 18;
    }

    // Biopsy result
    if (lesion.biopsy_result !== 'na' && lesion.biopsy_result !== 'pending') {
      y = addPageIfNeeded(doc, y, 10);
      const resultColor = lesion.biopsy_result === 'malignant' ? COLORS.red : lesion.biopsy_result === 'atypical' ? COLORS.amber : COLORS.green;
      setFill(doc, [...resultColor.map(c => Math.min(255, c + 195))] as [number, number, number]);
      setDrawColor(doc, resultColor);
      doc.setLineWidth(0.3);
      doc.roundedRect(MARGIN, y, CONTENT_W, 8, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      setTextColor(doc, resultColor);
      doc.text(`Pathology Result: ${lesion.biopsy_result.charAt(0).toUpperCase() + lesion.biopsy_result.slice(1)}`, MARGIN + 4, y + 5.5);

      if (lesion.pathology_notes) {
        doc.setFont('helvetica', 'normal');
        setTextColor(doc, COLORS.dark);
        doc.text(` — ${lesion.pathology_notes}`, MARGIN + 4 + doc.getTextWidth(`Pathology Result: ${lesion.biopsy_result.charAt(0).toUpperCase() + lesion.biopsy_result.slice(1)}`), y + 5.5);
      }
      y += 11;
    }

    // Separator between lesions
    y = drawDivider(doc, y + 2);
    y += 2;
  });

  // ─── SIGNATURE BLOCK ────────────────────────────────────────────
  y = addPageIfNeeded(doc, y, 35);
  y += 4;

  setFill(doc, COLORS.bg);
  setDrawColor(doc, COLORS.border);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN, y, CONTENT_W, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setTextColor(doc, COLORS.dark);
  doc.text('Provider Attestation', MARGIN + 5, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setTextColor(doc, COLORS.medium);
  const defaultAttest = 'I attest that I have reviewed this documentation and it accurately reflects the patient encounter on the date specified.';
  const attestText = visit.provider_attestation || defaultAttest;
  const attestLines = doc.splitTextToSize(attestText, CONTENT_W - 10);
  doc.text(attestLines.slice(0, 3), MARGIN + 5, y + 13);

  // Signature line
  setDrawColor(doc, COLORS.dark);
  doc.setLineWidth(0.5);
  doc.line(MARGIN + 5, y + 25, MARGIN + 80, y + 25);
  doc.line(MARGIN + 100, y + 25, MARGIN + 140, y + 25);

  doc.setFontSize(7);
  setTextColor(doc, COLORS.medium);
  doc.text('Provider Signature', MARGIN + 5, y + 29);
  doc.text('Date', MARGIN + 100, y + 29);

  // Pre-fill provider name
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  setTextColor(doc, COLORS.dark);
  doc.text(visit.provider_name, MARGIN + 5, y + 23);

  // ─── FOOTER (all pages) ─────────────────────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);

    // Footer bar
    setFill(doc, [241, 245, 249]);
    doc.rect(0, PAGE_H - 12, PAGE_W, 12, 'F');

    setDrawColor(doc, COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(0, PAGE_H - 12, PAGE_W, PAGE_H - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    setTextColor(doc, COLORS.medium);
    doc.text(`Generated by DermMap | ${generatedAt} | HIPAA-compliant documentation`, MARGIN, PAGE_H - 5);
    doc.text(`Page ${page} of ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 5, { align: 'right' });

    if (page > 1) {
      // Continuation header on subsequent pages
      setFill(doc, COLORS.primary);
      doc.rect(0, 0, PAGE_W, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      setTextColor(doc, COLORS.white);
      doc.text(
        `DermMap — ${patient.last_name}, ${patient.first_name} · ${patient.mrn} · Visit: ${visitDate} (continued)`,
        MARGIN, 5.5
      );
    }
  }

  // Save
  const filename = `DermMap_${patient.last_name}_${patient.first_name}_${visit.visit_date}.pdf`;
  doc.save(filename);
}
