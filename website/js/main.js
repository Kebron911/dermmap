/**
 * DermMap — Marketing Website JavaScript
 * Fixed: mobile nav selectors, ROI double-prefix, workflow panels,
 *        slider displays, pricing toggle, sticky CTA selector
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNavigation();
  initScrollAnimations();
  initStatCounters();
  initStickyNav();
  initWorkflowTabs();
  initROICalculator();
  initSmoothScroll();
  initDemoForm();
  initPricingToggle();
  initStickyCTA();

  // Draw charts after DOM is ready
  setTimeout(() => {
    drawComparisonChart();
    drawROIChart();
  }, 100);
});

/**
 * 1. Mobile Navigation
 *    Selectors corrected: #mobile-menu-btn + #mobile-menu
 */
function initMobileNavigation() {
  const btn  = document.querySelector('#mobile-menu-btn');
  const menu = document.querySelector('#mobile-menu');

  if (!btn || !menu) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menu.classList.toggle('open');
    btn.classList.toggle('active', isOpen);
  });

  // Close on link click inside menu
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      btn.classList.remove('active');
    });
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !btn.contains(e.target)) {
      menu.classList.remove('open');
      btn.classList.remove('active');
    }
  });
}

/**
 * 2. Scroll Animations — Intersection Observer with stagger delays
 */
function initScrollAnimations() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.dataset.delay) || 0;
        setTimeout(() => entry.target.classList.add('visible'), delay);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

  reveals.forEach(el => observer.observe(el));
}

/**
 * 3. Animated Stat Counters
 */
function initStatCounters() {
  const statNumbers = document.querySelectorAll('.stat-number');
  if (!statNumbers.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.animated) {
        entry.target.dataset.animated = 'true';
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  statNumbers.forEach(el => observer.observe(el));

  function animateCounter(el) {
    const target   = parseInt(el.dataset.target) || 0;
    const suffix   = el.dataset.suffix || '';
    const duration = 1800;
    const start    = Date.now();

    function tick() {
      const progress = Math.min((Date.now() - start) / duration, 1);
      // Ease-out curve
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }

    tick();
  }
}

/**
 * 4. Sticky Nav — adds 'scrolled' class after 60px
 */
function initStickyNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
}

/**
 * 5. Workflow Tabs
 *    Activates first tab on load, toggles .active on click
 */
function initWorkflowTabs() {
  const steps = document.querySelectorAll('.workflow-step');
  if (!steps.length) return;

  function activateStep(stepNum) {
    steps.forEach(s => s.classList.toggle('active', s.dataset.step === stepNum));

    document.querySelectorAll('.workflow-panel').forEach(panel => {
      panel.classList.toggle('active', panel.dataset.panel === stepNum);
      // Override any inline display:none styles
      if (panel.dataset.panel === stepNum) {
        panel.style.removeProperty('display');
      }
    });
  }

  // Activate step 1 by default
  activateStep('1');

  steps.forEach(step => {
    step.addEventListener('click', () => activateStep(step.dataset.step));
  });
}

/**
 * 6. ROI Calculator
 *    Fixed: removed duplicate $ and x prefixes/suffixes
 *    Fixed: slider display IDs corrected to roi-visits-val etc.
 */
function initROICalculator() {
  const visitsInput    = document.querySelector('#roi-visits');
  const providersInput = document.querySelector('#roi-providers');
  const wageInput      = document.querySelector('#roi-wage');

  if (!visitsInput && !providersInput && !wageInput) return;

  [visitsInput, providersInput, wageInput].forEach(input => {
    if (input) input.addEventListener('input', calculateROI);
  });

  function calculateROI() {
    const dailyVisits = parseInt(visitsInput?.value)  || 10;
    const providers   = parseInt(providersInput?.value) || 1;
    const hourlyRate  = parseFloat(wageInput?.value)  || 15;

    // Update slider value labels
    const visitsVal = document.querySelector('#roi-visits-val');
    const provsVal  = document.querySelector('#roi-providers-val');
    const wageVal   = document.querySelector('#roi-wage-val');
    if (visitsVal) visitsVal.textContent = dailyVisits;
    if (provsVal)  provsVal.textContent  = providers;
    if (wageVal)   wageVal.textContent   = hourlyRate;

    // Calculations: 4 min saved per visit, 22 working days/month
    const hoursSaved   = (dailyVisits * 4 * 22) / 60;
    const monthlySave  = hoursSaved * hourlyRate;
    const annualSave   = monthlySave * 12;

    // DermMap monthly cost by provider count
    let cost = 149;
    if (providers >= 2 && providers <= 5)   cost = 279;
    else if (providers >= 6 && providers <= 15) cost = 449;
    else if (providers > 15) cost = 649;

    const roiMultiple = (monthlySave / cost).toFixed(1);

    // Update display — HTML already has $ and 'hrs' / 'x' suffixes, so just set the number
    const hoursEl      = document.querySelector('#roi-hours');
    const monthlyEl    = document.querySelector('#roi-monthly');
    const annualEl     = document.querySelector('#roi-annual');
    const multiplierEl = document.querySelector('#roi-multiplier');

    if (hoursEl)      hoursEl.textContent      = hoursSaved.toFixed(1);
    if (monthlyEl)    monthlyEl.textContent     = Number(monthlySave.toFixed(0)).toLocaleString();
    if (annualEl)     annualEl.textContent      = Number(annualSave.toFixed(0)).toLocaleString();
    if (multiplierEl) multiplierEl.textContent  = roiMultiple;
  }

  // Run initial calculation
  calculateROI();
}

/**
 * 7. Comparison Bar Chart — SVG, animated on scroll
 */
function drawComparisonChart() {
  const container = document.querySelector('#comparison-chart');
  if (!container) return;

  const ns  = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 500 180');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.cssText = 'width:100%;height:100%;';

  const data = [
    { label: 'Traditional EHR', value: 300, color: '#EF4444', time: '4–6 min' },
    { label: 'DermMap',          value: 8,   color: '#0D9488', time: '8 sec'  }
  ];

  const maxVal    = 300;
  const maxBarW   = 260;
  const barH      = 44;
  const gap       = 72;
  const startY    = 28;
  const labelX    = 8;
  const barStartX = 160;

  data.forEach((item, i) => {
    const y        = startY + i * (barH + gap);
    const barWidth = (item.value / maxVal) * maxBarW;

    // Row label
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', labelX);
    text.setAttribute('y', y + barH / 2 + 5);
    text.setAttribute('font-size', '13');
    text.setAttribute('font-family', 'Outfit, sans-serif');
    text.setAttribute('fill', '#334155');
    text.setAttribute('font-weight', '500');
    text.textContent = item.label;
    svg.appendChild(text);

    // Bar track
    const track = document.createElementNS(ns, 'rect');
    track.setAttribute('x', barStartX);
    track.setAttribute('y', y);
    track.setAttribute('width', maxBarW);
    track.setAttribute('height', barH);
    track.setAttribute('fill', '#F1F5F9');
    track.setAttribute('rx', '6');
    svg.appendChild(track);

    // Animated bar
    const bar = document.createElementNS(ns, 'rect');
    bar.setAttribute('x', barStartX);
    bar.setAttribute('y', y);
    bar.setAttribute('width', '0');
    bar.setAttribute('height', barH);
    bar.setAttribute('fill', item.color);
    bar.setAttribute('rx', '6');
    svg.appendChild(bar);

    // Value label
    const val = document.createElementNS(ns, 'text');
    val.setAttribute('x', barStartX + maxBarW + 12);
    val.setAttribute('y', y + barH / 2 + 5);
    val.setAttribute('font-size', '13');
    val.setAttribute('font-family', 'Space Mono, monospace');
    val.setAttribute('fill', item.color);
    val.setAttribute('font-weight', '700');
    val.textContent = item.time;
    svg.appendChild(val);

    // Animate on scroll into view
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateBar(bar, barWidth, 1400 + i * 200);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    obs.observe(svg);
  });

  container.appendChild(svg);
}

function animateBar(el, targetW, duration) {
  const start = Date.now();
  function tick() {
    const t = Math.min((Date.now() - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.setAttribute('width', eased * targetW);
    if (t < 1) requestAnimationFrame(tick);
  }
  tick();
}

/**
 * 8. ROI Line Chart — animated path draw
 */
function drawROIChart() {
  const container = document.querySelector('#roi-chart');
  if (!container) return;

  const ns  = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 480 260');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.cssText = 'width:100%;height:auto;';

  const data    = [
    { label: 'Solo', hours: 20 },
    { label: 'Practice', hours: 40 },
    { label: 'Group', hours: 90 },
    { label: 'Enterprise', hours: 160 }
  ];

  const pad     = { top: 20, right: 20, bottom: 40, left: 50 };
  const cW      = 480 - pad.left - pad.right;
  const cH      = 260 - pad.top  - pad.bottom;
  const maxH    = 160;

  // Axes
  const xAxis = document.createElementNS(ns, 'line');
  xAxis.setAttribute('x1', pad.left); xAxis.setAttribute('y1', pad.top + cH);
  xAxis.setAttribute('x2', pad.left + cW); xAxis.setAttribute('y2', pad.top + cH);
  xAxis.setAttribute('stroke', '#E2E8F0'); xAxis.setAttribute('stroke-width', '1.5');
  svg.appendChild(xAxis);

  // Y gridlines + labels
  [0, 40, 80, 120, 160].forEach(val => {
    const y = pad.top + cH - (val / maxH) * cH;

    const grid = document.createElementNS(ns, 'line');
    grid.setAttribute('x1', pad.left); grid.setAttribute('y1', y);
    grid.setAttribute('x2', pad.left + cW); grid.setAttribute('y2', y);
    grid.setAttribute('stroke', '#F1F5F9'); grid.setAttribute('stroke-width', '1');
    svg.appendChild(grid);

    const lbl = document.createElementNS(ns, 'text');
    lbl.setAttribute('x', pad.left - 8); lbl.setAttribute('y', y + 4);
    lbl.setAttribute('text-anchor', 'end');
    lbl.setAttribute('font-size', '11'); lbl.setAttribute('fill', '#94A3B8');
    lbl.setAttribute('font-family', 'Space Mono, monospace');
    lbl.textContent = val + 'h';
    svg.appendChild(lbl);
  });

  // Calculate points
  const pts = data.map((d, i) => ({
    x: pad.left + (i / (data.length - 1)) * cW,
    y: pad.top  + cH - (d.hours / maxH) * cH,
    label: d.label,
    hours: d.hours
  }));

  // Filled area under line
  let areaD = `M ${pts[0].x} ${pad.top + cH}`;
  pts.forEach(p => { areaD += ` L ${p.x} ${p.y}`; });
  areaD += ` L ${pts[pts.length - 1].x} ${pad.top + cH} Z`;

  const area = document.createElementNS(ns, 'path');
  area.setAttribute('d', areaD);
  area.setAttribute('fill', 'url(#roiGrad)');
  area.setAttribute('opacity', '0.3');
  svg.appendChild(area);

  // Gradient definition
  const defs = document.createElementNS(ns, 'defs');
  const grad = document.createElementNS(ns, 'linearGradient');
  grad.setAttribute('id', 'roiGrad');
  grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0');
  grad.setAttribute('x2', '0'); grad.setAttribute('y2', '1');

  const stop1 = document.createElementNS(ns, 'stop');
  stop1.setAttribute('offset', '0%');   stop1.setAttribute('stop-color', '#0D9488');
  const stop2 = document.createElementNS(ns, 'stop');
  stop2.setAttribute('offset', '100%'); stop2.setAttribute('stop-color', '#0D9488');
  stop2.setAttribute('stop-opacity', '0');

  grad.appendChild(stop1); grad.appendChild(stop2);
  defs.appendChild(grad); svg.insertBefore(defs, svg.firstChild);

  // Line path
  let pathD = `M ${pts[0].x} ${pts[0].y}`;
  pts.slice(1).forEach(p => { pathD += ` L ${p.x} ${p.y}`; });

  const line = document.createElementNS(ns, 'path');
  line.setAttribute('d', pathD);
  line.setAttribute('stroke', '#0D9488');
  line.setAttribute('stroke-width', '2.5');
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke-linecap', 'round');
  line.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(line);

  // Animate line draw
  const pathLen = line.getTotalLength();
  line.style.strokeDasharray  = pathLen;
  line.style.strokeDashoffset = pathLen;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animatePath(line, pathLen, 1800);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  obs.observe(svg);

  // Data points + x-labels
  pts.forEach(p => {
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', p.x); circle.setAttribute('cy', p.y);
    circle.setAttribute('r', '5');
    circle.setAttribute('fill', '#0D9488');
    circle.setAttribute('stroke', '#fff');
    circle.setAttribute('stroke-width', '2');
    svg.appendChild(circle);

    const xLbl = document.createElementNS(ns, 'text');
    xLbl.setAttribute('x', p.x); xLbl.setAttribute('y', pad.top + cH + 22);
    xLbl.setAttribute('text-anchor', 'middle');
    xLbl.setAttribute('font-size', '11'); xLbl.setAttribute('fill', '#64748B');
    xLbl.setAttribute('font-family', 'Outfit, sans-serif');
    xLbl.textContent = p.label;
    svg.appendChild(xLbl);
  });

  container.appendChild(svg);
}

function animatePath(el, length, duration) {
  const start = Date.now();
  function tick() {
    const t     = Math.min((Date.now() - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 2);
    el.style.strokeDashoffset = length * (1 - eased);
    if (t < 1) requestAnimationFrame(tick);
  }
  tick();
}

/**
 * 9. Pricing Toggle — monthly/annual with 10% discount
 *    Fixed: uses data-monthly attribute (matches pricing.html HTML)
 */
function initPricingToggle() {
  const toggle = document.querySelector('#billing-toggle');
  if (!toggle) return;

  toggle.addEventListener('change', () => {
    const isAnnual = toggle.checked;
    toggle.parentElement?.classList.toggle('annual', isAnnual);

    document.querySelectorAll('[data-monthly]').forEach(el => {
      const monthly = parseFloat(el.dataset.monthly);
      if (isNaN(monthly)) return;
      const annual  = Math.round(monthly * 0.9);
      el.textContent = '$' + (isAnnual ? annual : monthly);
    });

    // Show/hide "billed annually" note
    document.querySelectorAll('.billing-note').forEach(note => {
      note.style.display = isAnnual ? 'block' : 'none';
    });
  });
}

/**
 * 10. Smooth scroll — anchor links
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

/**
 * 11. Demo Form Submission
 */
function initDemoForm() {
  const form       = document.querySelector('#demo-form');
  const successMsg = document.querySelector('#form-success');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    let isValid = true;
    form.querySelectorAll('input[required], select[required], textarea[required]').forEach(input => {
      const ok = input.value.trim() !== '';
      input.classList.toggle('error', !ok);
      if (!ok) isValid = false;
    });

    if (!isValid) return;

    form.style.display = 'none';
    if (successMsg) successMsg.style.display = 'block';
  });
}

/**
 * 12. Mobile Sticky CTA
 *    Fixed: targets .mobile-cta (matches HTML class)
 *    Uses .visible class to show (CSS handles display:flex)
 */
function initStickyCTA() {
  const cta = document.querySelector('.mobile-cta');
  if (!cta) return;

  window.addEventListener('scroll', () => {
    const show = window.innerWidth < 768 && window.scrollY > 600;
    cta.classList.toggle('visible', show);
  }, { passive: true });
}

// Expose for debugging
window.DermMapJS = { drawComparisonChart, drawROIChart };
