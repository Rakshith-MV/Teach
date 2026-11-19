// Minimal 3D helper: 3x3 linear algebra + an orbit-camera canvas renderer.
// World coordinates are (x, y, z) with z pointing up. Matrices are row-major 3x3.

const L3 = {
  I: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  mul: (M, v) => [0, 1, 2].map((i) => M[i][0] * v[0] + M[i][1] * v[1] + M[i][2] * v[2]),
  col: (M, j) => [M[0][j], M[1][j], M[2][j]],
  lerp: (A, B, t) => A.map((r, i) => r.map((x, j) => x + (B[i][j] - x) * t)),
  det: (M) =>
    M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
    M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
    M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]),
  inv: (M) => {
    const d = L3.det(M);
    if (Math.abs(d) < 1e-9) return null;
    const R = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) {
        const a = (i + 1) % 3, b = (i + 2) % 3, c = (j + 1) % 3, e = (j + 2) % 3;
        R[j][i] = (M[a][c] * M[b][e] - M[a][e] * M[b][c]) / d; // cofactor C_ij, transposed
      }
    return R;
  },
  cross: (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]],
  norm: (v) => Math.hypot(v[0], v[1], v[2]),
  // Numerical rank of the columns (0..3).
  rank: (M, eps = 1e-3) => {
    if (Math.abs(L3.det(M)) > eps) return 3;
    const c = [0, 1, 2].map((j) => L3.col(M, j));
    for (const [p, q] of [[0, 1], [0, 2], [1, 2]]) if (L3.norm(L3.cross(c[p], c[q])) > eps) return 2;
    return c.some((v) => L3.norm(v) > eps) ? 1 : 0;
  },
};

class Space3D {
  constructor(canvas, { range = 3 } = {}) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.range = range;
    this.yaw = -0.75;
    this.pitch = 0.42;
    this.zoom = 1;
    this.draw = () => {};
    this.onOrbit = null;
    this.resize();
    new ResizeObserver(() => { this.resize(); this.draw(); }).observe(canvas);

    let last = null;
    canvas.addEventListener("pointerdown", (e) => {
      last = [e.clientX, e.clientY];
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
      this.onOrbit && this.onOrbit();
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!last) return;
      this.yaw -= (e.clientX - last[0]) * 0.01;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + (e.clientY - last[1]) * 0.01));
      last = [e.clientX, e.clientY];
      this.draw();
      this.onView && this.onView();
    });
    const end = () => { last = null; canvas.style.cursor = "grab"; };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    canvas.style.cursor = "grab";
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.zoom = Math.max(0.4, Math.min(3, this.zoom * Math.exp(-e.deltaY * 0.001)));
      this.draw();
      this.onView && this.onView();
    }, { passive: false });
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.c.clientWidth || 400;
    this.c.width = Math.round(w * dpr);
    this.c.height = Math.round(w * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w; this.h = w;
  }

  // Project a world point -> [screenX, screenY, depth] (larger depth = farther away).
  proj(p) {
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const x1 = cy * p[0] - sy * p[1], y1 = sy * p[0] + cy * p[1], z1 = p[2];
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const depth = cp * y1 - sp * z1, up = sp * y1 + cp * z1;
    const D = this.range * 5;
    const persp = D / (D + depth);
    const sc = (this.w / (2 * this.range * 1.25)) * this.zoom;
    return [this.w / 2 + x1 * sc * persp, this.h / 2 - up * sc * persp, depth];
  }

  // 0..1, 1 = nearest. Used to fade far-away lines.
  near(depth) {
    const R = this.range * 1.8;
    return Math.max(0, Math.min(1, 0.5 - depth / (2 * R)));
  }

  clear() {
    this.ctx.fillStyle = cssVar("--canvas");
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  line(a, b, color, width = 1, alpha = 1, dash = []) {
    const ctx = this.ctx, p = this.proj(a), q = this.proj(b);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.setLineDash(dash);
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
    ctx.restore();
  }

  poly(pts, fill, alpha) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.beginPath();
    pts.forEach((p, i) => { const s = this.proj(p); i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]); });
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  arrow(from, to, color, width = 3.5, label = null) {
    const ctx = this.ctx, a = this.proj(from), b = this.proj(to);
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    ctx.save();
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
    ctx.restore();
    if (label) this.label(to, label, color);
  }

  dot(p, color, r = 6, label = null, ring = false) {
    const ctx = this.ctx, s = this.proj(p);
    ctx.save();
    ctx.beginPath(); ctx.arc(s[0], s[1], r, 0, Math.PI * 2);
    if (ring) { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); }
    else { ctx.fillStyle = color; ctx.fill(); }
    ctx.restore();
    if (label) this.label(p, label, color);
  }

  label(p, text, color, off = [9, -9]) {
    const ctx = this.ctx, s = this.proj(p);
    ctx.save();
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.lineWidth = 4;
    ctx.strokeStyle = cssVar("--canvas");
    ctx.strokeText(text, s[0] + off[0], s[1] + off[1]);
    ctx.fillStyle = color;
    ctx.fillText(text, s[0] + off[0], s[1] + off[1]);
    ctx.restore();
  }

  corner(text, color) {
    const ctx = this.ctx;
    ctx.font = "13px ui-monospace, Consolas, monospace";
    ctx.fillStyle = color;
    ctx.fillText(text, 10, 20);
  }
}
