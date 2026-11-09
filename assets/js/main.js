// ── Year ────────────────────────────────────────────────────────────
document.getElementById('year').textContent = new Date().getFullYear();

// ── Nav: opaque on scroll ───────────────────────────────────────────
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ── Scroll reveal ───────────────────────────────────────────────────
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

// ── Mobile nav ──────────────────────────────────────────────────────
const toggle  = document.querySelector('.nav-toggle');
const navMenu = document.getElementById('nav-menu');

toggle.addEventListener('click', () => {
  const open = navMenu.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
});

// Close on nav link click
navMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    navMenu.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
  });
});

// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && navMenu.classList.contains('open')) {
    navMenu.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  }
});

// ── Circuit background (full page) ───────────────────────────
(() => {
  const canvas = document.getElementById('circuit');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const host = canvas.parentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const C = {
    trace:  'rgba(201,168,76,0.18)',
    pad:    'rgba(201,168,76,0.35)',
    chipBg: 'rgba(13,24,41,0.95)',
    chipLn: 'rgba(201,168,76,0.5)',
    signal: '#e8d080',
    glow:   'rgba(201,168,76,0.9)'
  };

  let W = 0, H = 0, chips = [], traces = [], signals = [];
  let running = false, last = 0, rafId = null;

  const rand = (a, b) => a + Math.random() * (b - a);

  // Build one trace: straight out of the pin, a 45° jog that fans away
  // from the chip centre, then a long straight run ending in a pad.
  function makeTrace(start, d, perp, offset) {
    const pts = [start];
    const p1 = { x: start.x + d.x * rand(12, 22), y: start.y + d.y * rand(12, 22) };
    pts.push(p1);
    const s = Math.sign(offset);
    let p = p1;
    if (s !== 0) {
      const k = Math.abs(offset) * 1.4 + rand(6, 24);
      p = { x: p1.x + d.x * k + perp.x * s * k, y: p1.y + d.y * k + perp.y * s * k };
      pts.push(p);
    }
    // scale run length with the viewport so wide screens stay connected;
    // traces heading toward the centre reach further to tie both sides together
    const scale = Math.max(1, W / 900);
    const inward = d.x !== 0 && d.x * (W / 2 - start.x) > 0;
    const L = inward ? rand(160, 420) * scale : rand(70, 280) * Math.min(scale, 1.6);
    let end = { x: p.x + d.x * L, y: p.y + d.y * L };
    pts.push(end);
    // occasional second jog for variety
    if (Math.random() < 0.35) {
      const k2 = rand(16, 40), s2 = s || (Math.random() < 0.5 ? -1 : 1);
      const j = { x: end.x + d.x * k2 + perp.x * s2 * k2, y: end.y + d.y * k2 + perp.y * s2 * k2 };
      pts.push(j);
      const L2 = rand(30, 140);
      pts.push({ x: j.x + d.x * L2, y: j.y + d.y * L2 });
    }
    // cumulative lengths for signal travel
    const lens = [0];
    for (let i = 1; i < pts.length; i++) {
      lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    }
    return { pts, lens, total: lens[lens.length - 1] };
  }

  function makeChip(cx, cy, pinsPerSide, sides) {
    const spacing = 11;
    const size = pinsPerSide * spacing + 18;
    const chip = { x: cx - size / 2, y: cy - size / 2, size };
    chips.push(chip);
    const dirs = {
      left:   { d: { x: -1, y: 0 }, perp: { x: 0, y: 1 } },
      right:  { d: { x: 1, y: 0 },  perp: { x: 0, y: 1 } },
      top:    { d: { x: 0, y: -1 }, perp: { x: 1, y: 0 } },
      bottom: { d: { x: 0, y: 1 },  perp: { x: 1, y: 0 } }
    };
    sides.forEach(side => {
      const { d, perp } = dirs[side];
      for (let i = 0; i < pinsPerSide; i++) {
        const o = (i - (pinsPerSide - 1) / 2) * spacing;
        const start = {
          x: cx + d.x * size / 2 + perp.x * o,
          y: cy + d.y * size / 2 + perp.y * o
        };
        traces.push(makeTrace(start, d, perp, o));
      }
    });
  }

  function build() {
    const r = host.getBoundingClientRect();
    W = r.width; H = r.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    chips = []; traces = []; signals = [];
    if (W >= 1400) {
      // wide desktop: two staggered columns of chips per side
      makeChip(W * 0.05, H * 0.18, 6, ['left', 'right', 'top', 'bottom']);
      makeChip(W * 0.15, H * 0.52, 5, ['left', 'right', 'top', 'bottom']);
      makeChip(W * 0.06, H * 0.86, 6, ['left', 'right', 'top', 'bottom']);
      makeChip(W * 0.95, H * 0.24, 6, ['left', 'right', 'top', 'bottom']);
      makeChip(W * 0.85, H * 0.60, 5, ['left', 'right', 'top', 'bottom']);
      makeChip(W * 0.94, H * 0.90, 5, ['left', 'right', 'top', 'bottom']);
    } else if (W >= 760) {
      // chips hug the side gutters so the content column stays calm
      makeChip(W * 0.07, H * 0.26, 6, ['left', 'right', 'top', 'bottom']);
      makeChip(W * 0.93, H * 0.34, 6, ['left', 'right', 'top', 'bottom']);
      makeChip(W * 0.06, H * 0.80, 5, ['left', 'right', 'top', 'bottom']);
      makeChip(W * 0.94, H * 0.74, 5, ['left', 'right', 'top', 'bottom']);
    } else {
      makeChip(W * 0.12, H * 0.22, 4, ['left', 'right', 'top', 'bottom']);
      makeChip(W * 0.88, H * 0.78, 4, ['left', 'right', 'top', 'bottom']);
    }

    const count = Math.round(traces.length * 0.45);
    for (let i = 0; i < count; i++) signals.push(newSignal(true));
    drawStatic();
    if (reduced) render(); // static frame only
  }

  function newSignal(randomStart) {
    const t = traces[(Math.random() * traces.length) | 0];
    return {
      t,
      pos: randomStart ? rand(-t.total, t.total) : rand(-200, 0), // negative = waiting
      speed: rand(70, 170),
      len: rand(26, 60)
    };
  }

  function pointAt(tr, dist) {
    dist = Math.max(0, Math.min(tr.total, dist));
    for (let i = 1; i < tr.pts.length; i++) {
      if (dist <= tr.lens[i]) {
        const a = tr.pts[i - 1], b = tr.pts[i];
        const seg = tr.lens[i] - tr.lens[i - 1] || 1;
        const f = (dist - tr.lens[i - 1]) / seg;
        return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, i };
      }
    }
    const e = tr.pts[tr.pts.length - 1];
    return { x: e.x, y: e.y, i: tr.pts.length - 1 };
  }

  // Static layer (traces, pads, chips) cached to an offscreen canvas
  let staticLayer = null;
  function drawStatic() {
    staticLayer = document.createElement('canvas');
    staticLayer.width = canvas.width; staticLayer.height = canvas.height;
    const s = staticLayer.getContext('2d');
    s.setTransform(ctx.getTransform());
    s.lineWidth = 1; s.lineJoin = 'round'; s.lineCap = 'round';
    s.strokeStyle = C.trace;
    traces.forEach(tr => {
      s.beginPath();
      tr.pts.forEach((p, i) => i ? s.lineTo(p.x, p.y) : s.moveTo(p.x, p.y));
      s.stroke();
      const e = tr.pts[tr.pts.length - 1];
      s.beginPath(); s.arc(e.x, e.y, 2.2, 0, Math.PI * 2);
      s.strokeStyle = C.pad; s.stroke(); s.strokeStyle = C.trace;
    });
    chips.forEach(c => {
      s.fillStyle = C.chipBg; s.strokeStyle = C.chipLn;
      s.fillRect(c.x, c.y, c.size, c.size);
      s.strokeRect(c.x + 0.5, c.y + 0.5, c.size - 1, c.size - 1);
      // Art Deco inner detail: inset frame + centre diamond
      s.strokeStyle = 'rgba(201,168,76,0.22)';
      s.strokeRect(c.x + 5.5, c.y + 5.5, c.size - 11, c.size - 11);
      const m = c.x + c.size / 2, n = c.y + c.size / 2, r = 5;
      s.fillStyle = 'rgba(201,168,76,0.55)';
      s.beginPath(); s.moveTo(m, n - r); s.lineTo(m + r, n); s.lineTo(m, n + r); s.lineTo(m - r, n); s.closePath(); s.fill();
      s.strokeStyle = C.trace;
    });
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(staticLayer, 0, 0);
    ctx.restore();

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = C.glow; ctx.shadowBlur = 8;
    signals.forEach(sg => {
      if (sg.pos <= 0) return;
      const head = Math.min(sg.pos, sg.t.total);
      const tail = Math.max(0, sg.pos - sg.len);
      if (tail >= sg.t.total) return;
      const a = pointAt(sg.t, tail), b = pointAt(sg.t, head);
      ctx.beginPath(); ctx.moveTo(a.x, a.y);
      for (let i = a.i; i < b.i; i++) ctx.lineTo(sg.t.pts[i].x, sg.t.pts[i].y);
      ctx.lineTo(b.x, b.y);
      const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      g.addColorStop(0, 'rgba(232,208,128,0)');
      g.addColorStop(1, C.signal);
      ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.beginPath(); ctx.arc(b.x, b.y, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = C.signal; ctx.fill();
    });
    ctx.shadowBlur = 0;
  }

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    signals.forEach((sg, i) => {
      sg.pos += sg.speed * dt;
      if (sg.pos - sg.len > sg.t.total) signals[i] = newSignal(false);
    });
    render();
    rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (running || reduced) return;
    running = true; last = performance.now();
    rafId = requestAnimationFrame(tick);
  }
  function stop() { running = false; cancelAnimationFrame(rafId); }

  build();
  // fixed full-page layer: run always, pause when the tab is hidden
  start();
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  let rt;
  new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(build, 150); }).observe(host);
})();

// ── Smooth scroll for anchor links ─────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});
