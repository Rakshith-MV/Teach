// Linear Transformations lesson: three interactive figures.
(() => {
  const $ = (id) => document.getElementById(id);
  const C = () => ({
    i: cssVar("--i"), j: cssVar("--j"), v: cssVar("--v"), grid: cssVar("--grid"),
    gridNew: cssVar("--grid-new"), axis: cssVar("--axis"), accent: cssVar("--accent"),
    muted: cssVar("--muted"), ink: cssVar("--ink"),
  });
  const vec = (v, d = 2) => `(${fmt(v[0], d)}, ${fmt(v[1], d)})`;

  // =====================================================================
  // Section 1: two readings of one matrix
  // =====================================================================
  const S1 = { A: [[2, 1], [1, 1.5]], v: [1.5, 0.5] };
  const t1 = $("t1");
  const inputs = [["m00", 0, 0], ["m01", 0, 1], ["m10", 1, 0], ["m11", 1, 1]];

  const active = new Plane($("cvActive"), { range: 5, onChange: () => update1() });
  const passive = new Plane($("cvPassive"), { range: 5, onChange: () => update1() });

  const setCol = (j, w) => { S1.A[0][j] = w[0]; S1.A[1][j] = w[1]; };
  const forceT1 = () => { if (parseFloat(t1.value) < 1) t1.value = 1; };

  active.handles = [
    { get: () => LA.col(LA.lerpM(LA.I(), S1.A, +t1.value), 0), set: (w) => { forceT1(); setCol(0, w); } },
    { get: () => LA.col(LA.lerpM(LA.I(), S1.A, +t1.value), 1), set: (w) => { forceT1(); setCol(1, w); } },
    { get: () => S1.v, set: (w) => { S1.v = w; } },
  ];
  passive.handles = [
    { get: () => LA.col(S1.A, 0), set: (w) => setCol(0, w) },
    { get: () => LA.col(S1.A, 1), set: (w) => setCol(1, w) },
    {
      get: () => LA.mul(S1.A, S1.v),
      set: (w) => { const Ai = LA.inv(S1.A); if (Ai) S1.v = LA.mul(Ai, w); },
    },
  ];

  function cell(p, M, alpha) {
    p.ctx.save();
    p.ctx.globalAlpha = alpha;
    p.poly([[0, 0], LA.mul(M, [1, 0]), LA.mul(M, [1, 1]), LA.mul(M, [0, 1])], C().accent);
    p.ctx.restore();
  }

  active.draw = () => {
    const c = C(), p = active, t = +t1.value, A = S1.A;
    const Mt = LA.lerpM(LA.I(), A, t);
    p.clear();
    p.grid(LA.I(), c.grid, 1);
    p.axes(c.axis);
    p.grid(Mt, c.gridNew, 1.3);
    cell(p, Mt, 0.16);
    const Av = LA.mul(A, S1.v), Mtv = LA.mul(Mt, S1.v);
    p.segment(S1.v, Av, c.v, 1.5, [4, 5]);
    p.dot(S1.v, c.v, 6, t < 0.02 ? `v = ${vec(S1.v, 1)}` : "v", true);
    p.arrow([0, 0], LA.mul(Mt, [1, 0]), c.i, 3.5, t > 0.98 ? "a₁ = Aî" : "î");
    p.arrow([0, 0], LA.mul(Mt, [0, 1]), c.j, 3.5, t > 0.98 ? "a₂ = Aĵ" : "ĵ");
    p.dot(Mtv, c.v, 7, t > 0.98 ? `Av = ${vec(Av, 1)}` : null);
    p.corner(`grid × (1−t)I + tA`, c.muted);
  };

  passive.draw = () => {
    const c = C(), p = passive, A = S1.A, [x, y] = S1.v;
    const a1 = LA.col(A, 0), a2 = LA.col(A, 1);
    const xa1 = [x * a1[0], x * a1[1]], P = LA.mul(A, S1.v);
    p.clear();
    p.grid(LA.I(), c.grid, 1.3);
    p.axes(c.axis);
    p.grid(A, c.gridNew, 1.3);
    cell(p, A, 0.16);
    p.segment([0, 0], xa1, c.i, 3, [7, 5]);
    p.segment(xa1, P, c.j, 3, [7, 5]);
    p.arrow([0, 0], a1, c.i, 3.5, "a₁");
    p.arrow([0, 0], a2, c.j, 3.5, "a₂");
    p.dot(P, c.v, 7, `${fmt(x, 1)}·a₁ + ${fmt(y, 1)}·a₂`);
    p.corner(`same point, two names`, c.muted);
  };

  function update1(fromInputs = false) {
    const A = S1.A;
    if (!fromInputs) inputs.forEach(([id, r, k]) => ($(id).value = +A[r][k].toFixed(2)));
    $("t1val").textContent = `t = ${(+t1.value).toFixed(2)}`;
    const d = LA.det(A), Ai = LA.inv(A), singular = Math.abs(d) < 1e-3;
    $("det1").innerHTML = singular
      ? `det A = ${fmt(d)} <span class="warn">→ columns are parallel: not a basis, not invertible</span>`
      : `det A = ${fmt(d)} <span class="ok">→ columns form a basis ✓ invertible</span>` +
        (d < 0 ? ` <span class="warn">(orientation flipped)</span>` : "");

    const [x, y] = S1.v, a1 = LA.col(A, 0), a2 = LA.col(A, 1), P = LA.mul(A, S1.v);
    let html = `<div class="big">The <span class="c-v">point</span> =
      <b>${fmt(x)}</b>·<span class="c-i">a₁</span> + <b>${fmt(y)}</b>·<span class="c-j">a₂</span>
      &nbsp;→&nbsp; its coordinates in the <b>new basis</b> are <b>${vec(S1.v)}</b></div>
      <div>= ${fmt(x)}·<span class="c-i">${vec(a1)}</span> + ${fmt(y)}·<span class="c-j">${vec(a2)}</span>
      = <b>${vec(P)}</b> &nbsp;→&nbsp; its coordinates in the <b>standard basis</b> (this is $Av$)</div>`;
    if (Ai) {
      html += `<div style="margin-top:6px">Going back: A⁻¹ = [[${fmt(Ai[0][0])}, ${fmt(Ai[0][1])}], [${fmt(Ai[1][0])}, ${fmt(Ai[1][1])}]]
        and A⁻¹·${vec(P)} = <b>${vec(LA.mul(Ai, P))}</b> <span class="ok">✓</span>
        A⁻¹ translates standard coordinates back into new-basis coordinates.</div>`;
    } else {
      html += `<div class="warn" style="margin-top:6px">No inverse: the whole plane is squashed onto a line,
        so different points end up at the same place. From the output alone you cannot tell which input it came from.</div>`;
    }
    $("coordsBox").innerHTML = html.replace("$Av$", "A·v");
    active.draw();
    passive.draw();
  }

  inputs.forEach(([id, r, k]) =>
    $(id).addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) { S1.A[r][k] = val; update1(true); }
    })
  );
  $("presets1").addEventListener("click", (e) => {
    const m = e.target.dataset.m;
    if (!m) return;
    const [a, b, c, d] = m.split(",").map(Number);
    S1.A = [[a, b], [c, d]];
    t1.value = 0;
    update1();
    animateRange(t1, 1, 1100, () => update1());
  });
  t1.addEventListener("input", () => update1());
  $("play1").addEventListener("click", () => {
    t1.value = 0;
    animateRange(t1, 1, 1400, () => update1());
  });

  // =====================================================================
  // Section 2: B = P^{-1} A P
  // =====================================================================
  const S2 = { A: [[2, 1], [1, 2]], basis: "eig", custom: [[1, -0.5], [0.4, 1]] };
  const t2 = $("t2");
  const sim = new Plane($("cvSim"), { range: 5 });

  function basisP() {
    if (S2.basis === "std") return { P: LA.I() };
    if (S2.basis === "skew") return { P: S2.custom };
    const e = LA.eig(S2.A);
    if (e.complex) return { P: LA.I(), fail: "complex" };
    const P = LA.fromCols(e.vecs[0], e.vecs[1]);
    if (Math.abs(LA.det(P)) < 1e-6) return { P: LA.I(), fail: "defective", dir: e.vecs[0] };
    return { P, eig: e };
  }

  sim.draw = () => {
    const c = C(), p = sim, t = +t2.value, A = S2.A;
    const { P } = basisP();
    const Mt = LA.lerpM(LA.I(), A, t);
    const G = LA.mm(Mt, P);
    p.clear();
    p.grid(LA.I(), c.grid, 1);
    p.axes(c.axis);
    const e = LA.eig(A);
    if (!e.complex) {
      p.lineThrough(e.vecs[0], c.muted, 1.5);
      if (Math.abs(LA.det(LA.fromCols(e.vecs[0], e.vecs[1]))) > 1e-6) p.lineThrough(e.vecs[1], c.muted, 1.5);
    }
    p.grid(G, c.gridNew, 1.4);
    cell(p, G, 0.16);
    if (t > 0.02) {
      p.ctx.save(); p.ctx.globalAlpha = 0.35;
      p.arrow([0, 0], LA.col(P, 0), c.i, 2);
      p.arrow([0, 0], LA.col(P, 1), c.j, 2);
      p.ctx.restore();
    }
    p.arrow([0, 0], LA.col(G, 0), c.i, 3.5, t > 0.98 ? "Ap₁" : "p₁");
    p.arrow([0, 0], LA.col(G, 1), c.j, 3.5, t > 0.98 ? "Ap₂" : "p₂");
    p.corner(e.complex ? "no real eigen-directions" : "dashed = eigen-directions of A", c.muted);
  };

  function update2() {
    $("t2val").textContent = `t = ${(+t2.value).toFixed(2)}`;
    document.querySelectorAll("#basis2 button").forEach((b) => b.classList.toggle("active", b.dataset.b === S2.basis));
    const A = S2.A, info = basisP(), P = info.P, Pi = LA.inv(P);
    const B = LA.mm(LA.mm(Pi, A), P);
    $("mats2").innerHTML =
      matHTML(A, "<b>A</b> · standard basis") +
      matHTML(P, "<b>P</b> · columns = new basis") +
      matHTML(B, "<b>B = P⁻¹AP</b> · same map, new basis", 2, true);

    const tr = (M) => M[0][0] + M[1][1];
    let note = "";
    if (info.fail === "complex") {
      note = `<span class="warn">This rotation has no real eigenvectors</span>: no line through the origin stays on itself,
        so no real basis makes it diagonal. (Its eigenvalues are complex: ${fmt(LA.eig(A).re)} ± ${fmt(LA.eig(A).im)}i.)
        Showing the standard basis instead.`;
    } else if (info.fail === "defective") {
      note = `<span class="warn">A shear has only one eigen-direction</span> (the dashed line). Two independent eigenvectors are
        needed to form a basis, so it can't be diagonalized. Showing the standard basis instead.`;
    } else if (S2.basis === "eig") {
      const [l1, l2] = info.eig.vals;
      note = `<b>B is diagonal.</b> In the eigenbasis, A just stretches: by <b>${fmt(l1)}</b> along
        <span class="c-i">p₁</span> and by <b>${fmt(l2)}</b> along <span class="c-j">p₂</span>.
        All the "mixing" in A came from describing it in the wrong coordinates.`;
    } else if (S2.basis === "std") {
      note = `In the standard basis, P = I and so B = A. Press <b>Eigenbasis</b> to see the same map look simpler.`;
    } else {
      note = `A different basis gives different numbers in B, but the geometry is unchanged.`;
    }
    note += `<div style="margin-top:8px" class="mono">det A = ${fmt(LA.det(A))}, det B = ${fmt(LA.det(B))} &nbsp;·&nbsp;
      trace A = ${fmt(tr(A))}, trace B = ${fmt(tr(B))}</div>
      <div class="hint">Determinant and trace come out the same in every basis: they belong to the transformation itself,
      not to the coordinates.</div>`;
    $("eigNote").innerHTML = note;
    sim.draw();
  }

  $("presets2").addEventListener("click", (e) => {
    const m = e.target.dataset.m;
    if (!m) return;
    const [a, b, c, d] = m.split(",").map(Number);
    S2.A = [[a, b], [c, d]];
    document.querySelectorAll("#presets2 button").forEach((x) => x.classList.toggle("active", x === e.target));
    t2.value = 0;
    update2();
  });
  $("basis2").addEventListener("click", (e) => {
    if (!e.target.dataset.b) return;
    S2.basis = e.target.dataset.b;
    t2.value = 0;
    update2();
  });
  t2.addEventListener("input", update2);
  $("play2").addEventListener("click", () => {
    animateRange(t2, +t2.value > 0.5 ? 0 : 1, 1400, update2);
  });
  document.querySelector('#presets2 button[data-m="2,1,1,2"]').classList.add("active");

  // =====================================================================
  // Section 3: PCA
  // =====================================================================
  const N = 240;
  let seed = 7;
  function rng() { // mulberry32
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  let Z = [];
  function sample() {
    Z = [];
    for (let k = 0; k < N; k++) {
      const u = Math.max(rng(), 1e-12), w = rng();
      const r = Math.sqrt(-2 * Math.log(u));
      Z.push([r * Math.cos(2 * Math.PI * w), r * Math.sin(2 * Math.PI * w)]);
    }
  }
  sample();

  const pca = new Plane($("cvPCA"), { range: 5 });
  const t3 = $("t3");

  function cov(X) {
    let mx = 0, my = 0;
    X.forEach((p) => { mx += p[0]; my += p[1]; });
    mx /= X.length; my /= X.length;
    let sxx = 0, sxy = 0, syy = 0;
    X.forEach((p) => {
      const a = p[0] - mx, b = p[1] - my;
      sxx += a * a; sxy += a * b; syy += b * b;
    });
    const n = X.length - 1;
    return [[sxx / n, sxy / n], [sxy / n, syy / n]];
  }

  function pcaState() {
    const th = (+$("pAngle").value * Math.PI) / 180, ratio = +$("pRatio").value;
    const S = [[1.7, 0], [0, 1.7 / ratio]];
    const M = LA.mm(LA.rot(th), S);
    let X = Z.map((z) => LA.mul(M, z));
    // center
    let mx = 0, my = 0;
    X.forEach((p) => { mx += p[0]; my += p[1]; });
    mx /= N; my /= N;
    X = X.map((p) => [p[0] - mx, p[1] - my]);

    const Sig = cov(X);
    const e = LA.eig(Sig);
    let v1 = e.vecs[0];
    if (v1[0] < 0) v1 = [-v1[0], -v1[1]];       // keep the rotation angle within ±90°
    const v2 = [-v1[1], v1[0]];                  // perpendicular, right-handed
    const lam = [Math.max(e.vals[0], 1e-9), Math.max(e.vals[1], 1e-9)];
    const phi = Math.atan2(v1[1], v1[0]);

    const project = $("pProject").checked, whiten = $("pWhiten").checked;
    if (project) X = X.map((p) => { const s = p[0] * v1[0] + p[1] * v1[1]; return [s * v1[0], s * v1[1]]; });

    const t = +t3.value;
    // Basis for measuring: rotate the axes from standard to principal, optionally rescale.
    const sc = whiten ? [1 + (Math.sqrt(lam[0]) - 1) * t, 1 + (Math.sqrt(lam[1]) - 1) * t] : [1, 1];
    const G = LA.mm(LA.rot(phi * t), [[sc[0], 0], [0, sc[1]]]);
    const Gi = LA.inv(G);
    const coords = X.map((p) => LA.mul(Gi, p));
    return { X, coords, G, Gi, v1, v2, lam, phi, project, whiten, t };
  }

  pca.draw = () => {
    const c = C(), p = pca, s = pcaState();
    // Passive view: the data stays put and the measuring axes change.
    p.clear();
    p.grid(LA.I(), c.grid, 1);
    p.grid(s.G, c.gridNew, 1.2);
    p.lineThrough(LA.col(s.G, 0), c.ink, 1.6, []);
    p.lineThrough(LA.col(s.G, 1), c.ink, 1.6, []);
    p.ctx.save();
    p.ctx.globalAlpha = 0.6;
    s.X.forEach((q) => p.dot(q, c.v, 2.8));
    p.ctx.restore();
    const k = 2;
    p.arrow([0, 0], [s.v1[0] * k * Math.sqrt(s.lam[0]), s.v1[1] * k * Math.sqrt(s.lam[0])], c.i, 3, "PC1");
    if (!s.project)
      p.arrow([0, 0], [s.v2[0] * k * Math.sqrt(s.lam[1]), s.v2[1] * k * Math.sqrt(s.lam[1])], c.j, 3, "PC2");
    const lbl = s.t > 0.98 ? ["z₁", "z₂"] : s.t < 0.02 ? ["feature 1", "feature 2"] : ["", ""];
    const g1 = LA.col(s.G, 0), g2 = LA.col(s.G, 1), n1 = LA.norm(g1), n2 = LA.norm(g2);
    p.label([g1[0] / n1 * 4.3, g1[1] / n1 * 4.3], lbl[0], c.ink, [-30, -8]);
    p.label([g2[0] / n2 * 4.3, g2[1] / n2 * 4.3], lbl[1], c.ink, [8, 10]);
    p.corner("black lines = axes we measure along", c.muted);
  };

  function update3() {
    const s = pcaState();
    const Cz = cov(s.coords);
    const rho = Cz[0][1] / Math.sqrt(Math.max(Cz[0][0] * Cz[1][1], 1e-12));
    const ev = s.lam[0] / (s.lam[0] + s.lam[1]);
    $("covBox").innerHTML =
      matHTML(Cz, "<b>Cov</b> of the coordinates we measure", 2, true) +
      `<div style="flex:1;min-width:180px">
         <div class="mono">correlation ρ = ${fmt(rho)}</div>
         <div class="mono" style="margin-top:6px">variance explained by PC1: ${(ev * 100).toFixed(1)}%</div>
         <div class="bar"><div style="width:${ev * 100}%"></div></div>
       </div>`;
    let note;
    if (s.project) {
      note = `<b>Dropping PC2 is a projection</b>: every point slides onto the PC1 line. The covariance matrix now has
        det = ${fmt(LA.det(Cz), 3)}, so there is no way back. This is the only step in PCA that loses information,
        and you lose ${(100 - ev * 100).toFixed(1)}% of the variance.`;
    } else if (s.t > 0.98) {
      note = s.whiten
        ? `<b>Whitened:</b> covariance ≈ <b>I</b>. Every direction now has variance 1 and nothing is correlated. The
           data hasn't changed, only the ruler we measure it with.`
        : `<b>Principal axes:</b> the off-diagonal is 0, so the new coordinates z₁, z₂ are uncorrelated. The diagonal entries
           are the eigenvalues of Σ: λ₁ = ${fmt(s.lam[0])}, λ₂ = ${fmt(s.lam[1])}.`;
    } else if (s.t < 0.02) {
      note = `<b>Original features:</b> the off-diagonal entry (${fmt(Cz[0][1])}) is the covariance: the two features move
        together. Slide right to rotate the axes onto the eigenvectors of Σ.`;
    } else {
      note = `Rotating the measurement axes by ${fmt((s.phi * s.t * 180) / Math.PI, 0)}°. Watch the off-diagonal shrink.`;
    }
    $("pcaNote").innerHTML = note;
    pca.draw();
  }

  ["pAngle", "pRatio", "pWhiten", "pProject"].forEach((id) => $(id).addEventListener("input", update3));
  t3.addEventListener("input", update3);
  $("pResample").addEventListener("click", () => { seed = (Math.random() * 1e9) | 0; sample(); update3(); });
  $("play3").addEventListener("click", () => animateRange(t3, +t3.value > 0.5 ? 0 : 1, 1600, update3));

  // Redraw everything on theme change.
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { update1(); update2(); update3(); });

  update1();
  update2();
  update3();
})();
