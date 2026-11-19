// Minimal 2D coordinate-plane helper for canvas lessons.
// Matrices are [[a, b], [c, d]] (row-major); vectors are [x, y].

const LA = {
  mul: (M, v) => [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1]],
  mm: (A, B) => [
    [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
    [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]],
  ],
  det: (M) => M[0][0] * M[1][1] - M[0][1] * M[1][0],
  inv: (M) => {
    const d = LA.det(M);
    if (Math.abs(d) < 1e-9) return null;
    return [[M[1][1] / d, -M[0][1] / d], [-M[1][0] / d, M[0][0] / d]];
  },
  lerpM: (A, B, t) => A.map((r, i) => r.map((x, j) => x + (B[i][j] - x) * t)),
  I: () => [[1, 0], [0, 1]],
  fromCols: (c1, c2) => [[c1[0], c2[0]], [c1[1], c2[1]]],
  col: (M, j) => [M[0][j], M[1][j]],
  T: (M) => [[M[0][0], M[1][0]], [M[0][1], M[1][1]]],
  rot: (a) => [[Math.cos(a), -Math.sin(a)], [Math.sin(a), Math.cos(a)]],
  norm: (v) => Math.hypot(v[0], v[1]),
  // Real eigen-decomposition of a 2x2 matrix. Returns {vals, vecs} or {complex:true}.
  eig: (M) => {
    const tr = M[0][0] + M[1][1], d = LA.det(M);
    const disc = tr * tr / 4 - d;
    if (disc < -1e-9) return { complex: true, re: tr / 2, im: Math.sqrt(-disc) };
    const s = Math.sqrt(Math.max(disc, 0));
    const vals = [tr / 2 + s, tr / 2 - s];
    const vecs = vals.map((l, i) => {
      // (M - lI) v = 0  ->  v is perpendicular to the larger row of (M - lI)
      const a = M[0][0] - l, b = M[0][1], c = M[1][0], dd = M[1][1] - l;
      let v = Math.abs(b) + Math.abs(a) >= Math.abs(c) + Math.abs(dd) ? [-b, a] : [-dd, c];
      if (LA.norm(v) < 1e-9) v = i === 0 ? [1, 0] : [0, 1]; // M is a multiple of I
      const n = LA.norm(v);
      return [v[0] / n, v[1] / n];
    });
    return { vals, vecs };
  },
};

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const fmt = (x, d = 2) => {
  const v = Math.abs(x) < 0.5 * Math.pow(10, -d) ? 0 : x;
  return v.toFixed(d);
};

class Plane {
  // range = half-width of the view in world units; aspect = height / width; center = world point at the middle.
  constructor(canvas, { range = 5, onChange = null, aspect = 1, center = [0, 0] } = {}) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.range = range;
    this.aspect = aspect;
    this.center = center;
    this.handles = [];
    this.drag = null;
    this.onChange = onChange;
    this.draw = () => {};
    this.resize();
    new ResizeObserver(() => { this.resize(); this.draw(); }).observe(canvas);

    canvas.addEventListener("pointerdown", (e) => {
      const p = this.evt(e);
      let best = null, bd = 18;
      for (const h of this.handles) {
        if (h.enabled && !h.enabled()) continue;
        const s = this.toS(h.get());
        const d = Math.hypot(s[0] - p[0], s[1] - p[1]);
        if (d < bd) { bd = d; best = h; }
      }
      if (best) {
        this.drag = best;
        canvas.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      const p = this.evt(e);
      if (this.drag) {
        let w = this.toW(p);
        const snap = (x) => (Math.abs(x * 2 - Math.round(x * 2)) < 0.08 ? Math.round(x * 2) / 2 : x);
        const [cx, cy] = this.center, ry = this.range * this.aspect;
        w = [snap(w[0]), snap(w[1])];
        w = [Math.max(cx - this.range, Math.min(cx + this.range, w[0])), Math.max(cy - ry, Math.min(cy + ry, w[1]))];
        this.drag.set(w);
        this.onChange && this.onChange();
      } else {
        const hit = this.handles.some((h) => {
          if (h.enabled && !h.enabled()) return false;
          const s = this.toS(h.get());
          return Math.hypot(s[0] - p[0], s[1] - p[1]) < 18;
        });
        canvas.style.cursor = hit ? "grab" : "default";
      }
    });
    const end = () => { this.drag = null; };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
  }

  evt(e) {
    const r = this.c.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.c.clientWidth || 400;
    this.c.width = Math.round(w * dpr);
    this.c.height = Math.round(w * this.aspect * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w; this.h = w * this.aspect;
    this.scale = w / (2 * this.range);
  }

  // Change the visible window without resizing the canvas.
  setView(range, center = this.center) {
    this.range = range;
    this.center = center;
    this.scale = this.w / (2 * range);
  }

  // Visible world rectangle: [xmin, xmax, ymin, ymax]
  bounds() {
    const [cx, cy] = this.center, ry = this.range * this.aspect;
    return [cx - this.range, cx + this.range, cy - ry, cy + ry];
  }

  toS(v) { return [this.w / 2 + (v[0] - this.center[0]) * this.scale, this.h / 2 - (v[1] - this.center[1]) * this.scale]; }
  toW(p) { return [(p[0] - this.w / 2) / this.scale + this.center[0], -(p[1] - this.h / 2) / this.scale + this.center[1]]; }

  clear() {
    const ctx = this.ctx;
    ctx.fillStyle = cssVar("--canvas");
    ctx.fillRect(0, 0, this.w, this.h);
  }

  // Draw the integer grid of the basis given by matrix M's columns.
  grid(M, color, width = 1, N = 24) {
    const ctx = this.ctx;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let k = -N; k <= N; k++) {
      for (const [p, q] of [[[k, -N], [k, N]], [[-N, k], [N, k]]]) {
        const a = this.toS(LA.mul(M, p)), b = this.toS(LA.mul(M, q));
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
      }
    }
    ctx.stroke();
  }

  axes(color) {
    const ctx = this.ctx;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    const o = this.toS([0, 0]);
    ctx.beginPath();
    ctx.moveTo(0, o[1]); ctx.lineTo(this.w, o[1]);
    ctx.moveTo(o[0], 0); ctx.lineTo(o[0], this.h);
    ctx.stroke();
  }

  // Light grid + numbered ticks at a "nice" spacing for the current zoom (for function graphs).
  ticks(gridColor, textColor) {
    const [x0, x1, y0, y1] = this.bounds();
    const raw = (x1 - x0) / 8, p = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw);
    const ctx = this.ctx, o = this.toS([0, 0]);
    const dec = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
    ctx.save();
    ctx.strokeStyle = gridColor; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) { const s = this.toS([x, 0]); ctx.moveTo(s[0], 0); ctx.lineTo(s[0], this.h); }
    for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) { const s = this.toS([0, y]); ctx.moveTo(0, s[1]); ctx.lineTo(this.w, s[1]); }
    ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.font = "11px ui-monospace, Consolas, monospace";
    const ly = Math.min(this.h - 4, Math.max(12, o[1] + 13)), lx = Math.min(this.w - 30, Math.max(4, o[0] + 4));
    for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) {
      if (Math.abs(x) < step / 2) continue;
      ctx.fillText(x.toFixed(dec), this.toS([x, 0])[0] + 2, ly);
    }
    for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
      if (Math.abs(y) < step / 2) continue;
      ctx.fillText(y.toFixed(dec), lx, this.toS([0, y])[1] - 2);
    }
    ctx.restore();
  }

  // Polyline through world points; null entries break the line.
  polyline(pts, color, width = 1.5, alpha = 1) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = "round";
    ctx.beginPath();
    let pen = false;
    for (const p of pts) {
      if (!p) { pen = false; continue; }
      const s = this.toS(p);
      pen ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]);
      pen = true;
    }
    ctx.stroke();
    ctx.restore();
  }

  // Graph y = f(x) over [xa, xb] (defaults to the view), breaking at jumps / non-finite values.
  curve(f, color, width = 2.5, xa = null, xb = null, n = 1500) {
    const [x0, x1, y0, y1] = this.bounds();
    xa = xa ?? x0; xb = xb ?? x1;
    const H = y1 - y0, pts = [];
    // Is there a jump between x0 and x1? Bisect: for a continuous f the gap shrinks, for a jump it doesn't.
    const isJump = (xl, yl, xr, yr) => {
      const gap0 = Math.abs(yr - yl);
      for (let it = 0; it < 40; it++) {
        const xm = (xl + xr) / 2, ym = f(xm);
        if (!isFinite(ym)) return true;
        if (Math.abs(ym - yl) > Math.abs(yr - ym)) { xr = xm; yr = ym; } else { xl = xm; yl = ym; }
      }
      return Math.abs(yr - yl) > gap0 * 0.5;
    };
    let prev = null;
    for (let k = 0; k <= n; k++) {
      const x = xa + ((xb - xa) * k) / n, y = f(x);
      if (!isFinite(y) || Math.abs(y - (y0 + y1) / 2) > H * 20) { pts.push(null); prev = null; continue; }
      if (prev !== null && Math.abs(y - prev[1]) > H * 0.03 && isJump(prev[0], prev[1], x, y)) pts.push(null); // don't connect across a jump
      pts.push([x, y]);
      prev = [x, y];
    }
    this.polyline(pts, color, width);
  }

  lineThrough(dir, color, width = 1.5, dash = [6, 5]) {
    const n = LA.norm(dir);
    if (n < 1e-9) return;
    const L = this.range * 3;
    const a = this.toS([-dir[0] / n * L, -dir[1] / n * L]), b = this.toS([dir[0] / n * L, dir[1] / n * L]);
    const ctx = this.ctx;
    ctx.save();
    ctx.setLineDash(dash);
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.restore();
  }

  segment(p, q, color, width = 1.5, dash = []) {
    const ctx = this.ctx, a = this.toS(p), b = this.toS(q);
    ctx.save();
    ctx.setLineDash(dash);
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.restore();
  }

  poly(pts, fill) {
    const ctx = this.ctx;
    ctx.fillStyle = fill;
    ctx.beginPath();
    pts.forEach((p, i) => { const s = this.toS(p); i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]); });
    ctx.closePath();
    ctx.fill();
  }

  arrow(from, to, color, width = 3, label = null) {
    const ctx = this.ctx, a = this.toS(from), b = this.toS(to);
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
    if (len > 1) {
      const ux = dx / len, uy = dy / len, hs = Math.min(13, len * 0.45);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0] - ux * hs * 0.8, b[1] - uy * hs * 0.8); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(b[0], b[1]);
      ctx.lineTo(b[0] - ux * hs - uy * hs * 0.5, b[1] - uy * hs + ux * hs * 0.5);
      ctx.lineTo(b[0] - ux * hs + uy * hs * 0.5, b[1] - uy * hs - ux * hs * 0.5);
      ctx.closePath(); ctx.fill();
    }
    if (label) this.label(to, label, color);
  }

  dot(p, color, r = 6, label = null, ring = false) {
    const ctx = this.ctx, s = this.toS(p);
    ctx.beginPath(); ctx.arc(s[0], s[1], r, 0, Math.PI * 2);
    if (ring) { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); }
    else { ctx.fillStyle = color; ctx.fill(); }
    if (label) this.label(p, label, color);
  }

  label(p, text, color, off = [10, -10]) {
    const ctx = this.ctx, s = this.toS(p);
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.lineWidth = 4;
    ctx.strokeStyle = cssVar("--canvas");
    ctx.strokeText(text, s[0] + off[0], s[1] + off[1]);
    ctx.fillStyle = color;
    ctx.fillText(text, s[0] + off[0], s[1] + off[1]);
  }

  corner(text, color) {
    const ctx = this.ctx;
    ctx.font = "13px ui-monospace, Consolas, monospace";
    ctx.fillStyle = color;
    ctx.fillText(text, 10, 20);
  }
}

// Render a 2x2 matrix as an HTML table with brackets.
function matHTML(M, caption, d = 2, highlightZeros = false) {
  const cell = (x) => {
    const z = highlightZeros && Math.abs(x) < 5e-3;
    return `<td class="${z ? "zero" : ""}">${fmt(x, d)}</td>`;
  };
  return `<div class="mat-wrap"><table class="mat">
    <tr>${cell(M[0][0])}${cell(M[0][1])}</tr>
    <tr>${cell(M[1][0])}${cell(M[1][1])}</tr></table>
    <div class="cap">${caption}</div></div>`;
}

// Simple animation helper: drives a range input from its value to `to`.
function animateRange(input, to, ms, onStep, done) {
  const from = parseFloat(input.value), t0 = performance.now();
  function step(now) {
    const k = Math.min(1, (now - t0) / ms);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    input.value = from + (to - from) * e;
    onStep();
    if (k < 1) requestAnimationFrame(step); else done && done();
  }
  requestAnimationFrame(step);
}
