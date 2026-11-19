// Limits & Continuity lesson.
(() => {
  const $ = (id) => document.getElementById(id);
  const col = () => ({
    i: cssVar("--i"), j: cssVar("--j"), k: cssVar("--k"), v: cssVar("--v"), axis: cssVar("--axis"),
    grid: cssVar("--grid"), accent: cssVar("--accent"), muted: cssVar("--muted"), ink: cssVar("--ink"),
    ok: cssVar("--ok"), warn: cssVar("--warn"), canvas: cssVar("--canvas"),
  });
  const ASPECT = 0.55;
  const num = (y, d = 6) => (!isFinite(y) ? (isNaN(y) ? "undefined" : y > 0 ? "∞" : "−∞") : Math.abs(y) >= 1e5 || (Math.abs(y) < 1e-4 && y !== 0) ? y.toExponential(2) : y.toFixed(d));
  const sci = (x) => { if (x === 0) return "0"; const e = Math.floor(Math.log10(Math.abs(x))); return Math.abs(e) <= 3 ? x.toPrecision(3) : `${(x / Math.pow(10, e)).toFixed(2)}×10^${e}`; };
  const setActive = (sel, pred) => document.querySelectorAll(sel).forEach((b) => b.classList.toggle("active", pred(b)));

  // Shared drawing bits
  function marks(p, list, color) {
    for (const [x, y, filled] of list) {
      const s = p.toS([x, y]);
      p.ctx.beginPath(); p.ctx.arc(s[0], s[1], 5.5, 0, 2 * Math.PI);
      p.ctx.fillStyle = filled ? color : cssVar("--canvas"); p.ctx.fill();
      p.ctx.lineWidth = 2; p.ctx.strokeStyle = color; p.ctx.stroke();
    }
  }
  function vline(p, x, color, dash = [5, 5], width = 1.2) {
    const [, , y0, y1] = p.bounds();
    p.segment([x, y0], [x, y1], color, width, dash);
  }
  function hline(p, y, color, dash = [5, 5], width = 1.2) {
    const [x0, x1] = p.bounds();
    p.segment([x0, y], [x1, y], color, width, dash);
  }
  function band(p, rect, color, alpha) {
    p.ctx.save(); p.ctx.globalAlpha = alpha;
    p.poly([[rect[0], rect[2]], [rect[1], rect[2]], [rect[1], rect[3]], [rect[0], rect[3]]], color);
    p.ctx.restore();
  }

  // Functions for sections 1–2. left/right: true one-sided limits (NaN = none).
  const FN = {
    sq: { name: "x² at a = 1", f: (x) => x * x, a: 1, L: 1, marks: [[1, 1, true]], left: 1, right: 1, fa: 1, ymid: 1 },
    sinc: { name: "sin(x)/x at a = 0", f: (x) => Math.sin(x) / x, a: 0, L: 1, marks: [[0, 1, false]], left: 1, right: 1, fa: NaN, ymid: 0.7 },
    jump: { name: "jump at a = 1", f: (x) => (x < 1 ? x : x + 1), a: 1, L: 1.5, marks: [[1, 1, false], [1, 2, true]], left: 1, right: 2, fa: 2, ymid: 1.5 },
    recip: { name: "1/x² at a = 0", f: (x) => 1 / (x * x), a: 0, L: 2, marks: [], left: Infinity, right: Infinity, fa: NaN, ymid: 1.5 },
    xsin: { name: "x·sin(1/x) at a = 0", f: (x) => x * Math.sin(1 / x), a: 0, L: 0, marks: [[0, 0, false]], left: 0, right: 0, fa: NaN, ymid: 0 },
    sin1x: { name: "sin(1/x) at a = 0", f: (x) => Math.sin(1 / x), a: 0, L: 0, marks: [], left: NaN, right: NaN, fa: NaN, ymid: 0 },
  };
  function fnButtons(containerId, onPick) {
    const box = $(containerId);
    Object.entries(FN).forEach(([k, F]) => {
      const b = document.createElement("button");
      b.textContent = F.name; b.dataset.k = k;
      b.addEventListener("click", () => onPick(k));
      box.appendChild(b);
    });
  }

  // =====================================================================
  // 1. ε–δ game
  // =====================================================================
  const E = { key: "sq", verdict: null };
  const epsPlane = new Plane($("cvEps"), { range: 2, aspect: ASPECT });
  const eL = $("eL"), eEps = $("eEps"), eDel = $("eDel"), eZoom = $("eZoom");
  const eps = () => Math.pow(10, +eEps.value), del = () => Math.pow(10, +eDel.value), Lv = () => +eL.value;

  function badCount(F, L, ep, de) {
    let bad = 0;
    const test = (x) => { if (x === F.a) return; if (!(Math.abs(F.f(x) - L) < ep)) bad++; };
    for (let k = 1; k <= 3000; k++) test(F.a - de + (2 * de * k) / 3001);
    for (let j = 0; j <= 90; j++) { const h = de * Math.pow(10, -j / 9); test(F.a + h * 0.999); test(F.a - h * 0.999); }
    return bad;
  }

  function autoZoom() {
    if (!$("autoZoom").checked) return;
    const r = Math.max(del() * 3, (eps() * 3) / ASPECT, 0.002);
    eZoom.value = Math.max(+eZoom.min, Math.min(+eZoom.max, Math.log10(r)));
  }

  epsPlane.draw = () => {
    const c = col(), p = epsPlane, F = FN[E.key], L = Lv(), ep = eps(), de = del();
    p.setView(Math.pow(10, +eZoom.value), [F.a, L]);
    p.clear();
    p.ticks(c.grid, c.muted);
    p.axes(c.axis);
    const [x0, x1, y0, y1] = p.bounds();
    band(p, [x0, x1, L - ep, L + ep], c.accent, 0.13);
    band(p, [F.a - de, F.a + de, y0, y1], c.j, 0.1);
    hline(p, L + ep, c.accent); hline(p, L - ep, c.accent);
    vline(p, F.a - de, c.j); vline(p, F.a + de, c.j);
    p.curve(F.f, c.muted, 2, null, null, 3000);

    // Inside the δ-band: green where |f(x) − L| < ε, red where it escapes.
    const good = [], bad = [], n = 1600;
    let prevOk = null;
    for (let k = 0; k <= n; k++) {
      const x = F.a - de + (2 * de * k) / n;
      if (Math.abs(x - F.a) < de * 1e-6) { good.push(null); bad.push(null); prevOk = null; continue; }
      const y = F.f(x);
      if (!isFinite(y) || Math.abs(y - L) > (y1 - y0) * 20) { good.push(null); bad.push(null); prevOk = null; continue; }
      const ok = Math.abs(y - L) < ep;
      if (prevOk !== null && ok !== prevOk) (ok ? good : bad).push(null);
      (ok ? good : bad).push([x, y]);
      (ok ? bad : good).push(null);
      prevOk = ok;
    }
    p.polyline(good, c.ok, 4);
    p.polyline(bad, c.warn, 4);
    marks(p, F.marks, c.ink);
    p.label([x0, L + ep], "L + ε", c.accent, [6, -6]);
    p.label([x0, L - ep], "L − ε", c.accent, [6, 16]);
    p.label([F.a + de, y1], "a + δ", c.j, [4, 16]);
    p.label([F.a - de, y1], "a − δ", c.j, [-44, 16]);
  };

  function update1() {
    const F = FN[E.key], L = Lv(), ep = eps(), de = del();
    $("eLval").textContent = L.toFixed(2);
    $("eEpsval").textContent = sci(ep);
    $("eDelval").textContent = sci(de);
    setActive("#fnBtns button", (b) => b.dataset.k === E.key);
    const bad = badCount(F, L, ep, de);
    let html;
    if (E.verdict === "nodelta") {
      const why = {
        jump: `On the left, f approaches 1. On the right, it approaches 2. For ε < 0.5 no single L is within ε of both, so <b>the limit doesn't exist</b>.`,
        recip: `f(x) grows without bound as x → 0, so it can't stay within ε of any number. (We write lim = ∞, but that means "no finite limit".)`,
        sin1x: `However close to 0 you get, sin(1/x) still swings through every value between −1 and 1, so it never settles near any L. <b>No limit.</b>`,
      }[E.key] || `The claimed L is wrong. Try moving L.`;
      html = `<span class="warn"><b>✗ No δ works</b></span> (tried down to δ = 10⁻⁶) for L = ${L.toFixed(2)}, ε = ${sci(ep)}. ${why}`;
    } else if (bad === 0) {
      html = `<span class="ok"><b>✓ You win this round.</b></span> Every x with 0 &lt; |x − ${F.a}| &lt; δ = ${sci(de)} has
        |f(x) − ${L.toFixed(2)}| &lt; ε = ${sci(ep)}. The whole curve inside the blue band is green.
        <b>Now press "halve ε".</b> A limit means you can win <em>every</em> round.`;
    } else {
      html = `<span class="warn"><b>✗ Not yet.</b></span> Part of the curve inside the δ-band (red) lies outside the ε-band.
        Make δ smaller, or press <b>Find a δ for me</b>.`;
    }
    if (E.key === "sinc" || E.key === "xsin")
      html += `<div class="hint" style="margin-top:6px">Note: f(${F.a}) is undefined (0/0 or 0·sin(∞)), and that doesn't matter: the definition
        never looks at x = a itself.</div>`;
    $("epsVerdict").innerHTML = html;
    epsPlane.draw();
  }

  function pickFn1(k) {
    E.key = k; E.verdict = null;
    const F = FN[k];
    eL.min = F.L - 2; eL.max = F.L + 2; eL.value = F.L;
    eEps.value = Math.log10(0.5); eDel.value = Math.log10(0.5);
    autoZoom(); update1();
  }
  function findDelta() {
    const F = FN[E.key];
    let d = Math.pow(10, +eDel.max), found = null;
    while (d > 1e-6) { if (badCount(F, Lv(), eps(), d) === 0) { found = d; break; } d *= 0.85; }
    if (found) { E.verdict = null; eDel.value = Math.max(+eDel.min, Math.log10(found)); }
    else { E.verdict = "nodelta"; eDel.value = eDel.min; }
    autoZoom(); update1();
  }
  fnButtons("fnBtns", pickFn1);
  [eL, eEps, eDel].forEach((el) => el.addEventListener("input", () => { E.verdict = null; if (el === eDel) autoZoom(); update1(); }));
  eZoom.addEventListener("input", () => { $("autoZoom").checked = false; epsPlane.draw(); });
  $("findDel").addEventListener("click", findDelta);
  $("shrinkEps").addEventListener("click", () => {
    eEps.value = Math.max(+eEps.min, +eEps.value - Math.log10(2));
    findDelta();
  });
  pickFn1("sq");

  // =====================================================================
  // 2. One-sided limits
  // =====================================================================
  const S2 = { key: "jump" };
  const sidePlane = new Plane($("cvSide"), { range: 1.6, aspect: ASPECT });
  const sideH = $("sideH");

  sidePlane.draw = () => {
    const c = col(), p = sidePlane, F = FN[S2.key], h = Math.pow(10, +sideH.value);
    p.setView(F.key === "sin1x" ? 1.2 : 1.6, [F.a, F.ymid]);
    p.clear();
    p.ticks(c.grid, c.muted);
    p.axes(c.axis);
    vline(p, F.a, c.muted);
    p.curve(F.f, c.muted, 2, null, null, 3000);
    marks(p, F.marks, c.ink);
    const [x0] = p.bounds();
    [[F.a - h, c.j, "x = a − h"], [F.a + h, c.i, "x = a + h"]].forEach(([x, color, lbl]) => {
      const y = F.f(x);
      if (!isFinite(y)) return;
      p.segment([x0, y], [x, y], color, 1.5, [4, 4]);
      p.dot([x, y], color, 7);
      p.label([x0, y], `f = ${num(y, 3)}`, color, [6, color === c.j ? 16 : -6]);
    });
  };

  function update2() {
    const F = FN[S2.key], h = Math.pow(10, +sideH.value);
    $("sideHval").textContent = sci(h);
    setActive("#fnBtns2 button", (b) => b.dataset.k === S2.key);
    let rows = "";
    for (let k = 1; k <= 7; k++) {
      const hh = Math.pow(10, -k);
      rows += `<tr><td>10⁻${"¹²³⁴⁵⁶⁷"[k - 1]}</td><td>${num(F.f(F.a - hh))}</td><td>${num(F.f(F.a + hh))}</td></tr>`;
    }
    $("sideTable").innerHTML = `<table class="vals"><tr><th>h</th><th class="c-j">f(a − h)</th><th class="c-i">f(a + h)</th></tr>${rows}</table>`;
    const l = F.left, r = F.right;
    let v;
    if (isNaN(l)) v = `<b class="warn">Neither side settles.</b> The values keep jumping around between −1 and 1 as h shrinks, so neither
      one-sided limit exists.`;
    else if (!isFinite(l)) v = `<b class="warn">Both sides blow up.</b> f(a ± h) → ∞. We write lim = ∞, but there is no
      <em>number</em> L, so the limit doesn't exist in the usual sense (a vertical asymptote).`;
    else if (l !== r) v = `<b class="warn">The sides disagree:</b> from the left → ${l}, from the right → ${r}. Both one-sided limits
      exist, but the two-sided limit does <b>not</b>. f(a) = ${F.fa} matches only the right side.`;
    else {
      v = `<b class="ok">Both sides → ${l}</b>, so lim<sub>x→a</sub> f(x) = ${l}. `;
      v += isNaN(F.fa) ? `But f(a) is undefined, so f is <b>not continuous</b> at a. Defining f(a) = ${l} would fix that (a removable discontinuity).`
        : F.fa === l ? `And f(a) = ${F.fa} too, so f is <b>continuous</b> at a.` : `But f(a) = ${F.fa} ≠ ${l}.`;
    }
    $("sideVerdict").innerHTML = v;
    sidePlane.draw();
  }
  Object.entries(FN).forEach(([k, F]) => (F.key = k));
  fnButtons("fnBtns2", (k) => { S2.key = k; sideH.value = 0; update2(); });
  sideH.addEventListener("input", update2);
  $("playSide").addEventListener("click", () => { sideH.value = 0; animateRange(sideH, -3, 3000, update2); });
  update2();

  // =====================================================================
  // 3. Gallery of discontinuities
  // =====================================================================
  const GAL = [
    { title: "Continuous", f: (x) => 0.6 * (x - 1) * (x - 1) + 0.4 * x + 0.3, marks: [[1, 0.7, true]], ymid: 0.9, checks: [1, 1, 1],
      note: "All three conditions hold. You could draw it without lifting your pen." },
    { title: "Removable (a hole)", f: (x) => (x * x - 1) / (x - 1) - 0.8, marks: [[1, 1.2, false], [1, 2.2, true]], ymid: 1.3, checks: [1, 1, 0],
      note: "The limit is 1.2, but f(1) was set to 2.2. Redefine f(1) = 1.2 and the hole is repaired. (sin(x)/x at 0 is this kind, except f(0) is undefined.)" },
    { title: "Jump", f: (x) => (x < 1 ? 0.4 * x + 0.3 : 0.4 * x + 1.3), marks: [[1, 0.7, false], [1, 1.7, true]], ymid: 1.2, checks: [1, 0, 0],
      note: "The one-sided limits exist but disagree. Thresholds, rounding and accuracy-vs-weights all look like this." },
    { title: "Infinite", f: (x) => 0.3 / (x - 1) + 1, marks: [], ymid: 1, checks: [0, 0, 0],
      note: "f blows up near a (a vertical asymptote). log(x) at 0 and 1/x behave this way." },
    { title: "Oscillating", f: (x) => 0.8 * Math.sin(1 / (x - 1)) + 1, marks: [], ymid: 1, checks: [0, 0, 0],
      note: "It wiggles faster and faster and never settles on any value." },
  ];
  const gal = $("gallery");
  const galPlanes = GAL.map((G) => {
    const card = document.createElement("div");
    card.className = "gcard";
    const tick = (b) => (b ? `<span class="ok">✓</span>` : `<span class="warn">✗</span>`);
    card.innerHTML = `<h3>${G.title}</h3><canvas class="plane gal"></canvas>
      <div class="checks">${tick(G.checks[0])} f(a) defined &nbsp; ${tick(G.checks[1])} limit exists &nbsp; ${tick(G.checks[2])} equal</div>
      <p>${G.note}</p>`;
    gal.appendChild(card);
    const p = new Plane(card.querySelector("canvas"), { range: 1.4, aspect: 0.75, center: [1, G.ymid] });
    p.draw = () => {
      const c = col();
      p.clear();
      p.ticks(c.grid, c.muted);
      vline(p, 1, c.muted);
      p.curve(G.f, c.accent, 2.5, null, null, 3000);
      marks(p, G.marks, c.accent);
      p.label([1, p.bounds()[2]], "a", c.muted, [5, -22]);
    };
    p.draw();
    return p;
  });

  // =====================================================================
  // 4. Derivative as a limit
  // =====================================================================
  const DF = {
    sq: { name: "x²", f: (x) => x * x, d: (x) => 2 * x, a: 1 },
    sin: { name: "sin x", f: Math.sin, d: Math.cos, a: 1 },
    exp: { name: "eˣ", f: Math.exp, d: Math.exp, a: 0.5 },
    abs: { name: "|x|", f: Math.abs, d: (x) => (x === 0 ? NaN : Math.sign(x)), a: 0 },
    relu: { name: "ReLU", f: (x) => Math.max(0, x), d: (x) => (x === 0 ? NaN : x > 0 ? 1 : 0), a: 0 },
  };
  const D = { key: "sq" };
  const derPlane = new Plane($("cvDer"), { range: 1.8, aspect: ASPECT });
  const dA = $("dA"), dH = $("dH");
  const aVal = () => { const a = +dA.value; return Math.abs(a) < 0.02 ? 0 : a; };
  Object.entries(DF).forEach(([k, F]) => {
    const b = document.createElement("button");
    b.textContent = F.name; b.dataset.k = k;
    b.addEventListener("click", () => { D.key = k; dA.value = F.a; dH.value = 0; update4(); });
    $("dfnBtns").appendChild(b);
  });

  derPlane.draw = () => {
    const c = col(), p = derPlane, F = DF[D.key], a = aVal(), h = Math.pow(10, +dH.value), fa = F.f(a);
    p.setView(1.8, [a, fa]);
    p.clear();
    p.ticks(c.grid, c.muted);
    p.axes(c.axis);
    p.curve(F.f, c.ink, 2.2);
    const [x0, x1] = p.bounds();
    const lineSlope = (m, color, width, dash) => p.segment([x0, fa + m * (x0 - a)], [x1, fa + m * (x1 - a)], color, width, dash);
    const fwd = (F.f(a + h) - fa) / h, bwd = (fa - F.f(a - h)) / h, d = F.d(a);
    if (isFinite(d)) lineSlope(d, c.muted, 2, [7, 6]);
    lineSlope(bwd, c.j, 2, []);
    lineSlope(fwd, c.i, 2, []);
    p.dot([a + h, F.f(a + h)], c.i, 5);
    p.dot([a - h, F.f(a - h)], c.j, 5);
    p.dot([a, fa], c.ink, 6, "a");
  };

  function drawErr() {
    const cv = $("cvErr"), dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext("2d"), c = col(), F = DF[D.key], a = aVal();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = c.canvas; ctx.fillRect(0, 0, W, H);
    const d = F.d(a);
    ctx.font = "10px ui-monospace, Consolas, monospace"; ctx.fillStyle = c.muted;
    if (!isFinite(d)) { ctx.fillText("no derivative at this point: nothing to compare with", 10, H / 2); return; }
    const xs = (e) => 36 + ((W - 46) * -e) / 16, ys = (le) => 10 + ((H - 30) * (1 - le)) / 18;
    ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
    for (let le = 0; le >= -16; le -= 4) { ctx.beginPath(); ctx.moveTo(36, ys(le)); ctx.lineTo(W - 10, ys(le)); ctx.stroke(); ctx.fillText(`1e${le}`, 2, ys(le) + 3); }
    for (let e = 0; e >= -16; e -= 4) ctx.fillText(`h=1e${e}`, xs(e) - 14, H - 6);
    ctx.strokeStyle = c.i; ctx.lineWidth = 2; ctx.beginPath();
    for (let e = 0, n = 0; e >= -16; e -= 0.1, n++) {
      const h = Math.pow(10, e), err = Math.abs((F.f(a + h) - F.f(a)) / h - d);
      const le = Math.max(-17, Math.log10(Math.max(err, 1e-17)));
      n ? ctx.lineTo(xs(e), ys(le)) : ctx.moveTo(xs(e), ys(le));
    }
    ctx.stroke();
    const e = +dH.value, h = Math.pow(10, e), err = Math.abs((F.f(a + h) - F.f(a)) / h - d);
    ctx.fillStyle = c.ink;
    ctx.beginPath(); ctx.arc(xs(e), ys(Math.max(-17, Math.log10(Math.max(err, 1e-17)))), 5, 0, 2 * Math.PI); ctx.fill();
  }

  function update4() {
    const F = DF[D.key], a = aVal(), h = Math.pow(10, +dH.value), fa = F.f(a);
    setActive("#dfnBtns button", (b) => b.dataset.k === D.key);
    $("dAval").textContent = a.toFixed(2);
    $("dHval").textContent = `h = ${sci(h)}`;
    const fwd = (F.f(a + h) - fa) / h, bwd = (fa - F.f(a - h)) / h, d = F.d(a);
    let html = `<table class="vals">
      <tr><td><span class="c-i">forward</span> (f(a+h) − f(a)) / h</td><td>${fwd.toPrecision(12)}</td></tr>
      <tr><td><span class="c-j">backward</span> (f(a) − f(a−h)) / h</td><td>${bwd.toPrecision(12)}</td></tr>
      <tr><td>true f′(a)</td><td>${isFinite(d) ? d.toPrecision(12) : "doesn't exist"}</td></tr>`;
    if (isFinite(d)) html += `<tr><td>error of forward</td><td>${Math.abs(fwd - d).toExponential(2)}</td></tr>`;
    $("derBox").innerHTML = html + "</table>";
    let note;
    if (!isFinite(d)) {
      note = `<b>A corner: the limit doesn't exist.</b> However small h gets, the forward slope stays at ${fwd.toFixed(0)} and the
        backward slope at ${bwd.toFixed(0)}. The one-sided limits disagree, exactly like the jump in Section 2. For ReLU, deep
        learning frameworks simply choose 0 here.`;
    } else if (+dH.value > -7) {
      note = `As h shrinks, the two secants squeeze together onto the tangent. The error falls roughly in proportion to h
        (the curve bends away from the straight secant).`;
    } else {
      note = `<b>Past h ≈ 10⁻⁸ the error grows again.</b> Doubles hold about 16 digits, and f(a+h) and f(a) now agree in almost all of
        them. Subtracting cancels the real information and leaves rounding noise, roughly 10⁻¹⁶ / h. At h ≈ 10⁻¹⁶,
        a + h == a in floating point and the quotient is exactly 0. The computer can't take the limit for us,
        which is why ML frameworks use automatic differentiation instead.`;
    }
    $("derNote").innerHTML = note;
    derPlane.draw();
    drawErr();
  }
  dA.addEventListener("input", update4);
  dH.addEventListener("input", update4);
  $("playD").addEventListener("click", () => { dH.value = 0; animateRange(dH, -16, 5000, update4); });
  new ResizeObserver(drawErr).observe($("cvErr"));
  update4();

  // =====================================================================
  // 5. sigmoid(kx) -> step
  // =====================================================================
  const sigPlane = new Plane($("cvSig"), { range: 2.5, aspect: ASPECT, center: [0, 0.5] });
  const sigK = $("sigK");
  sigPlane.draw = () => {
    const c = col(), p = sigPlane, k = Math.pow(10, +sigK.value);
    p.clear();
    p.ticks(c.grid, c.muted);
    p.axes(c.axis);
    const [x0, x1] = p.bounds();
    p.polyline([[x0, 0], [0, 0], null, [0, 1], [x1, 1]], c.muted, 2.5, 0.8);
    marks(p, [[0, 0, false], [0, 1, true]], c.muted);
    p.curve((x) => { const s = 1 / (1 + Math.exp(-k * x)); return k * s * (1 - s); }, c.j, 2, null, null, 3000);
    p.curve((x) => 1 / (1 + Math.exp(-k * x)), c.i, 3, null, null, 3000);
    p.label([x0, 1], "step (dashed grey)", c.muted, [6, -8]);
    p.label([0.3, 1 / (1 + Math.exp(-k * 0.3))], "σ(kx)", c.i, [8, 18]);
  };
  const upd5 = () => { $("sigKval").textContent = `k = ${Math.pow(10, +sigK.value).toFixed(1)} · max slope = k/4 = ${(Math.pow(10, +sigK.value) / 4).toFixed(2)}`; sigPlane.draw(); };
  sigK.addEventListener("input", upd5);
  upd5();

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    update1(); update2(); galPlanes.forEach((p) => p.draw()); update4(); upd5();
  });
})();
