// How Neural Networks Learn: single layer, live-trained tiny MLP, gradient descent & preconditioning.
(() => {
  const $ = (id) => document.getElementById(id);
  const col = () => ({
    i: cssVar("--i"), j: cssVar("--j"), k: cssVar("--k"), v: cssVar("--v"), axis: cssVar("--axis"),
    grid: cssVar("--grid"), gridNew: cssVar("--grid-new"), accent: cssVar("--accent"),
    muted: cssVar("--muted"), ink: cssVar("--ink"), canvas: cssVar("--canvas"),
  });
  const hexRgb = (h) => {
    h = h.replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const lerpV = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
  const sigm = (z) => 1 / (1 + Math.exp(-z));
  const setActive = (sel, pred) => document.querySelectorAll(sel).forEach((b) => b.classList.toggle("active", pred(b)));

  function makeRng(seed) { // mulberry32
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const randn = (r) => Math.sqrt(-2 * Math.log(Math.max(r(), 1e-12))) * Math.cos(2 * Math.PI * r());

  // =====================================================================
  // 1. One layer
  // =====================================================================
  const ACT = {
    none: (z) => z,
    relu: (z) => Math.max(0, z),
    leaky: (z) => (z > 0 ? z : 0.15 * z),
    tanh: Math.tanh,
    sigmoid: sigm,
  };
  const NOTES = {
    none: `<b>No activation:</b> the result is just an affine map: a change of basis plus a shift. Grid lines stay straight,
      parallel and evenly spaced. Stacking more of these layers never gives anything new.`,
    relu: `<b>ReLU</b> sets negative coordinates to 0. Every point with a negative coordinate gets pressed flat onto an axis, and
      the whole bottom-left quadrant collapses to a single point. Space has been <b>folded</b>. That loses information, but it
      is also what lets a network create sharp corners and pieces of different shapes.`,
    leaky: `<b>Leaky ReLU</b> squeezes the negative side by a factor of 0.15 instead of zeroing it. The grid lines
      get a <b>kink</b> at the axes, but no two points merge, so the layer is still invertible.`,
    tanh: `<b>tanh</b> squashes every coordinate into (−1, 1), so the plane is squeezed into a square. Distant points get
      packed tightly near the edges. The grid lines <b>bend</b>, but nothing folds or tears, so this layer is
      invertible (when W is).`,
    sigmoid: `<b>sigmoid</b> is tanh shifted and scaled: everything is squeezed into the unit square (0, 1)². Its outputs are
      always positive, which is one reason tanh or ReLU is usually preferred in hidden layers.`,
  };
  const L1 = { W: [[1.2, -0.7], [0.6, 1.0]], b: [0.3, -0.2], act: "relu" };
  const sL = $("sL");
  const layerPlane = new Plane($("cvLayer"), { range: 4 });
  const DOM = 2.4;
  const dots = [];
  for (let a = 0; a <= 12; a++) for (let b = 0; b <= 12; b++) dots.push([-DOM + (2 * DOM * a) / 12, -DOM + (2 * DOM * b) / 12]);
  const dotColor = (p) => {
    const hue = ((Math.atan2(p[1], p[0]) * 180) / Math.PI + 360) % 360;
    const r = Math.hypot(p[0], p[1]) / (DOM * 1.42);
    return `hsl(${hue}, 75%, ${30 + 35 * r}%)`;
  };
  const gridLines = (dom, step, n) => {
    const lines = [];
    for (let k = -dom; k <= dom + 1e-9; k += step) {
      const v = [], h = [];
      for (let m = 0; m <= n; m++) {
        const t = -dom + (2 * dom * m) / n;
        v.push([k, t]); h.push([t, k]);
      }
      lines.push({ pts: v, dir: 0 }, { pts: h, dir: 1 });
    }
    return lines;
  };
  const lines1 = gridLines(DOM, 0.4, 60);

  function layerMap(p, s) {
    const z = [L1.W[0][0] * p[0] + L1.W[0][1] * p[1] + L1.b[0], L1.W[1][0] * p[0] + L1.W[1][1] * p[1] + L1.b[1]];
    if (s <= 1) return lerpV(p, z, s);
    const f = ACT[L1.act];
    return lerpV(z, [f(z[0]), f(z[1])], s - 1);
  }

  layerPlane.draw = () => {
    const c = col(), p = layerPlane, s = +sL.value;
    // Fixed zoom for this configuration: big enough for every stage.
    let m = 1;
    for (const st of [0, 1, 2]) for (const d of dots) { const q = layerMap(d, st); m = Math.max(m, Math.abs(q[0]), Math.abs(q[1])); }
    p.setView(m * 1.12, [0, 0]);
    p.clear();
    p.ticks(c.grid, c.muted);
    p.axes(c.axis);
    lines1.forEach((ln) => p.polyline(ln.pts.map((q) => layerMap(q, s)), ln.dir ? c.j : c.i, 1.2, 0.4));
    dots.forEach((d) => p.dot(layerMap(d, s), dotColor(d), 3.6));
    p.corner(s < 1 ? "stage: Wx + b" : `stage: σ = ${L1.act}`, c.muted);
  };

  function update1(fromInputs = false) {
    if (!fromInputs) {
      [["w00", 0, 0], ["w01", 0, 1], ["w10", 1, 0], ["w11", 1, 1]].forEach(([id, r, k]) => ($(id).value = L1.W[r][k]));
      $("b0").value = L1.b[0]; $("b1").value = L1.b[1];
    }
    setActive("#actBtns button", (b) => b.dataset.act === L1.act);
    $("layerNote").innerHTML = NOTES[L1.act];
    layerPlane.draw();
  }
  [["w00", 0, 0], ["w01", 0, 1], ["w10", 1, 0], ["w11", 1, 1]].forEach(([id, r, k]) =>
    $(id).addEventListener("input", (e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) { L1.W[r][k] = v; update1(true); } }));
  [0, 1].forEach((n) => $(`b${n}`).addEventListener("input", (e) => {
    const v = parseFloat(e.target.value); if (!isNaN(v)) { L1.b[n] = v; update1(true); }
  }));
  $("actBtns").addEventListener("click", (e) => {
    if (!e.target.dataset.act) return;
    L1.act = e.target.dataset.act;
    sL.value = 0; update1();
    animateRange(sL, 2, 2200, () => layerPlane.draw());
  });
  sL.addEventListener("input", () => layerPlane.draw());
  $("playL").addEventListener("click", () => { sL.value = 0; animateRange(sL, 2, 2200, () => layerPlane.draw()); });
  update1();

  // =====================================================================
  // 2. A tiny network trained live
  // =====================================================================
  const N = 200;
  function makeData(kind) {
    const r = makeRng(kind.length * 7919 + 3), X = [], Y = [];
    for (let n = 0; n < N; n++) {
      const cls = n % 2;
      let x, y;
      if (kind === "moons") {
        const t = Math.PI * r();
        if (cls === 0) { x = Math.cos(t); y = Math.sin(t); } else { x = 1 - Math.cos(t); y = 0.5 - Math.sin(t); }
        x = (x - 0.5) * 1.7 + randn(r) * 0.12; y = (y - 0.25) * 1.7 + randn(r) * 0.12;
      } else if (kind === "xor") {
        do { x = (r() * 2 - 1) * 2; y = (r() * 2 - 1) * 2; } while (Math.abs(x) < 0.25 || Math.abs(y) < 0.25 || (x * y > 0) !== (cls === 1));
      } else { // circles
        const a = 2 * Math.PI * r(), rad = cls === 1 ? 0.85 * Math.sqrt(r()) : 1.45 + 0.55 * r();
        x = rad * Math.cos(a); y = rad * Math.sin(a);
      }
      X.push([x, y]); Y.push(cls);
    }
    return { X, Y };
  }

  const NET = { data: "moons", w: 2, L: 2, running: false, epoch: 0, hist: [], lr: 0.03 };
  let lay, th, g, m1, m2, adamT;
  let D = makeData(NET.data);

  function buildNet() {
    const w = NET.w, offs = [];
    let o = 0;
    for (let l = 0; l < NET.L; l++) {
      const fanIn = l ? w : 2;
      offs.push({ W: o, b: o + w * fanIn, fanIn });
      o += w * fanIn + w;
    }
    lay = { offs, u: o, c: o + w, n: o + w + 1 };
    th = new Float64Array(lay.n); g = new Float64Array(lay.n);
    m1 = new Float64Array(lay.n); m2 = new Float64Array(lay.n); adamT = 0;
    const r = makeRng((Math.random() * 1e9) | 0);
    offs.forEach(({ W, b, fanIn }) => {
      for (let k = 0; k < w * fanIn; k++) th[W + k] = randn(r) * Math.sqrt(1.5 / fanIn);
      for (let k = 0; k < w; k++) th[b + k] = randn(r) * 0.1;
    });
    for (let k = 0; k < w; k++) th[lay.u + k] = randn(r) * Math.sqrt(1 / w);
    th[lay.c] = 0;
    NET.epoch = 0; NET.hist = [];
  }

  function forward(x) {
    const w = NET.w, as = [x];
    let a = x;
    for (const { W, b, fanIn } of lay.offs) {
      const nx = new Array(w);
      for (let i = 0; i < w; i++) {
        let s = th[b + i];
        for (let j = 0; j < fanIn; j++) s += th[W + i * fanIn + j] * a[j];
        nx[i] = Math.tanh(s);
      }
      a = nx; as.push(a);
    }
    let logit = th[lay.c];
    for (let i = 0; i < w; i++) logit += th[lay.u + i] * a[i];
    return { as, logit };
  }

  function trainStep() {
    const w = NET.w;
    g.fill(0);
    let loss = 0, correct = 0;
    for (let n = 0; n < N; n++) {
      const { as, logit } = forward(D.X[n]);
      const y = D.Y[n], p = sigm(logit);
      loss -= y * Math.log(Math.max(p, 1e-12)) + (1 - y) * Math.log(Math.max(1 - p, 1e-12));
      if ((p > 0.5) === (y === 1)) correct++;
      const gl = (p - y) / N, aL = as[as.length - 1];
      let da = new Array(w);
      for (let i = 0; i < w; i++) { g[lay.u + i] += gl * aL[i]; da[i] = gl * th[lay.u + i]; }
      g[lay.c] += gl;
      for (let l = NET.L - 1; l >= 0; l--) {
        const { W, b, fanIn } = lay.offs[l], aOut = as[l + 1], aIn = as[l];
        const dz = da.map((d, i) => d * (1 - aOut[i] * aOut[i]));
        const prev = new Array(fanIn).fill(0);
        for (let i = 0; i < w; i++) {
          g[b + i] += dz[i];
          for (let j = 0; j < fanIn; j++) { g[W + i * fanIn + j] += dz[i] * aIn[j]; prev[j] += th[W + i * fanIn + j] * dz[i]; }
        }
        da = prev;
      }
    }
    // Adam
    adamT++;
    const b1 = 0.9, b2 = 0.999, c1 = 1 - Math.pow(b1, adamT), c2 = 1 - Math.pow(b2, adamT);
    for (let k = 0; k < lay.n; k++) {
      m1[k] = b1 * m1[k] + (1 - b1) * g[k];
      m2[k] = b2 * m2[k] + (1 - b2) * g[k] * g[k];
      th[k] -= (NET.lr * (m1[k] / c1)) / (Math.sqrt(m2[k] / c2) + 1e-8);
    }
    NET.epoch++;
    NET.loss = loss / N; NET.acc = correct / N;
    NET.hist.push(NET.loss);
    if (NET.hist.length > 4000) NET.hist = NET.hist.filter((_, k) => k % 2 === 0);
  }

  function evalStats() {
    let loss = 0, correct = 0;
    for (let n = 0; n < N; n++) {
      const p = sigm(forward(D.X[n]).logit), y = D.Y[n];
      loss -= y * Math.log(Math.max(p, 1e-12)) + (1 - y) * Math.log(Math.max(1 - p, 1e-12));
      if ((p > 0.5) === (y === 1)) correct++;
    }
    NET.loss = loss / N; NET.acc = correct / N;
  }

  // Partially apply the network: stage s in [0, L]. Each layer = first half linear, second half tanh.
  function stageMap(x, s) {
    const w = NET.w;
    let h = w === 3 ? [x[0], x[1], 0] : [x[0], x[1]];
    let a = x;
    for (let l = 0; l < NET.L; l++) {
      if (s <= l) break;
      const f = Math.min(1, s - l), { W, b, fanIn } = lay.offs[l];
      const z = new Array(w);
      for (let i = 0; i < w; i++) {
        let t = th[b + i];
        for (let j = 0; j < fanIn; j++) t += th[W + i * fanIn + j] * a[j];
        z[i] = t;
      }
      const az = z.map(Math.tanh);
      if (f < 1) { h = f <= 0.5 ? lerpV(h, z, f * 2) : lerpV(z, az, f * 2 - 1); break; }
      h = az; a = az;
    }
    return h;
  }

  const inPlane = new Plane($("cvInput"), { range: 3 });
  const hidPlane = new Plane($("cvHidden"), { range: 1.5 });
  const hid3 = new Space3D($("cvHidden3"), { range: 1.5 });
  const sH = $("sH");
  const lines2 = gridLines(3, 0.5, 40);
  const heat = document.createElement("canvas");
  heat.width = heat.height = 64;

  function paintHeat(plane, probAt) {
    const c = col(), c0 = hexRgb(c.j), c1 = hexRgb(c.i), bg = hexRgb(c.canvas);
    const ctx = heat.getContext("2d"), img = ctx.createImageData(64, 64);
    const [x0, x1, y0, y1] = plane.bounds();
    for (let py = 0; py < 64; py++)
      for (let px = 0; px < 64; px++) {
        const x = x0 + ((px + 0.5) / 64) * (x1 - x0), y = y1 - ((py + 0.5) / 64) * (y1 - y0);
        const p = probAt([x, y]), a = 0.12 + 0.3 * Math.abs(2 * p - 1);
        const cc = p > 0.5 ? c1 : c0, k = (py * 64 + px) * 4;
        for (let ch = 0; ch < 3; ch++) img.data[k + ch] = bg[ch] * (1 - a) + cc[ch] * a;
        img.data[k + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
    plane.ctx.save();
    plane.ctx.imageSmoothingEnabled = true;
    plane.ctx.drawImage(heat, 0, 0, plane.w, plane.h);
    plane.ctx.restore();
  }

  function drawData(plane, pts) {
    const c = col(), ctx = plane.ctx;
    pts.forEach((q, n) => {
      const s = plane.toS(q);
      ctx.beginPath(); ctx.arc(s[0], s[1], 4.2, 0, 2 * Math.PI);
      ctx.fillStyle = D.Y[n] ? c.i : c.j; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = c.canvas; ctx.stroke();
    });
  }

  inPlane.draw = () => {
    const c = col(), p = inPlane;
    p.clear();
    paintHeat(p, (x) => sigm(forward(x).logit));
    p.axes(c.axis);
    drawData(p, D.X);
    p.corner("input features (x₁, x₂)", c.muted);
  };

  // 3D plane u·h + c = 0 clipped to a cube of half-size R.
  function planeInCube(u, c0, R) {
    const V = [];
    for (let a = 0; a < 8; a++) V.push([a & 1 ? R : -R, a & 2 ? R : -R, a & 4 ? R : -R]);
    const f = (p) => u[0] * p[0] + u[1] * p[1] + u[2] * p[2] + c0, pts = [];
    for (let a = 0; a < 8; a++)
      for (const bit of [1, 2, 4]) {
        const b = a | bit;
        if (b === a) continue;
        const fa = f(V[a]), fb = f(V[b]);
        if ((fa > 0) !== (fb > 0)) { const t = fa / (fa - fb); pts.push(lerpV(V[a], V[b], t)); }
      }
    if (pts.length < 3) return [];
    const cen = pts.reduce((s, p) => s.map((x, i) => x + p[i] / pts.length), [0, 0, 0]);
    const n = u, e1 = L3.norm(L3.cross(n, [1, 0, 0])) > 1e-3 ? L3.cross(n, [1, 0, 0]) : L3.cross(n, [0, 1, 0]);
    const e2 = L3.cross(n, e1);
    const ang = (p) => { const d = p.map((x, i) => x - cen[i]); return Math.atan2(d.reduce((s, x, i) => s + x * e2[i], 0), d.reduce((s, x, i) => s + x * e1[i], 0)); };
    return pts.sort((p, q) => ang(p) - ang(q));
  }

  function drawHidden() {
    const c = col(), s = +sH.value, last = s >= NET.L - 1e-3;
    const pts = D.X.map((x) => stageMap(x, s));
    let m = 1;
    pts.forEach((q) => q.forEach((v) => (m = Math.max(m, Math.abs(v)))));
    $("sHval").textContent = s < 1e-3 ? "input" : last ? `layer ${NET.L} (last)` : `layer ${Math.floor(s) + (s % 1 > 0.5 ? 1 : 0)}${s % 1 > 1e-3 && s % 1 <= 0.5 ? " (linear part)" : ""}`;
    const u = Array.from(th.slice(lay.u, lay.u + NET.w)), c0 = th[lay.c];

    if (NET.w === 2) {
      const p = hidPlane;
      p.setView(m * 1.15, [0, 0]);
      p.clear();
      if (last) paintHeat(p, (h) => sigm(u[0] * h[0] + u[1] * h[1] + c0));
      p.axes(c.axis);
      lines2.forEach((ln) => p.polyline(ln.pts.map((q) => stageMap(q, s)), c.gridNew, 1, 0.9));
      if (last) {
        const nu = u[0] * u[0] + u[1] * u[1];
        if (nu > 1e-9) {
          const p0 = [(-c0 * u[0]) / nu, (-c0 * u[1]) / nu], d = [-u[1] * 100, u[0] * 100];
          p.segment([p0[0] - d[0], p0[1] - d[1]], [p0[0] + d[0], p0[1] + d[1]], c.ink, 2.5);
        }
      }
      drawData(p, pts);
      p.corner(last ? "black line = decision boundary" : "hidden coordinates (h₁, h₂)", c.muted);
    } else {
      const sp = hid3;
      sp.range = m * 1.1;
      sp.clear();
      const R = m * 1.05;
      [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((e, n) => {
        sp.line(e.map((x) => -x * R), e.map((x) => x * R), c.axis, 1.1, 0.7);
        sp.label(e.map((x) => x * R), ["h₁", "h₂", "h₃"][n], c.muted, [4, 4]);
      });
      lines2.forEach((ln) => {
        const q = ln.pts.map((x) => stageMap(x, s));
        for (let k = 1; k < q.length; k++) sp.line(q[k - 1], q[k], c.gridNew, 1, 0.6);
      });
      if (last) {
        const poly = planeInCube(u, c0, Math.min(R, 1.05));
        if (poly.length) {
          sp.poly(poly, c.ink, 0.14);
          for (let k = 0; k < poly.length; k++) sp.line(poly[k], poly[(k + 1) % poly.length], c.ink, 1.5, 0.8);
        }
      }
      pts.forEach((q, n) => sp.dot(q, D.Y[n] ? c.i : c.j, 3.6));
      sp.corner(last ? "grey plane = decision boundary · drag to orbit" : "drag to orbit", c.muted);
    }
  }
  hidPlane.draw = drawHidden;
  hid3.draw = drawHidden;

  function drawLoss() {
    const cv = $("cvLoss"), dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext("2d"), c = col();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = c.canvas; ctx.fillRect(0, 0, W, H);
    const h = NET.hist;
    ctx.fillStyle = c.muted; ctx.font = "11px ui-monospace, Consolas, monospace";
    ctx.fillText("training loss (log scale)", 8, 14);
    if (h.length < 2) return;
    const lo = Math.log10(Math.max(1e-3, Math.min(...h))), hi = Math.log10(Math.max(...h)) + 0.05;
    ctx.strokeStyle = c.accent; ctx.lineWidth = 2; ctx.beginPath();
    h.forEach((v, k) => {
      const x = 6 + ((W - 12) * k) / (h.length - 1), y = H - 6 - ((H - 24) * (Math.log10(Math.max(v, 1e-3)) - lo)) / Math.max(hi - lo, 1e-6);
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
  }

  function updateStats() {
    $("trainStats").innerHTML = `step ${NET.epoch} · loss ${NET.loss.toFixed(3)} · accuracy <b>${(NET.acc * 100).toFixed(0)}%</b>`;
    let note;
    if (NET.data === "circles" && NET.w === 2) {
      note = `<b>Topology gets in the way.</b> If a layer only <em>bends</em> the plane like a rubber sheet (an invertible matrix
        followed by tanh: stretched, but never torn or glued), the orange disk stays <em>surrounded</em> by the blue ring and no
        straight line can separate them. To win with 2 neurons the network has to <b>cheat</b>: it pushes tanh into
        saturation, crushing large parts of the ring flat into a corner (look at the hidden view: the ring is no longer a ring).
        This takes thousands of steps, and the boundary in input space usually leaks out in a strange stripe.
        <b>Now switch to 3 neurons</b> and compare how quickly it trains.`;
    } else if (NET.w === 3) {
      note = `<b>Three neurons = three dimensions.</b> The network can now lift one class above the other, and a flat plane slices
        between them. Drag the right-hand view to look from the side. This "add a dimension, then cut flat" idea is the same as the
        kernel trick.`;
    } else {
      note = `Press <b>Train</b>, then drag the layer slider back and forth. Each layer bends the data a little more, until at the
        last layer a <b>straight line</b> separates the classes, even though the boundary in input space is curved.`;
    }
    if (NET.epoch > 1500 && NET.acc < 0.95)
      note += `<div style="margin-top:8px"><b class="warn">Stuck?</b> The loss surface of a network isn't a single bowl. It has
        flat regions and poor local minima, and this run has landed in one. Press <b>New random weights</b> and train again.
        Different starting points give different solutions.</div>`;
    $("trainNote").innerHTML = note;
  }

  function redraw2() { inPlane.draw(); drawHidden(); drawLoss(); updateStats(); }

  function resetNet() {
    buildNet();
    evalStats();
    sH.max = NET.L;
    sH.value = NET.L;
    $("cvHidden").hidden = NET.w === 3;
    $("cvHidden3").hidden = NET.w !== 3;
    setActive("#dataBtns button", (b) => b.dataset.d === NET.data);
    setActive("#widthBtns button", (b) => +b.dataset.w === NET.w);
    setActive("#depthBtns button", (b) => +b.dataset.l === NET.L);
    redraw2();
  }

  function loop() {
    if (!NET.running) return;
    for (let k = 0; k < 4; k++) trainStep();
    redraw2();
    if (NET.acc === 1 && NET.loss < 0.02) { setRunning(false); return; }
    requestAnimationFrame(loop);
  }
  function setRunning(on) {
    NET.running = on;
    $("trainBtn").textContent = on ? "⏸ Pause" : "▶ Train";
    $("trainBtn").classList.toggle("active", on);
    if (on) requestAnimationFrame(loop);
  }

  $("trainBtn").addEventListener("click", () => setRunning(!NET.running));
  $("stepBtn").addEventListener("click", () => { for (let k = 0; k < 10; k++) trainStep(); redraw2(); });
  $("resetBtn").addEventListener("click", () => { setRunning(false); resetNet(); });
  $("dataBtns").addEventListener("click", (e) => {
    if (!e.target.dataset.d) return;
    NET.data = e.target.dataset.d; D = makeData(NET.data); setRunning(false); resetNet();
  });
  $("widthBtns").addEventListener("click", (e) => {
    if (!e.target.dataset.w) return;
    NET.w = +e.target.dataset.w; setRunning(false); resetNet();
  });
  $("depthBtns").addEventListener("click", (e) => {
    if (!e.target.dataset.l) return;
    NET.L = +e.target.dataset.l; setRunning(false); resetNet();
  });
  sH.addEventListener("input", drawHidden);
  $("playH").addEventListener("click", () => { sH.value = 0; animateRange(sH, NET.L, 1300 * NET.L, drawHidden); });
  new ResizeObserver(drawLoss).observe($("cvLoss"));
  resetNet();

  // =====================================================================
  // 3. Gradient descent & preconditioning
  // =====================================================================
  const OPT = {
    gd: { name: "GD", color: "--i" },
    mom: { name: "Momentum", color: "--j" },
    adam: { name: "Adam", color: "--v" },
    diag: { name: "Rescale each feature", color: "--k" },
    white: { name: "Whiten", color: "--accent" },
  };
  const G = { w0: null };
  const gdPlane = new Plane($("cvGD"), { range: 5 });
  const gView = $("gView");
  const MAXIT = 300, TOL = 1e-6;

  function problem() {
    const kappa = Math.pow(10, +$("gK").value), th0 = (+$("gTh").value * Math.PI) / 180, en = +$("gEta").value;
    const R = LA.rot(th0), lam = [1, kappa];
    const H = LA.mm(LA.mm(R, [[lam[0], 0], [0, lam[1]]]), LA.T(R));
    if (!G.w0) G.w0 = LA.mul(R, [4.2, 0.8]);
    return { kappa, th0, en, R, lam, H };
  }
  const lossAt = (H, w) => 0.5 * (w[0] * (H[0][0] * w[0] + H[0][1] * w[1]) + w[1] * (H[1][0] * w[0] + H[1][1] * w[1]));
  const lamMax = (M) => { const e = LA.eig(M); return e.complex ? Math.hypot(e.re, e.im) : Math.max(Math.abs(e.vals[0]), Math.abs(e.vals[1])); };

  function run(key, P) {
    const { H, en, kappa } = P;
    let w = G.w0.slice(), v = [0, 0], m = [0, 0], s = [0, 0];
    const L0 = lossAt(H, w), path = [w.slice()], losses = [1];
    const Dg = [[1 / H[0][0], 0], [0, 1 / H[1][1]]], etaD = en / lamMax(LA.mm(Dg, H));
    const Hi = LA.inv(H);
    let steps = null, diverged = false;
    for (let k = 1; k <= MAXIT; k++) {
      const gr = LA.mul(H, w);
      if (key === "gd") w = [w[0] - (en / kappa) * gr[0], w[1] - (en / kappa) * gr[1]];
      else if (key === "mom") { v = [0.9 * v[0] + gr[0], 0.9 * v[1] + gr[1]]; w = [w[0] - (en / kappa) * v[0], w[1] - (en / kappa) * v[1]]; }
      else if (key === "adam") {
        const a = 0.12;
        m = m.map((x, i) => 0.9 * x + 0.1 * gr[i]);
        s = s.map((x, i) => 0.999 * x + 0.001 * gr[i] * gr[i]);
        const c1 = 1 - Math.pow(0.9, k), c2 = 1 - Math.pow(0.999, k);
        w = w.map((x, i) => x - (a * m[i] / c1) / (Math.sqrt(s[i] / c2) + 1e-8));
      } else if (key === "diag") { const d = LA.mul(Dg, gr); w = [w[0] - etaD * d[0], w[1] - etaD * d[1]]; }
      else { const d = LA.mul(Hi, gr); w = [w[0] - en * d[0], w[1] - en * d[1]]; }
      const L = lossAt(H, w) / L0;
      if (!isFinite(L) || L > 1e4) { diverged = true; break; }
      path.push(w.slice()); losses.push(L);
      if (steps === null && L < TOL) steps = k;
      if (steps !== null && k > steps + 3 && key !== "adam") break;
    }
    return { path, losses, steps, diverged };
  }

  // Display transform: blend from w to (scaled) whitened coordinates u = c·H^{1/2} w.
  function viewM(P) {
    const t = +gView.value, c = Math.pow(P.lam[0] * P.lam[1], -0.25);
    const Hs = LA.mm(LA.mm(P.R, [[Math.sqrt(P.lam[0]) * c, 0], [0, Math.sqrt(P.lam[1]) * c]]), LA.T(P.R));
    return LA.lerpM(LA.I(), Hs, t);
  }

  gdPlane.handles = [{
    get: () => LA.mul(viewM(problem()), G.w0),
    set: (p) => { const Vi = LA.inv(viewM(problem())); if (Vi) G.w0 = LA.mul(Vi, p); },
  }];
  gdPlane.onChange = () => updateGD();

  const enabled = () => [...document.querySelectorAll("#gOpt input")].filter((x) => x.checked).map((x) => x.dataset.o);

  function updateGD() {
    const P = problem(), c = col(), V = viewM(P), p = gdPlane;
    $("gKval").textContent = `${P.kappa.toFixed(1)}`;
    $("gThval").textContent = `${(+$("gTh").value).toFixed(0)}°`;
    $("gEtaval").textContent = `${P.en.toFixed(2)} (η = ${(P.en / P.kappa).toFixed(3)})`;

    const runs = {};
    Object.keys(OPT).forEach((k) => (runs[k] = run(k, P)));
    const on = enabled();

    // Contours
    p.clear();
    p.axes(c.axis);
    const L0 = lossAt(P.H, G.w0);
    for (let n = 0; n < 14; n++) {
      const lv = L0 * Math.pow(0.38, n - 1), pts = [];
      for (let k = 0; k <= 120; k++) {
        const ph = (2 * Math.PI * k) / 120;
        pts.push(LA.mul(V, LA.mul(P.R, [Math.sqrt((2 * lv) / P.lam[0]) * Math.cos(ph), Math.sqrt((2 * lv) / P.lam[1]) * Math.sin(ph)])));
      }
      p.polyline(pts, c.gridNew, n === 1 ? 1.8 : 1, 0.9);
    }
    p.dot([0, 0], c.ink, 4, "min");
    // Paths
    on.forEach((k) => {
      const color = cssVar(OPT[k].color), pts = runs[k].path.slice(0, 120).map((w) => LA.mul(V, w));
      p.polyline(pts, color, 2.2, 0.95);
      pts.slice(0, 40).forEach((q) => p.dot(q, color, 2.6));
    });
    p.dot(LA.mul(V, G.w0), c.ink, 7, "start");
    p.corner(+gView.value > 0.98 ? "whitened coordinates u" : +gView.value < 0.02 ? "original weights w" : "", c.muted);

    // Loss chart
    const cv = $("cvGDLoss"), dpr = window.devicePixelRatio || 1, W = cv.clientWidth, Ht = cv.clientHeight;
    cv.width = W * dpr; cv.height = Ht * dpr;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = c.canvas; ctx.fillRect(0, 0, W, Ht);
    const xs = (k) => 34 + ((W - 44) * k) / 200, ys = (L) => 10 + ((Ht - 30) * (2 - Math.max(-8, Math.min(2, Math.log10(L))))) / 10;
    ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.font = "10px ui-monospace, Consolas, monospace"; ctx.lineWidth = 1;
    for (let e = 2; e >= -8; e -= 2) { ctx.beginPath(); ctx.moveTo(34, ys(Math.pow(10, e))); ctx.lineTo(W - 10, ys(Math.pow(10, e))); ctx.stroke(); ctx.fillText(`1e${e}`, 2, ys(Math.pow(10, e)) + 3); }
    for (let k = 0; k <= 200; k += 50) ctx.fillText(String(k), xs(k) - 6, Ht - 6);
    on.forEach((k) => {
      const r = runs[k];
      ctx.strokeStyle = cssVar(OPT[k].color); ctx.lineWidth = 2; ctx.beginPath();
      r.losses.slice(0, 201).forEach((L, n) => (n ? ctx.lineTo(xs(n), ys(Math.max(L, 1e-12))) : ctx.moveTo(xs(n), ys(L))));
      if (r.diverged) ctx.lineTo(xs(r.losses.length), ys(1e3));
      ctx.stroke();
    });

    // Table + note
    $("gdTable").innerHTML = `<b>Steps to reach 10⁻⁶ × starting loss</b><table class="steps">` +
      Object.keys(OPT).map((k) => {
        const r = runs[k];
        const txt = r.diverged ? `<span class="warn">diverges</span>` : r.steps === null ? `> ${MAXIT}` : r.steps;
        return `<tr class="${on.includes(k) ? "" : "dim"}"><td><i class="sw" style="background:var(${OPT[k].color})"></i>${OPT[k].name}</td><td>${txt}</td></tr>`;
      }).join("") + `</table>`;

    const rate = Math.abs(1 - P.en / P.kappa), steep = Math.abs(1 - P.en);
    let note;
    if (P.en > 2) {
      note = `<b class="warn">η is too big.</b> In the steep direction each GD step multiplies the error by
        |1 − η·λ<sub>max</sub>| = ${steep.toFixed(2)} > 1, so it overshoots further every time and blows up. The steepest direction sets
        the speed limit: η < 2/λ<sub>max</sub>.`;
    } else if (P.kappa < 1.5) {
      note = `<b>Round bowl:</b> the gradient points straight at the minimum, so plain GD is already as good as it gets. Every
        method agrees.`;
    } else {
      note = `Along the <b>flat</b> direction GD only shrinks the error by a factor ${rate.toFixed(3)} per step, because η had to be
        small enough for the steep direction. More steps are needed as κ grows.
        <b>Whitening</b> changes the basis to make the bowl round (all λ = 1), so every direction converges at the same fast
        rate. ${+$("gTh").value === 0
          ? "With no tilt the ellipse is aligned with the axes, so <b>rescaling each feature</b> (standardization) is already a full whitening."
          : "With tilt (correlated features), rescaling each axis separately <b>can't</b> make the bowl round. You need to rotate as well, i.e. a full change of basis (PCA whitening)."}`;
    }
    $("gdNote").innerHTML = note;
  }

  ["gK", "gTh", "gEta", "gView"].forEach((id) => $(id).addEventListener("input", updateGD));
  $("gOpt").addEventListener("change", updateGD);
  $("gPresets").addEventListener("click", (e) => {
    if (!e.target.dataset.p) return;
    const [k, t, en] = e.target.dataset.p.split(",").map(Number);
    $("gK").value = Math.log10(k); $("gTh").value = t; $("gEta").value = en;
    G.w0 = null;
    updateGD();
  });
  $("playG").addEventListener("click", () => animateRange(gView, +gView.value > 0.5 ? 0 : 1, 1500, updateGD));
  new ResizeObserver(updateGD).observe($("cvGDLoss"));
  gdPlane.draw = updateGD;

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { layerPlane.draw(); redraw2(); updateGD(); });
  updateGD();
})();
