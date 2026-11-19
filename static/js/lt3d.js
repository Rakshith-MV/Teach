// Section "3D": the transformation view for a 3x3 matrix.
(() => {
  const $ = (id) => document.getElementById(id);
  const col = () => ({
    i: cssVar("--i"), j: cssVar("--j"), k: cssVar("--k"), v: cssVar("--v"), axis: cssVar("--axis"),
    grid: cssVar("--grid"), gridNew: cssVar("--grid-new"), accent: cssVar("--accent"),
    muted: cssVar("--muted"), ink: cssVar("--ink"),
  });
  const vec = (v, d = 2) => `(${v.map((x) => fmt(x, d)).join(", ")})`;

  const S = { A: [[1.5, 0.5, 0], [0.3, 1.2, 0.4], [0, 0.4, 1.3]], v: [1, 0.5, 1] };
  const t = $("t3d");
  const sp = new Space3D($("cvSpace"), { range: 3 });
  const sp2 = new Space3D($("cvSpace2"), { range: 3 });
  const views = [sp, sp2];
  // Keep both cameras in sync so students compare the same angle.
  views.forEach((a) => {
    a.onView = () => views.forEach((b) => {
      if (b === a) return;
      b.yaw = a.yaw; b.pitch = a.pitch; b.zoom = a.zoom; b.draw();
    });
  });

  // Unit cube faces as corner lists.
  const F = [
    [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
    [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]],
    [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]], [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
  ];

  // Fixed reference: standard axes + floor grid z = 0.
  function drawReference(sp, c, floorAlpha) {
    const R = sp.range;
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((e, n) => {
      sp.line(e.map((x) => -x * R), e.map((x) => x * R), c.axis, 1.2, 0.7);
      sp.label(e.map((x) => x * R), ["x", "y", "z"][n], c.muted, [4, 4]);
    });
    for (let k = -R; k <= R; k++) {
      sp.line([k, -R, 0], [k, R, 0], c.grid, 1, floorAlpha);
      sp.line([-R, k, 0], [R, k, 0], c.grid, 1, floorAlpha);
    }
  }

  // Lattice of the basis given by M's columns, plus the image of the unit cube.
  function drawBasisBox(sp, M, c) {
    const T = (p) => L3.mul(M, p);
    if ($("lattice3d").checked) {
      const N = 2;
      for (let a = -N; a <= N; a++)
        for (let b = -N; b <= N; b++)
          for (let dir = 0; dir < 3; dir++) {
            const p = [0, 0, 0], q = [0, 0, 0];
            const o = [0, 1, 2].filter((d) => d !== dir);
            p[o[0]] = q[o[0]] = a; p[o[1]] = q[o[1]] = b;
            p[dir] = -N; q[dir] = N;
            const P = T(p), Q = T(q);
            const mid = sp.proj([(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2, (P[2] + Q[2]) / 2])[2];
            sp.line(P, Q, c.gridNew, 1, 0.25 + 0.55 * sp.near(mid));
          }
    }

    // Image of the unit cube, faces painted far-to-near.
    F.map((f) => {
      const pts = f.map(T);
      const d = pts.reduce((s, p) => s + sp.proj(p)[2], 0) / 4;
      return { pts, d };
    })
      .sort((a, b) => b.d - a.d)
      .forEach(({ pts }) => {
        sp.poly(pts, c.accent, 0.12);
        for (let k = 0; k < 4; k++) sp.line(pts[k], pts[(k + 1) % 4], c.accent, 1.3, 0.7);
      });
  }

  // Reading 1: the space moves.
  sp.draw = () => {
    const c = col(), A = S.A, tt = +t.value;
    const M = L3.lerp(L3.I(), A, tt);
    const T = (p) => L3.mul(M, p);
    sp.clear();
    drawReference(sp, c, 0.8);
    drawBasisBox(sp, M, c);

    // The point v and its image.
    const Mv = T(S.v), Av = L3.mul(A, S.v);
    sp.line(S.v, Av, c.v, 1.5, 0.8, [4, 5]);
    sp.line(Mv, [Mv[0], Mv[1], 0], c.v, 1, 0.5, [2, 4]); // drop line to the floor helps read depth
    sp.dot(S.v, c.v, 6, tt < 0.02 ? `v = ${vec(S.v, 1)}` : "v", true);

    const done = tt > 0.98;
    sp.arrow([0, 0, 0], T([1, 0, 0]), c.i, 3.5, done ? "a₁" : "î");
    sp.arrow([0, 0, 0], T([0, 1, 0]), c.j, 3.5, done ? "a₂" : "ĵ");
    sp.arrow([0, 0, 0], T([0, 0, 1]), c.k, 3.5, done ? "a₃" : "k̂");
    sp.dot(Mv, c.v, 7, done ? `Av = ${vec(Av, 1)}` : null);
    sp.corner("drag to orbit · scroll to zoom", c.muted);
  };

  // Reading 2: the space stays put; the same point is described in the basis {a1, a2, a3}.
  sp2.draw = () => {
    const c = col(), A = S.A, [x, y, z] = S.v;
    const a = [0, 1, 2].map((j) => L3.col(A, j));
    const add = (p, s, q) => [p[0] + s * q[0], p[1] + s * q[1], p[2] + s * q[2]];
    const p1 = add([0, 0, 0], x, a[0]), p2 = add(p1, y, a[1]), P = add(p2, z, a[2]);
    sp2.clear();
    drawReference(sp2, c, 1);
    drawBasisBox(sp2, A, c);

    // Walk to the point along the new basis: x steps of a1, then y of a2, then z of a3.
    sp2.line([0, 0, 0], p1, c.i, 3, 1, [7, 5]);
    sp2.line(p1, p2, c.j, 3, 1, [7, 5]);
    sp2.line(p2, P, c.k, 3, 1, [7, 5]);
    sp2.line(P, [P[0], P[1], 0], c.v, 1, 0.5, [2, 4]);

    sp2.arrow([0, 0, 0], a[0], c.i, 3.5, "a₁");
    sp2.arrow([0, 0, 0], a[1], c.j, 3.5, "a₂");
    sp2.arrow([0, 0, 0], a[2], c.k, 3.5, "a₃");
    sp2.dot(P, c.v, 7, `${fmt(x, 1)}·a₁ + ${fmt(y, 1)}·a₂ + ${fmt(z, 1)}·a₃`);
    sp2.corner("same point, two names", c.muted);
  };

  const cells = [];
  for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) cells.push([`a3_${r}${k}`, r, k]);

  function update(fromInputs = false) {
    const A = S.A;
    if (!fromInputs) {
      cells.forEach(([id, r, k]) => ($(id).value = +A[r][k].toFixed(3)));
      S.v.forEach((x, n) => ($(`v3_${n}`).value = +x.toFixed(2)));
    }
    $("t3dval").textContent = `t = ${(+t.value).toFixed(2)}`;

    const d = L3.det(A), rank = L3.rank(A), Ai = L3.inv(A);
    const what = rank === 2 ? "a plane" : rank === 1 ? "a line" : "a single point";
    $("det3d").innerHTML =
      rank === 3
        ? `det A = ${fmt(d)} <span class="ok">→ volume scaled by ${fmt(Math.abs(d))} · columns form a basis ✓</span>` +
          (d < 0 ? ` <span class="warn">(orientation flipped)</span>` : "")
        : `det A = ${fmt(d)} <span class="warn">→ rank ${rank}: space is crushed onto ${what}, not invertible</span>`;

    const [x, y, z] = S.v, Av = L3.mul(A, S.v);
    let html = `<div class="big">A·v = <b>${fmt(x)}</b>·<span class="c-i">a₁</span> + <b>${fmt(y)}</b>·<span class="c-j">a₂</span>
      + <b>${fmt(z)}</b>·<span class="c-k">a₃</span> = <b>${vec(Av)}</b></div>
      <div>In words: <b>${vec(S.v)}</b> are the point's coordinates in the basis {a₁, a₂, a₃}, and <b>${vec(Av)}</b>
      are its coordinates in the standard basis.</div>`;
    html += Ai
      ? `<div style="margin-top:6px">A⁻¹·${vec(Av)} = <b>${vec(L3.mul(Ai, Av))}</b> <span class="ok">✓</span> the coordinates come back.</div>`
      : `<div class="warn" style="margin-top:6px">The three columns lie in ${rank === 2 ? "one plane" : "one line"}, so they
          can't reach every point in space. Many inputs land on the same output, and A⁻¹ doesn't exist.</div>`;
    $("coords3d").innerHTML = html;
    sp.draw();
    sp2.draw();
  }

  cells.forEach(([id, r, k]) =>
    $(id).addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) { S.A[r][k] = val; update(true); }
    })
  );
  [0, 1, 2].forEach((n) =>
    $(`v3_${n}`).addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) { S.v[n] = val; update(true); }
    })
  );
  $("presets3d").addEventListener("click", (e) => {
    const m = e.target.dataset.m;
    if (!m) return;
    const a = m.split(",").map(Number);
    S.A = [a.slice(0, 3), a.slice(3, 6), a.slice(6, 9)];
    t.value = 0;
    update();
    animateRange(t, 1, 1300, () => update());
  });
  t.addEventListener("input", () => update());
  $("play3d").addEventListener("click", () => { t.value = 0; animateRange(t, 1, 1600, () => update()); });
  $("lattice3d").addEventListener("change", () => { sp.draw(); sp2.draw(); });

  // Gentle auto-rotation (stops when the student grabs either view), only while visible.
  const auto = $("auto3d");
  let visible = false;
  views.forEach((v) => (v.onOrbit = () => { auto.checked = false; }));
  new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); }).observe(sp.c);
  (function spin() {
    if (auto.checked && visible) views.forEach((v) => { v.yaw += 0.004; v.draw(); });
    requestAnimationFrame(spin);
  })();

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { sp.draw(); sp2.draw(); });
  update();
})();
