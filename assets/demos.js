/* EJU 物理 互动演示：纯物理公式（浏览器与 Node 测试共用） */
(function (G) {
  'use strict';
  var P = {};
  P.g = 9.8;
  /* 1D 碰撞：恢复系数 e */
  P.collide = function (m1, m2, v1, v2, e) {
    var p = m1 * v1 + m2 * v2, M = m1 + m2;
    return { u1: (p - m2 * e * (v1 - v2)) / M, u2: (p + m1 * e * (v1 - v2)) / M, vG: p / M };
  };
  P.ke = function (m, v) { return 0.5 * m * v * v; };
  /* 抛体：初速 v0, 仰角 th(rad), 抛出高度 h0 */
  P.projectile = function (v0, th, h0, g) {
    g = g || P.g; var vx = v0 * Math.cos(th), vy = v0 * Math.sin(th);
    var T = (vy + Math.sqrt(vy * vy + 2 * g * h0)) / g;
    return { T: T, R: vx * T, H: h0 + (vy > 0 ? vy * vy / (2 * g) : 0), vx: vx, vy: vy };
  };
  /* 斜面上 m1 经滑轮连挂 m2；a>0 表示 m2 下降。静/动摩擦系数相同 */
  P.incline = function (m1, m2, th, mu, g) {
    g = g || P.g;
    var drive = m2 * g - m1 * g * Math.sin(th), fmax = mu * m1 * g * Math.cos(th), a, f;
    if (Math.abs(drive) <= fmax + 1e-12) { a = 0; f = -drive; }
    else { f = -Math.sign(drive) * fmax; a = (drive + f) / (m1 + m2); }
    return { a: a, T: m2 * (g - a), f: f, N: m1 * g * Math.cos(th), state: a > 0 ? 'm2down' : a < 0 ? 'm2up' : 'static' };
  };
  /* 运动中的斜面连接体：v 为沿“m2 下降”方向的速度；动摩擦力与运动方向相反。v=0 时同 P.incline */
  P.inclineAt = function (m1, m2, th, mu, v, g) {
    g = g || P.g; if (!v) return P.incline(m1, m2, th, mu, g);
    var f = -Math.sign(v) * mu * m1 * g * Math.cos(th), a = (m2 * g - m1 * g * Math.sin(th) + f) / (m1 + m2);
    return { a: a, T: m2 * (g - a), f: f, N: m1 * g * Math.cos(th), state: v > 0 ? 'm2down' : 'm2up', moving: true };
  };
  /* 一维滑动（等加速度分段精确积分）：aD 驱动加速度（不含摩擦），aF 摩擦减速度大小（静・动摩擦同值）。
     速度过零的时刻精确停下，再按 |aD| ≤ aF 判断能否静止；返回 {x, v, a} */
  P.slide1D = function (x, v, aD, aF, dt) {
    for (var k = 0; k < 3 && dt > 0; k++) {
      var a;
      if (v === 0) {
        if (Math.abs(aD) <= aF) return { x: x, v: 0, a: 0 };
        a = aD - Math.sign(aD) * aF; return { x: x + 0.5 * a * dt * dt, v: a * dt, a: a };
      }
      a = aD - Math.sign(v) * aF;
      if (a * v < 0 && -v / a < dt) { var ts = -v / a; x += v * ts + 0.5 * a * ts * ts; v = 0; dt -= ts; continue; }
      return { x: x + v * dt + 0.5 * a * dt * dt, v: v + a * dt, a: a };
    }
    return { x: x, v: v, a: 0 };
  };
  /* v–t 折线下的位移（梯形面积）；nodes = [[t,v],...] */
  P.vtX = function (nodes, t) {
    var x = 0;
    for (var i = 0; i < nodes.length - 1; i++) {
      var t0 = nodes[i][0], t1 = nodes[i + 1][0], v0 = nodes[i][1], v1 = nodes[i + 1][1];
      if (t <= t0) break;
      var te = Math.min(t, t1), ve = v0 + (v1 - v0) * (te - t0) / (t1 - t0);
      x += (v0 + ve) / 2 * (te - t0);
    }
    return x;
  };
  P.vtDist = function (nodes, t) { /* 路程：|v| 的积分 */
    var s = 0, N = 400, h = t / N, prev = P.vtV(nodes, 0);
    for (var i = 1; i <= N; i++) { var v = P.vtV(nodes, i * h);
      if (prev * v >= 0) s += Math.abs(prev + v) / 2 * h;
      else { var r = Math.abs(prev) / (Math.abs(prev) + Math.abs(v)); s += (Math.abs(prev) * r + Math.abs(v) * (1 - r)) / 2 * h; }
      prev = v; }
    return s;
  };
  P.vtV = function (nodes, t) {
    for (var i = 0; i < nodes.length - 1; i++) if (t <= nodes[i + 1][0])
      return nodes[i][1] + (nodes[i + 1][1] - nodes[i][1]) * (t - nodes[i][0]) / (nodes[i + 1][0] - nodes[i][0]);
    return nodes[nodes.length - 1][1];
  };
  /* 曲面轨道 y=f(x) 上的小球：沿弧长速度 v；含动摩擦 mu（N = m(g cosα + v²κ)） */
  P.trackStep = function (s, f, df, d2f, mu, dt, g) {
    g = g || P.g;
    function acc(x, v) {
      var yp = df(x), q = Math.sqrt(1 + yp * yp), sin = yp / q, cos = 1 / q, kap = d2f(x) / (q * q * q);
      var N = g * cos + v * v * kap; if (N < 0) N = 0;
      return -g * sin - (v === 0 ? 0 : Math.sign(v)) * mu * N;
    }
    function dx(x, v) { var yp = df(x); return v / Math.sqrt(1 + yp * yp); }
    var x = s.x, v = s.v;
    var k1x = dx(x, v), k1v = acc(x, v);
    var k2x = dx(x + k1x * dt / 2, v + k1v * dt / 2), k2v = acc(x + k1x * dt / 2, v + k1v * dt / 2);
    var k3x = dx(x + k2x * dt / 2, v + k2v * dt / 2), k3v = acc(x + k2x * dt / 2, v + k2v * dt / 2);
    var k4x = dx(x + k3x * dt, v + k3v * dt), k4v = acc(x + k3x * dt, v + k3v * dt);
    var nv = v + dt / 6 * (k1v + 2 * k2v + 2 * k3v + k4v);
    if (mu > 0 && v !== 0 && nv * v < 0) { /* 摩擦使速度过零：停在此处，检查能否静止 */
      var yp = df(x); nv = (Math.abs(yp) <= mu) ? 0 : nv; }
    return { x: x + dt / 6 * (k1x + 2 * k2x + 2 * k3x + k4x), v: nv };
  };
  /* 简谐振动 / 单摆 */
  P.springT = function (m, k) { return 2 * Math.PI * Math.sqrt(m / k); };
  P.pendT = function (L, g) { return 2 * Math.PI * Math.sqrt(L / (g || P.g)); };
  /* 万有引力（GM 自定单位） */
  P.vCirc = function (GM, r) { return Math.sqrt(GM / r); };
  P.vEsc = function (GM, r) { return Math.sqrt(2 * GM / r); };
  P.orbitElems = function (GM, r, v) { /* 近/远点切向发射 */
    var eps = v * v / 2 - GM / r;
    if (eps >= 0) return { eps: eps, kind: eps === 0 ? 'parabola' : 'hyperbola' };
    var a = -GM / (2 * eps), rOther = 2 * a - r;
    return { eps: eps, a: a, T: 2 * Math.PI * Math.sqrt(a * a * a / GM), rOther: rOther, kind: Math.abs(rOther - r) < 1e-9 * r ? 'circle' : 'ellipse' };
  };
  P.orbitStep = function (s, GM, dt) { /* 速度 Verlet（辛积分） */
    function a(x, y) { var r = Math.hypot(x, y), k = -GM / (r * r * r); return [k * x, k * y]; }
    var A = a(s.x, s.y), vx = s.vx + A[0] * dt / 2, vy = s.vy + A[1] * dt / 2;
    var x = s.x + vx * dt, y = s.y + vy * dt, B = a(x, y);
    return { x: x, y: y, vx: vx + B[0] * dt / 2, vy: vy + B[1] * dt / 2 };
  };
  /* 单原子理想气体直线过程 (p1,V1)->(p2,V2)：W 为气体对外做功 */
  P.gasSeg = function (p1, V1, p2, V2) {
    var W = (p1 + p2) / 2 * (V2 - V1), dU = 1.5 * (p2 * V2 - p1 * V1);
    return { W: W, dU: dU, Q: dU + W };
  };
  P.gasSegQin = function (p1, V1, p2, V2, N) { /* 该直线过程中吸收的热量（只计 dQ>0 部分） */
    N = N || 400; var q = 0;
    for (var i = 0; i < N; i++) {
      var a = i / N, b = (i + 1) / N, s = P.gasSeg(p1 + (p2 - p1) * a, V1 + (V2 - V1) * a, p1 + (p2 - p1) * b, V1 + (V2 - V1) * b);
      if (s.Q > 0) q += s.Q;
    }
    return q;
  };
  P.cycle = function (pts) { /* pts=[[V,p],...] 闭合 */
    var W = 0, dU = 0, Qin = 0, segs = [];
    for (var i = 0; i < pts.length; i++) {
      var A = pts[i], B = pts[(i + 1) % pts.length], s = P.gasSeg(A[1], A[0], B[1], B[0]);
      s.Qin = P.gasSegQin(A[1], A[0], B[1], B[0]); segs.push(s); W += s.W; dU += s.dU; Qin += s.Qin;
    }
    return { segs: segs, W: W, dU: dU, Qin: Qin, eff: Qin > 0 ? W / Qin : 0 };
  };
  /* 多普勒：vs>0 声源朝观察者，vo>0 观察者朝声源 */
  P.doppler = function (f, V, vs, vo) { return f * (V + vo) / (V - vs); };
  /* 透镜：a 物距(>0)，f 焦距（凹透镜 f<0）；b>0 实像 */
  P.lens = function (a, f) { if (Math.abs(a - f) < 1e-12) return { b: Infinity, m: Infinity }; var b = a * f / (a - f); return { b: b, m: -b / a }; };
  P.slitDx = function (L, d, lam) { return L * lam / d; };
  P.slitI = function (x, L, d, lam) { var c = Math.cos(Math.PI * d * x / (lam * L)); return c * c; };
  /* 点电荷（k=9e9） */
  P.k = 9e9;
  P.potential = function (Q, x, y) { var V = 0; for (var i = 0; i < Q.length; i++) V += P.k * Q[i].q / Math.hypot(x - Q[i].x, y - Q[i].y); return V; };
  P.field = function (Q, x, y) { var ex = 0, ey = 0; for (var i = 0; i < Q.length; i++) { var dx = x - Q[i].x, dy = y - Q[i].y, r = Math.hypot(dx, dy), c = P.k * Q[i].q / (r * r * r); ex += c * dx; ey += c * dy; } return [ex, ey]; };
  /* 平行板电容器：connected=true 保持电压 V0，否则保持初始电荷（在 d0, εr=1 时以 V0 充电） */
  P.eps0 = 8.85e-12;
  P.capacitor = function (S, d, er, d0, V0, connected) {
    var C = P.eps0 * er * S / d, C0 = P.eps0 * S / d0, Q, V;
    if (connected) { V = V0; Q = C * V; } else { Q = C0 * V0; V = Q / C; }
    return { C: C, Q: Q, V: V, E: V / d, U: 0.5 * Q * V };
  };
  /* 直流：电动势 E，内阻 r，外电阻 R */
  P.circuit = function (E, r, R) { var I = E / (R + r); return { I: I, V: E - I * r, P: I * I * R, Pmax: E * E / (4 * r), eta: R / (R + r) }; };
  /* 洛伦兹力圆运动 */
  P.cyclo = function (m, q, v, B) { return { r: m * v / (Math.abs(q) * B), T: 2 * Math.PI * m / (Math.abs(q) * B) }; };
  /* 导轨上导体棒：恒力 F，从 v0 出发 */
  P.rod = function (m, L, B, R, F, v0, t) {
    var k = B * B * L * L / R, vt = F / k, tau = m / k;
    return { vt: vt, tau: tau, v: vt + (v0 - vt) * Math.exp(-t / tau) };
  };
  P.rodStep = function (s, m, L, B, R, F, dt) { var k = B * B * L * L / R; function a(v) { return (F - k * v) / m; }
    var v = s.v, k1 = a(v), k2 = a(v + k1 * dt / 2), k3 = a(v + k2 * dt / 2), k4 = a(v + k3 * dt);
    var nv = v + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4); return { x: s.x + (v + nv) / 2 * dt, v: nv }; };
  /* 半衰期 */
  P.decayN = function (N0, T, t) { return N0 * Math.pow(0.5, t / T); };
  P.decayP = function (T, dt) { return 1 - Math.pow(0.5, dt / T); };
  /* 光电效应：h 以 eV·s */
  P.hEV = 4.136e-15;
  P.photo = function (f, W) { var K = P.hEV * f - W; return { K: K, V0: K > 0 ? K : 0, f0: W / P.hEV }; };
  /* 波 */
  P.standing = function (A, lam, T, x, t) { var k = 2 * Math.PI / lam, w = 2 * Math.PI / T; return A * Math.sin(k * x - w * t) + A * Math.sin(k * x + w * t); };
  if (typeof module !== 'undefined' && module.exports) module.exports = P; else G.PHYS = P;
})(this);
/* EJU 物理 互动演示（原生 JS + canvas；进入视口才初始化，离开视口暂停） */
(function () {
  'use strict';
  var P = window.PHYS, RM = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var COL = {}, ALL = [], REG = {};
  function readCols() {
    var cs = getComputedStyle(document.documentElement);
    ['ink', 'ink-2', 'ink-3', 'line', 'surface', 'surface-2', 'accent', 'accent-soft', 'warn', 'good', 'c1', 'c2', 'c3', 'c4', 'bg'].forEach(function (k) {
      COL[k] = cs.getPropertyValue('--' + k).trim() || '#888';
    });
    COL.dark = document.documentElement.getAttribute('data-theme') === 'dark';
  }
  function fx(v, d) { if (!isFinite(v)) return '∞'; d = d == null ? 2 : d; var s = Math.abs(v) < 1e-9 ? (0).toFixed(d) : v.toFixed(d); return s.replace('-', '−'); }
  function sci(v, d) { if (v === 0) return '0'; var e = Math.floor(Math.log10(Math.abs(v))), m = v / Math.pow(10, e); return fx(m, d == null ? 2 : d) + '×10<sup>' + String(e).replace('-', '−') + '</sup>'; }
  function h(tag, attrs, parent, text) { var e = document.createElement(tag); for (var k in attrs || {}) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; }

  function Demo(root, spec) {
    var d = this; d.root = root; d.spec = spec; d.handles = []; d.playing = false; d.visible = false; d.t = 0;
    root.classList.add('demo-on');
    var stage = h('div', { 'class': 'demo-stage' }, root);
    d.cv = h('canvas', { role: 'img', 'aria-label': root.getAttribute('data-title') || '互动演示' }, stage);
    d.ctx = d.cv.getContext('2d');
    d.ctl = h('div', { 'class': 'demo-ctl' }, root);
    d.outEl = h('div', { 'class': 'demo-out', 'aria-live': 'polite' }, root);
    d.aspect = spec.aspect || 1.6; /* 可为函数 aspect(宽度px)：窄屏可取更高的画面 */
    d.resize = function () {
      var w = stage.clientWidth || 300, asp = typeof d.aspect === 'function' ? d.aspect(w) : d.aspect, hgt = Math.min(Math.round(w / asp), spec.maxH || 520);
      var r = Math.min(window.devicePixelRatio || 1, 2);
      d.W = w; d.H = hgt; d.cv.width = Math.round(w * r); d.cv.height = Math.round(hgt * r);
      d.cv.style.height = hgt + 'px'; d.ctx.setTransform(r, 0, 0, r, 0, 0);
      if (spec.resize) spec.resize(d);
      d.draw();
    };
    d.draw = function () { var c = d.ctx; c.clearRect(0, 0, d.W, d.H); c.save(); spec.draw(d, c); c.restore(); d.drawHandles(c); };
    var raf = 0, last = 0;
    function frame(ts) {
      raf = 0; var dt = last ? Math.min((ts - last) / 1000, 0.05) : 0; last = ts;
      if (spec.step && dt > 0) spec.step(d, dt);
      d.draw();
      if (d.playing && d.visible) raf = requestAnimationFrame(frame); else last = 0;
    }
    d.kick = function () { if (!raf && d.playing && d.visible) { last = 0; raf = requestAnimationFrame(frame); } };
    d.redraw = function () { if (!raf) { raf = requestAnimationFrame(function (ts) { raf = 0; d.draw(); d.kick(); }); } };
    d.setVisible = function (v) { d.visible = v; if (v) d.kick(); };
    d.play = function (on) { d.playing = on; if (d.playBtn) { d.playBtn.textContent = on ? '暂停' : '播放'; d.playBtn.setAttribute('aria-pressed', on); } if (on) d.kick(); else d.redraw(); };
    /* —— 控件 —— */
    d.slider = function (label, min, max, step, val, fmt, on) {
      var w = h('label', { 'class': 'demo-sl' }, d.ctl), sp = h('span', null, w), inp = h('input', { type: 'range', min: min, max: max, step: step, value: val }, w);
      var o = { v: +val, el: inp, set: function (x) { o.v = +x; inp.value = x; sp.innerHTML = label + '　<b>' + fmt(o.v) + '</b>'; } };
      o.set(val);
      inp.addEventListener('input', function () { o.set(inp.value); if (on) on(o.v); d.redraw(); });
      return o;
    };
    d.seg = function (label, opts, val, on) {
      var w = h('div', { 'class': 'demo-seg', role: 'group', 'aria-label': label }, d.ctl); h('span', null, w, label);
      var o = { v: val, btns: [] };
      opts.forEach(function (op) {
        var b = h('button', { type: 'button', 'aria-pressed': op[0] === val }, w, op[1]);
        b.addEventListener('click', function () { o.v = op[0]; o.btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); if (on) on(o.v); d.redraw(); });
        o.btns.push(b);
      });
      o.set = function (v) { o.v = v; o.btns.forEach(function (x, i) { x.setAttribute('aria-pressed', opts[i][0] === v); }); };
      return o;
    };
    d.button = function (label, on) { if (!d.row) d.row = h('div', { 'class': 'demo-row' }, d.ctl); var b = h('button', { type: 'button', 'class': 'demo-btn' }, d.row, label); b.addEventListener('click', function () { on(); d.redraw(); }); return b; };
    d.playToggle = function () { d.playBtn = d.button('播放', function () { d.play(!d.playing); }); d.playBtn.setAttribute('aria-pressed', 'false'); };
    d.out = function (rows, note) {
      var s = '<dl>' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl>';
      if (note) s += '<p>' + note + '</p>';
      if (s !== d._lastOut) { d.outEl.innerHTML = s; d._lastOut = s; }
    };
    /* —— 可拖动把手（显示 r≈9px，触控命中半径 24px ⇒ 48px 目标） —— */
    d.handle = function (o) { o.r = o.r || 9; d.handles.push(o); return o; };
    /* —— 可抓取物体：抓住拖动、松手按平滑后的手势速度抛出 ——
       o = { get()→[x,y] 物体中心, r 物体半径 px（数或函数）, set(x,y) 新中心（已扣除抓取点偏移）,
             start(x,y) 抓起, release(vx,vy) 松手（px/s；手指停住后松手 ⇒ 0）, hidden(), autoplay: false 可关闭“抓起即播放” }
       命中：距中心 ≤ max(24, r+10) px；物体由 demo 自己画（框架不画把手圆点） */
    d.grab = function (o) { o.body = true; o.r = o.r || 12; d.handles.push(o); return o; };
    function rad(o) { return typeof o.r === 'function' ? o.r() : o.r; }
    d.drawHandles = function (c) {
      d.handles.forEach(function (o) {
        if (o.body || (o.hidden && o.hidden())) return;
        var p = o.get(); c.save(); c.beginPath(); c.arc(p[0], p[1], o.r + 6, 0, 7); c.fillStyle = COL.dark ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.07)'; c.fill();
        c.beginPath(); c.arc(p[0], p[1], o.r, 0, 7); c.fillStyle = o.color ? o.color() : COL.accent; c.fill();
        c.lineWidth = 2; c.strokeStyle = COL.surface; c.stroke(); c.restore();
      });
    };
    function pos(e) { var b = d.cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; }
    function hit(p) { /* 物体按“到边缘的距离”比较，大物体内部优先于附近的小把手 */
      var best = null, bs = Infinity;
      d.handles.forEach(function (o) {
        if (o.hidden && o.hidden()) return;
        var q = o.get(), dd = Math.hypot(q[0] - p[0], q[1] - p[1]), rr = o.body ? rad(o) : 0;
        if (dd <= Math.max(24, rr + 10) && dd - rr < bs) { bs = dd - rr; best = o; }
      });
      return best;
    }
    var drag = null, pid = null, off = [0, 0], samp = [];
    function now() { return window.performance ? performance.now() : Date.now(); }
    function vel() { /* 最近 ~100 ms 的平均速度；手指停住 >80 ms 视为 0 */
      var n = samp.length, l = samp[n - 1], j = n - 1;
      if (n < 2 || now() - l[0] > 80) return [0, 0];
      while (j > 0 && l[0] - samp[j - 1][0] <= 100) j--;
      if (j === n - 1) j--;
      var dt = (l[0] - samp[j][0]) / 1000;
      return dt > 0.004 ? [(l[1] - samp[j][1]) / dt, (l[2] - samp[j][2]) / dt] : [0, 0];
    }
    function sample(p) { var t = now(); samp.push([t, p[0], p[1]]); while (samp.length > 2 && t - samp[0][0] > 160) samp.shift(); }
    d.cv.addEventListener('touchstart', function (e) { var t = e.touches[0], b = d.cv.getBoundingClientRect(); if (drag || hit([t.clientX - b.left, t.clientY - b.top])) e.preventDefault(); }, { passive: false });
    d.cv.addEventListener('pointerdown', function (e) {
      if (drag) return; var p = pos(e), o = hit(p); if (!o) return;
      drag = o; pid = e.pointerId; d.cv.setPointerCapture(e.pointerId); e.preventDefault(); d.cv.classList.add('grabbing');
      if (o.body) {
        var q = o.get(); off = [p[0] - q[0], p[1] - q[1]]; samp = []; sample(p); d.grabbed = true;
        if (o.start) o.start(q[0], q[1]);
        if (d.playBtn && o.autoplay !== false) d.play(true);
      } else if (o.start) o.start();
    });
    d.cv.addEventListener('pointermove', function (e) {
      var p = pos(e);
      if (drag) { if (e.pointerId !== pid) return; if (drag.body) { sample(p); drag.set(p[0] - off[0], p[1] - off[1]); } else drag.set(p[0], p[1]); d.redraw(); return; }
      if (e.pointerType === 'mouse') d.cv.classList.toggle('grab', !!hit(p));
    });
    function up(e) {
      if (drag && e && e.pointerId !== pid) return;
      if (drag && drag.body && drag.release) { var v = e && e.type === 'pointerup' ? vel() : [0, 0]; drag.release(v[0], v[1]); }
      if (drag && drag.end) drag.end();
      drag = null; pid = null; d.cv.classList.remove('grabbing'); d.redraw();
    }
    d.cv.addEventListener('pointerup', up); d.cv.addEventListener('pointercancel', up);
    d.dragging = function (o) { return o ? drag === o : !!drag; };
    d.grabVel = function () { return drag && drag.body ? vel() : [0, 0]; }; /* 拖动中的平滑手势速度 px/s */
    spec.init(d);
    if (spec.animated) { d.playToggle(); d.playing = !RM.matches; d.play(d.playing); }
    if (window.ResizeObserver) new ResizeObserver(function () { if (stage.clientWidth !== d.W) d.resize(); }).observe(stage);
    d.resize();
  }
  /* —— 绘图工具 —— */
  function arrow(c, x1, y1, x2, y2, col, w, label, lpos) {
    var L = Math.hypot(x2 - x1, y2 - y1); c.save(); c.strokeStyle = c.fillStyle = col; c.lineWidth = w || 2.5;
    if (L > 1) {
      var a = Math.atan2(y2 - y1, x2 - x1), hd = Math.min(10, L * 0.45);
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2 - Math.cos(a) * hd * 0.6, y2 - Math.sin(a) * hd * 0.6); c.stroke();
      c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - hd * Math.cos(a - 0.4), y2 - hd * Math.sin(a - 0.4)); c.lineTo(x2 - hd * Math.cos(a + 0.4), y2 - hd * Math.sin(a + 0.4)); c.closePath(); c.fill();
    }
    if (label) { c.font = '600 13px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; var lp = lpos || 14, ang = Math.atan2(y2 - y1, x2 - x1);
      txt(c, label, x2 + Math.cos(ang) * lp, y2 + Math.sin(ang) * lp, col); }
    c.restore();
  }
  function txt(c, s, x, y, col, font, align, base) {
    c.save(); c.font = font || '13px system-ui,"PingFang SC","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif'; c.textAlign = align || 'center'; c.textBaseline = base || 'middle';
    c.lineWidth = 3; c.strokeStyle = COL.surface; c.lineJoin = 'round'; c.strokeText(s, x, y); c.fillStyle = col || COL.ink; c.fillText(s, x, y); c.restore();
  }
  function line(c, pts, col, w, dash) { c.save(); c.strokeStyle = col; c.lineWidth = w || 1.5; if (dash) c.setLineDash(dash); c.beginPath(); pts.forEach(function (p, i) { i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.stroke(); c.restore(); }
  function dot(c, x, y, r, col) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = col; c.fill(); }
  /* 线性映射：世界坐标 → 屏幕 */
  function Map(x0, x1, y0, y1, L, R, T, B) {
    var m = { x0: x0, x1: x1, y0: y0, y1: y1, L: L, R: R, T: T, B: B };
    m.X = function (x) { return m.L + (x - m.x0) / (m.x1 - m.x0) * (m.R - m.L); };
    m.Y = function (y) { return m.B - (y - m.y0) / (m.y1 - m.y0) * (m.B - m.T); };
    m.ix = function (X) { return m.x0 + (X - m.L) / (m.R - m.L) * (m.x1 - m.x0); };
    m.iy = function (Y) { return m.y0 + (m.B - Y) / (m.B - m.T) * (m.y1 - m.y0); };
    m.dx = function (px) { return px * (m.x1 - m.x0) / (m.R - m.L); };   /* 屏幕位移/速度 → 世界（如 grab 的 px/s → m/s） */
    m.dy = function (py) { return -py * (m.y1 - m.y0) / (m.B - m.T); };
    return m;
  }
  function axes(c, m, xl, yl, xt, yt) {
    c.save(); c.strokeStyle = COL.line; c.lineWidth = 1; c.font = '11px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif'; c.fillStyle = COL['ink-3'];
    if (xt) for (var x = Math.ceil(m.x0 / xt) * xt; x <= m.x1 + 1e-9; x += xt) { c.beginPath(); c.moveTo(m.X(x), m.T); c.lineTo(m.X(x), m.B); c.stroke(); c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText(+x.toFixed(6), m.X(x), m.B + 3); }
    if (yt) for (var y = Math.ceil(m.y0 / yt) * yt; y <= m.y1 + 1e-9; y += yt) { c.beginPath(); c.moveTo(m.L, m.Y(y)); c.lineTo(m.R, m.Y(y)); c.stroke(); c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(+y.toFixed(6), m.L - 4, m.Y(y)); }
    c.strokeStyle = COL['ink-3']; c.lineWidth = 1.5; var zy = Math.max(m.T, Math.min(m.B, m.Y(0))), zx = Math.max(m.L, Math.min(m.R, m.X(0)));
    c.beginPath(); c.moveTo(m.L, zy); c.lineTo(m.R, zy); c.moveTo(zx, m.T); c.lineTo(zx, m.B); c.stroke(); c.restore();
    if (xl) txt(c, xl, m.R - 4, zy - 10, COL['ink-2'], null, 'right');
    if (yl) txt(c, yl, zx + 6, m.T + 8, COL['ink-2'], null, 'left');
  }
  function bars(c, x, y, w, hgt, items, max, title) { /* 竖直柱状图 items=[[label,val,col]] */
    var n = items.length, bw = w / n; txt(c, title || '', x + w / 2, y - 10, COL['ink-2'], '600 12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif');
    line(c, [[x, y + hgt], [x + w, y + hgt]], COL['ink-3'], 1);
    items.forEach(function (it, i) {
      var v = it[1], bh = Math.min(Math.abs(v) / (max || 1), 1.05) * hgt * (v < 0 ? 0 : 1);
      c.fillStyle = it[2]; c.fillRect(x + i * bw + bw * 0.18, y + hgt - bh, bw * 0.64, bh);
      txt(c, it[0], x + i * bw + bw / 2, y + hgt + 11, COL['ink-2'], '12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif');
    });
  }
  /* —— 真实化外观（可复用；全部只用 canvas 2D，无外部资源） —— */
  var FONT = 'system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif', RGB = {};
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rgb(col) {
    if (RGB[col]) return RGB[col];
    var m, r = [136, 136, 136];
    if ((m = /^#([0-9a-f]{3,8})$/i.exec(col))) { var s = m[1]; if (s.length < 6) s = s.replace(/./g, '$&$&'); r = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]; }
    else if ((m = /rgba?\(([^)]+)\)/.exec(col))) r = m[1].split(/[ ,\/]+/).filter(Boolean).slice(0, 3).map(parseFloat);
    return (RGB[col] = r);
  }
  function shade(col, k) { var t = k < 0 ? 0 : 255, a = Math.min(Math.abs(k), 1); return 'rgb(' + rgb(col).map(function (v) { return Math.round(v + (t - v) * a); }).join(',') + ')'; } /* k>0 提亮，k<0 压暗 */
  function alpha(col, a) { return 'rgba(' + rgb(col).join(',') + ',' + a + ')'; }
  function rrect(c, x, y, w, hgt, r) { r = Math.min(r, w / 2, hgt / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + hgt, r); c.arcTo(x + w, y + hgt, x, y + hgt, r); c.arcTo(x, y + hgt, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  /* 柔和接触阴影（椭圆径向渐变） */
  function shadow(c, x, y, rx, ry, a) {
    if (!(rx > 0.5)) return; c.save(); c.translate(x, y); c.scale(1, Math.max(ry, 0.5) / rx);
    var g = c.createRadialGradient(0, 0, 0, 0, 0, rx), k = Math.min(0.6, (a == null ? 0.28 : a) * (COL.dark ? 1.6 : 1));
    g.addColorStop(0, 'rgba(0,0,0,' + k + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, 7); c.fill(); c.restore();
  }
  /* 立体小球：o = { spin 滚动角(rad) 画一道标记, label, alpha, flat 残影用的平面圆, shadowY 地面 y（画投影）, shadowS 投影缩放 } */
  function drawBall(c, x, y, r, col, o) {
    o = o || {}; c.save(); if (o.alpha != null) c.globalAlpha *= o.alpha;
    if (o.shadowY != null) { var ss = o.shadowS == null ? 1 : o.shadowS; shadow(c, x, o.shadowY, r * 1.05 * ss, r * 0.3 * ss, 0.32 * ss); }
    c.beginPath(); c.arc(x, y, r, 0, 7);
    if (o.flat) { c.fillStyle = col; c.fill(); c.restore(); return; }
    var g = c.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.08, x, y, r * 1.02);
    g.addColorStop(0, shade(col, 0.6)); g.addColorStop(0.4, col); g.addColorStop(1, shade(col, -0.5)); c.fillStyle = g; c.fill();
    if (o.spin != null) { c.save(); c.clip(); c.strokeStyle = 'rgba(255,255,255,.38)'; c.lineWidth = Math.max(1.5, r * 0.16); var ca = Math.cos(o.spin) * r, sa = Math.sin(o.spin) * r; c.beginPath(); c.moveTo(x - ca, y - sa); c.lineTo(x + ca, y + sa); c.stroke(); c.restore(); }
    c.beginPath(); c.arc(x, y, r - 0.5, 0, 7); c.lineWidth = 1; c.strokeStyle = shade(col, -0.6); c.stroke();
    c.beginPath(); c.ellipse(x - r * 0.36, y - r * 0.44, r * 0.26, r * 0.16, -0.6, 0, 7); c.fillStyle = 'rgba(255,255,255,.55)'; c.fill();
    if (o.label) label(c, o.label, x, y + 0.5, r);
    c.restore();
  }
  function label(c, s, x, y, r) { c.font = '600 ' + Math.round(clamp(r * 0.8, 10, 14)) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = 2.5; c.strokeStyle = 'rgba(0,0,0,.45)'; c.strokeText(s, x, y); c.fillStyle = '#fff'; c.fillText(s, x, y); }
  /* 实验小车（力学台车）：x 中心，y 轨道面（车轮着地处）；o = { wheel 车轮转角(rad), label, alpha, flat } */
  function drawCart(c, x, y, w, hgt, col, o) {
    o = o || {}; var wr = Math.max(4, hgt * 0.34), top = y - 2 * wr * 0.9 - hgt, bot = top + hgt;
    c.save(); if (o.alpha != null) c.globalAlpha *= o.alpha;
    if (o.flat) { rrect(c, x - w / 2, top, w, hgt + wr, 3); c.fillStyle = col; c.fill(); c.restore(); return; }
    shadow(c, x, y + 1, w * 0.58, 3.5, 0.35);
    var g = c.createLinearGradient(0, top, 0, bot); g.addColorStop(0, shade(col, 0.35)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.35));
    rrect(c, x - w / 2, top, w, hgt, 3); c.fillStyle = g; c.fill(); c.lineWidth = 1; c.strokeStyle = shade(col, -0.55); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x - w / 2 + 3, top + 1.5, w - 6, 1.5);                       /* 顶面高光 */
    c.fillStyle = COL.dark ? '#9aa0ab' : '#5d636e'; c.fillRect(x - w / 2 - 2, top + hgt * 0.3, 2.5, hgt * 0.45); c.fillRect(x + w / 2 - 0.5, top + hgt * 0.3, 2.5, hgt * 0.45); /* 两端缓冲器 */
    [-0.3, 0.3].forEach(function (k) { wheel(c, x + k * w, y - wr, wr, o.wheel || 0); });
    if (o.label) label(c, o.label, x, top + hgt / 2, hgt);
    c.restore();
  }
  function wheel(c, x, y, r, ang) {
    c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = '#2b2e35'; c.fill();
    var g = c.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r * 0.62); g.addColorStop(0, '#e9ecf1'); g.addColorStop(1, '#8d939e');
    c.beginPath(); c.arc(x, y, r * 0.6, 0, 7); c.fillStyle = g; c.fill();
    c.strokeStyle = '#4a4f59'; c.lineWidth = 1.2; c.beginPath();
    for (var i = 0; i < 3; i++) { var a = ang + i * 2.0944; c.moveTo(x, y); c.lineTo(x + Math.cos(a) * r * 0.58, y + Math.sin(a) * r * 0.58); }
    c.stroke(); c.beginPath(); c.arc(x, y, r * 0.16, 0, 7); c.fillStyle = '#3a3e46'; c.fill();
  }
  /* 木纹：离屏画一块可无缝平铺的纹理，按主题缓存，作为 pattern 使用（每帧零额外绘制成本） */
  var WOOD = {};
  function woodTile(tone) {
    var key = (COL.dark ? 'd' : 'l') + tone; if (WOOD[key]) return WOOD[key];
    var S = 2, w = 160, hh = 64, cv = document.createElement('canvas'); cv.width = w * S; cv.height = hh * S;
    var g = cv.getContext('2d'), base = COL.dark ? [112, 82, 54] : [216, 176, 124], seed = 11 + tone * 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    g.scale(S, S); g.fillStyle = 'rgb(' + base.map(function (v) { return Math.round(v * (1 - tone * 0.18)); }).join(',') + ')'; g.fillRect(0, 0, w, hh);
    for (var i = 0; i < 26; i++) {
      var y0 = rnd() * hh, amp = 0.6 + rnd() * 2.4, k = 1 + (i % 3), ph = rnd() * 6.283;
      g.strokeStyle = (COL.dark ? 'rgba(28,16,6,' : 'rgba(110,64,26,') + (0.07 + rnd() * 0.2).toFixed(3) + ')'; g.lineWidth = 0.5 + rnd() * 1.3;
      for (var dy = -hh; dy <= hh; dy += hh) { g.beginPath(); for (var x = 0; x <= w; x += 4) { var yy = y0 + dy + amp * Math.sin(x / w * 6.2832 * k + ph); x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }
    }
    return (WOOD[key] = { cv: cv, S: S, key: key });
  }
  function woodPattern(c, tone) { /* 返回可作 fillStyle 的木纹；tone 0 浅色木、1 深色木 */
    var t = woodTile(tone || 0), pc = c.__wood || (c.__wood = {}), p = pc[t.key];
    if (!p) { p = pc[t.key] = c.createPattern(t.cv, 'repeat'); if (p.setTransform && window.DOMMatrix) p.setTransform(new DOMMatrix().scale(1 / t.S)); }
    return p;
  }
  function wood(c, x, y, w, hgt, o) { /* 木纹矩形（带明暗与描边）；o = { tone, stroke: false } */
    o = o || {}; c.save(); c.fillStyle = woodPattern(c, o.tone); c.fillRect(x, y, w, hgt);
    var g = c.createLinearGradient(0, y, 0, y + hgt); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(0,0,0,.16)'); c.fillStyle = g; c.fillRect(x, y, w, hgt);
    if (o.stroke !== false) { c.lineWidth = 1; c.strokeStyle = COL.dark ? 'rgba(0,0,0,.6)' : 'rgba(80,50,20,.55)'; c.strokeRect(x + 0.5, y + 0.5, w - 1, hgt - 1); }
    c.restore();
  }
  /* 物块：中心 (x,y)，o = { angle 旋转(rad，画布方向), label, wood: true 木块 / false 金属色块, alpha } */
  function drawBlock(c, x, y, w, hgt, col, o) {
    o = o || {}; c.save(); c.translate(x, y); if (o.angle) c.rotate(o.angle); if (o.alpha != null) c.globalAlpha *= o.alpha;
    shadow(c, 0, hgt / 2 + 1, w * 0.6, 3, 0.4);
    if (o.wood !== false) wood(c, -w / 2, -hgt / 2, w, hgt, { tone: o.tone == null ? 1 : o.tone });
    else { var g = c.createLinearGradient(0, -hgt / 2, 0, hgt / 2); g.addColorStop(0, shade(col, 0.35)); g.addColorStop(1, shade(col, -0.35)); c.fillStyle = g; c.fillRect(-w / 2, -hgt / 2, w, hgt); c.strokeStyle = shade(col, -0.55); c.strokeRect(-w / 2 + 0.5, -hgt / 2 + 0.5, w - 1, hgt - 1); }
    if (col && o.wood !== false) { c.fillStyle = col; c.fillRect(-w / 2 + 1, -hgt / 2 + 1, w - 2, 3); } /* 色条：区分是哪一个物体 */
    if (o.label) label(c, o.label, 0, 1, Math.min(w, hgt) * 0.55);
    c.restore();
  }
  /* 挂钩砝码（槽码）：x 中心，y 顶端（挂钩处） */
  function drawWeight(c, x, y, w, hgt, col, o) {
    o = o || {}; c.save(); var n = Math.max(1, Math.min(4, Math.round(hgt / 9))), dh = (hgt - 4) / n;
    c.strokeStyle = COL.dark ? '#c9cdd5' : '#4a4f59'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y + 2, 2.2, 0, 7); c.stroke();
    for (var i = 0; i < n; i++) {
      var yy = y + 4 + i * dh, g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      g.addColorStop(0, shade(col, -0.45)); g.addColorStop(0.3, shade(col, 0.45)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.55));
      rrect(c, x - w / 2, yy, w, dh - 1, 2); c.fillStyle = g; c.fill(); c.lineWidth = 0.8; c.strokeStyle = shade(col, -0.6); c.stroke();
    }
    if (o.label) label(c, o.label, x, y + 4 + (hgt - 4) / 2, Math.min(w, hgt) * 0.55);
    c.restore();
  }
  /* 滑轮：带辐条随绳转动，ang = 绳走过的弧长 / r */
  function drawPulley(c, x, y, r, ang) {
    c.save(); var g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, '#f2f4f7'); g.addColorStop(0.7, '#a7adb7'); g.addColorStop(1, '#6b717c');
    c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = g; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#4a4f59'; c.stroke();
    c.beginPath(); c.arc(x, y, r * 0.78, 0, 7); c.lineWidth = 1; c.strokeStyle = 'rgba(60,64,72,.6)'; c.stroke();
    c.beginPath(); for (var i = 0; i < 4; i++) { var a = ang + i * Math.PI / 2; c.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2); c.lineTo(x + Math.cos(a) * r * 0.74, y + Math.sin(a) * r * 0.74); }
    c.lineWidth = 1.6; c.strokeStyle = '#555b66'; c.stroke();
    c.beginPath(); c.arc(x, y, r * 0.2, 0, 7); c.fillStyle = '#3a3e46'; c.fill(); c.restore();
  }
  /* 地面/轨道：o.kind = 'floor'（实验台面 + 剖面线）| 'rail'（铝轨）| 'soil'（室外地面）；o.depth 厚度 px；o.stops（rail 端挡板，默认画） */
  function ground(c, x0, x1, y, o) {
    o = o || {}; var k = o.kind || 'floor', dp = o.depth || (k === 'rail' ? 7 : 8), g; c.save();
    if (k === 'rail') {
      g = c.createLinearGradient(0, y, 0, y + dp); g.addColorStop(0, COL.dark ? '#c4c9d2' : '#eef0f3'); g.addColorStop(0.5, COL.dark ? '#7e8590' : '#b7bcc5'); g.addColorStop(1, COL.dark ? '#4c525c' : '#8c929c');
      c.fillStyle = g; c.fillRect(x0, y, x1 - x0, dp); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x0, y + dp * 0.55, x1 - x0, 1);
      if (o.stops !== false) { c.fillStyle = COL.dark ? '#2d3139' : '#5d636e'; c.fillRect(x0 - 3, y - 6, 4, dp + 6); c.fillRect(x1 - 1, y - 6, 4, dp + 6); } /* 端挡板（o.stops: false 不画，用于画面外仍延伸的导轨） */
    } else if (k === 'soil') {
      g = c.createLinearGradient(0, y, 0, y + dp); g.addColorStop(0, COL.dark ? 'rgba(120,150,90,.55)' : 'rgba(110,150,70,.55)'); g.addColorStop(0.35, COL.dark ? 'rgba(110,90,60,.35)' : 'rgba(150,115,70,.30)'); g.addColorStop(1, 'rgba(150,115,70,0)');
      c.fillStyle = g; c.fillRect(x0, y, x1 - x0, dp);
    } else {
      g = c.createLinearGradient(0, y, 0, y + dp); g.addColorStop(0, alpha(COL['ink-3'], 0.28)); g.addColorStop(1, alpha(COL['ink-3'], 0)); c.fillStyle = g; c.fillRect(x0, y, x1 - x0, dp);
      c.strokeStyle = alpha(COL['ink-3'], 0.45); c.lineWidth = 1; c.beginPath(); for (var x = x0 + 4; x < x1; x += 8) { c.moveTo(x, y + 1); c.lineTo(x - 5, y + Math.min(dp, 7)); } c.stroke();
    }
    c.strokeStyle = COL['ink-3']; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); c.restore();
  }
  /* 刻度尺：X(u) 世界→屏幕x；在 [u0,u1] 画尺身（顶边 y，高 o.h）。o = { minor, major, every 标数字间隔, fmt(u), unit } */
  function ruler(c, X, u0, u1, y, o) {
    o = o || {}; var hh = o.h || 16, mi = o.minor, ma = o.major || mi * 5, ev = o.every || ma, fmt = o.fmt || function (u) { return String(+u.toFixed(6)).replace('-', '−'); };
    var xa = X(u0), xb = X(u1), ink = COL.dark ? '#efe6c8' : '#3b3020'; c.save();
    var g = c.createLinearGradient(0, y, 0, y + hh); g.addColorStop(0, COL.dark ? '#6a5f3e' : '#f6e7a8'); g.addColorStop(1, COL.dark ? '#4e4630' : '#e3cf7e');
    rrect(c, Math.min(xa, xb) - 6, y, Math.abs(xb - xa) + 12, hh, 2); c.fillStyle = g; c.fill(); c.lineWidth = 1; c.strokeStyle = COL.dark ? '#2e2a1d' : '#b49a45'; c.stroke();
    var px = Math.abs(X(u0 + mi) - xa), n0 = Math.ceil(u0 / mi - 1e-9), n1 = Math.floor(u1 / mi + 1e-9);
    c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = 1; c.font = '10px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'bottom'; c.beginPath();
    for (var n = n0; n <= n1; n++) {
      var u = n * mi, isM = Math.abs(u / ma - Math.round(u / ma)) < 1e-6; if (!isM && px < 3) continue;
      var xx = Math.round(X(u)) + 0.5; c.moveTo(xx, y); c.lineTo(xx, y + hh * (isM ? 0.5 : 0.28));
      if (Math.abs(u / ev - Math.round(u / ev)) < 1e-6) c.fillText(fmt(u), xx, y + hh - 0.5);
    }
    c.stroke(); if (o.unit) { c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillStyle = COL['ink-3']; c.font = '10px ' + FONT; c.fillText(o.unit, Math.min(xa, xb) - c.measureText(fmt(xa < xb ? u0 : u1)).width / 2 - 5, y + hh / 2); } /* 单位写在尺左侧外 */
    c.restore();
  }
  /* 轨迹残影缓冲：push(时间, a, b) 至少间隔 gap 记一个点，最多 n 个；时间倒退（循环重播）自动清空。
     each(fn(a, b, f 新旧程度 0→1, t)) 由 demo 决定怎么画（如半透明小球）。prefers-reduced-motion 下仍保留：它是静态信息 */
  function Trail(n, gap) {
    var t = { pts: [], n: n || 12, gap: gap || 0, last: -Infinity };
    t.push = function (time, a, b) { if (time < t.last - 1e-9) t.clear(); if (time - t.last < t.gap) return; t.last = time; t.pts.push([a, b, time]); if (t.pts.length > t.n) t.pts.shift(); };
    t.clear = function () { t.pts.length = 0; t.last = -Infinity; };
    t.each = function (fn) { var k = t.pts.length; t.pts.forEach(function (p, i) { fn(p[0], p[1], (i + 1) / (k + 1), p[2]); }); };
    return t;
  }
  /* 平滑过渡：指数逼近目标（时间常数 tau 秒）；减少动态效果时直接跳到目标 */
  function approach(cur, tgt, dt, tau) { return RM.matches || !(tau > 0) ? tgt : tgt + (cur - tgt) * Math.exp(-dt / tau); }
  function hint(c, s, x, y, align) { txt(c, s, x, y, COL['ink-3'], '12px ' + FONT, align || 'left'); }
  /* —— 光、粒子与电学器材（多个 demo 共用） —— */
  /* 柔光：径向渐变光晕（灯、激光点、发光物体） */
  function glow(c, x, y, r, col, a) {
    if (!(r > 0.5)) return; var g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, alpha(col, a == null ? 0.6 : a)); g.addColorStop(1, alpha(col, 0));
    c.save(); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.restore();
  }
  /* 波长(nm) → 近似显示色 'rgb(…)'；可见光以外（< 380 紫外、> 750 红外）返回暗紫/暗红，另给 o.vis = false */
  function wlColor(w) {
    var r = 0, g = 0, b = 0;
    if (w < 440) { r = clamp((440 - w) / 60, 0, 1); b = 1; } else if (w < 490) { g = (w - 440) / 50; b = 1; } else if (w < 510) { g = 1; b = (510 - w) / 20; } else if (w < 580) { r = (w - 510) / 70; g = 1; } else if (w < 645) { r = 1; g = (645 - w) / 65; } else r = 1;
    var k = w < 380 ? 0.55 : w > 750 ? 0.5 : 1; return 'rgb(' + [r, g, b].map(function (v) { return Math.round(v * 255 * k); }).join(',') + ')';
  }
  /* 离屏缓存小图（按主题、像素比缓存）：大量相同物体（原子核、分子、电子）用 drawImage 画，免去每帧逐个做渐变 */
  var SPR = {}, nSPR = 0;
  function sprite(key, w, hgt, fn) {
    var S = Math.min(window.devicePixelRatio || 1, 2), k = key + '|' + (COL.dark ? 'd' : 'l') + w + 'x' + hgt + '@' + S;
    if (SPR[k]) return SPR[k]; if (++nSPR > 300) { SPR = {}; nSPR = 1; }
    var cv = document.createElement('canvas'); cv.width = Math.ceil(w * S); cv.height = Math.ceil(hgt * S); var g = cv.getContext('2d'); g.scale(S, S); fn(g, w, hgt); return (SPR[k] = cv);
  }
  function ballSprite(r, col) { var s = Math.ceil(2 * r + 2); return sprite('ball' + col + r, s, s, function (g) { drawBall(g, s / 2, s / 2, r, col); }); } /* 立体小球的缓存图，边长 ⌈2r+2⌉ px */
  function blit(c, img, x, y, w, hgt) { c.drawImage(img, x - w / 2, y - hgt / 2, w, hgt); } /* 以 (x,y) 为中心画缓存图，w×hgt 为显示尺寸（CSS px） */
  /* 点电荷（小球 + 符号）：q > 0 红（--c2）、q < 0 蓝（--c1）；o = drawBall 的选项（flat 残影时不画符号） */
  function drawCharge(c, x, y, r, q, o) {
    o = o || {}; drawBall(c, x, y, r, q > 0 ? COL.c2 : COL.c1, o); if (o.flat) return;
    var s = r * 0.48; c.save(); if (o.alpha != null) c.globalAlpha *= o.alpha; c.strokeStyle = '#fff'; c.lineWidth = Math.max(1.6, r * 0.2); c.lineCap = 'round'; c.beginPath();
    c.moveTo(x - s, y); c.lineTo(x + s, y); if (q > 0) { c.moveTo(x, y - s); c.lineTo(x, y + s); } c.stroke(); c.restore();
  }
  /* 匀强磁场区域：淡色底 + ⊙（dir > 0，垂直纸面向外）/ ⊗（dir < 0，向里）；o = { gap 间距, r 符号半径, ox 横向偏移（随画面滚动） } */
  function bField(c, x0, y0, x1, y1, dir, o) {
    o = o || {}; var gp = o.gap || 38, r = o.r || 5.5, col = alpha(COL.accent, 0.6), sx = x0 + gp / 2 - (((o.ox || 0) % gp) + gp) % gp, x, y; c.save();
    c.fillStyle = alpha(COL.accent, COL.dark ? 0.13 : 0.08); c.fillRect(x0, y0, x1 - x0, y1 - y0);
    c.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); c.clip();
    c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.1; c.beginPath();
    for (x = sx; x < x1 + r; x += gp) for (y = y0 + gp / 2; y < y1 + r; y += gp) {
      c.moveTo(x + r, y); c.arc(x, y, r, 0, 7);
      if (dir < 0) { var k = r * 0.62; c.moveTo(x - k, y - k); c.lineTo(x + k, y + k); c.moveTo(x + k, y - k); c.lineTo(x - k, y + k); }
    }
    c.stroke();
    if (dir > 0) { c.beginPath(); for (x = sx; x < x1 + r; x += gp) for (y = y0 + gp / 2; y < y1 + r; y += gp) { c.moveTo(x + r * 0.32, y); c.arc(x, y, r * 0.32, 0, 7); } c.fill(); }
    c.restore();
  }
  /* 导线：铜色、带高光；o = { w 线宽, col } */
  function wire(c, pts, o) {
    o = o || {}; var w = o.w || 2; c.save(); c.lineJoin = 'round'; c.lineCap = 'round'; c.beginPath(); pts.forEach(function (p, i) { i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); });
    c.strokeStyle = o.col || (COL.dark ? '#c08a55' : '#8a5a2b'); c.lineWidth = w + 1; c.stroke();
    c.strokeStyle = COL.dark ? 'rgba(255,225,190,.4)' : 'rgba(255,228,196,.75)'; c.lineWidth = Math.max(0.7, w * 0.35); c.stroke(); c.restore();
  }
  /* 干电池：中心 (x,y)，长 L、直径 dm，ang 为“+ 极”所指方向（0 向右，−π/2 向上）；o = { col, label } */
  function drawCell(c, x, y, L, dm, ang, o) {
    o = o || {}; var hl = L / 2, hr = dm / 2, col = o.col || COL.c4; c.save(); c.translate(x, y); c.rotate(ang || 0);
    var g = c.createLinearGradient(0, -hr, 0, hr); g.addColorStop(0, shade(col, -0.35)); g.addColorStop(0.3, shade(col, 0.45)); g.addColorStop(0.62, col); g.addColorStop(1, shade(col, -0.5));
    var mt = c.createLinearGradient(0, -hr, 0, hr); mt.addColorStop(0, '#80868f'); mt.addColorStop(0.32, '#f1f3f6'); mt.addColorStop(1, '#646a74');
    c.fillStyle = mt; c.fillRect(-hl, -hr, 3, dm); c.fillRect(hl - 4, -hr * 0.36, 4, hr * 0.72);                /* − 底面、+ 极帽 */
    rrect(c, -hl + 2, -hr, L - 6, dm, 2); c.fillStyle = g; c.fill(); c.lineWidth = 0.8; c.strokeStyle = shade(col, -0.6); c.stroke();
    c.fillStyle = mt; c.fillRect(hl - 4 - L * 0.16, -hr, L * 0.16, dm);                                           /* + 端金属环 */
    c.restore();
    var ca = Math.cos(ang || 0), sa = Math.sin(ang || 0), px = -sa, py = ca;                                       /* 标 + / − （不随电池旋转） */
    txt(c, '+', x + ca * (hl - 8) + px * (hr + 8), y + sa * (hl - 8) + py * (hr + 8), COL.c2, '700 12px ' + FONT);
    txt(c, '−', x - ca * (hl - 6) + px * (hr + 8), y - sa * (hl - 6) + py * (hr + 8), COL.c1, '700 12px ' + FONT);
    if (o.label) txt(c, o.label, x - px * (hr + 12), y - py * (hr + 12), COL['ink-2'], '12px ' + FONT, Math.abs(px) > 0.5 ? (px > 0 ? 'right' : 'left') : 'center');
  }
  /* 色环电阻（含引线）：从 (x1,y1) 到 (x2,y2)；o = { len 本体长, th 粗细, col } */
  function drawResistor(c, x1, y1, x2, y2, o) {
    o = o || {}; var L = Math.hypot(x2 - x1, y2 - y1), bl = Math.min(o.len || L * 0.6, L - 4), th = o.th || 10, col = o.col || (COL.dark ? '#c9b48a' : '#dcc89c');
    wire(c, [[x1, y1], [x2, y2]], { w: 1.3, col: COL.dark ? '#aeb4bd' : '#7d838d' });
    c.save(); c.translate((x1 + x2) / 2, (y1 + y2) / 2); c.rotate(Math.atan2(y2 - y1, x2 - x1));
    rrect(c, -bl / 2, -th / 2, bl, th, th * 0.45); c.fillStyle = col; c.fill(); c.save(); c.clip();
    ['#8b5a2b', '#222', '#c0392b', '#c9a227'].forEach(function (b, i) { c.fillStyle = b; c.fillRect(-bl / 2 + bl * [0.2, 0.33, 0.46, 0.74][i], -th / 2, Math.max(2, bl * 0.07), th); });
    var g = c.createLinearGradient(0, -th / 2, 0, th / 2); g.addColorStop(0, 'rgba(0,0,0,.18)'); g.addColorStop(0.32, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(0,0,0,.32)'); c.fillStyle = g; c.fillRect(-bl / 2, -th / 2, bl, th); c.restore();
    rrect(c, -bl / 2, -th / 2, bl, th, th * 0.45); c.lineWidth = 0.8; c.strokeStyle = shade(col, -0.6); c.stroke(); c.restore();
  }
  /* 指针式电表：中心 (x,y)、半径 r；frac = 读数 / 满偏（截在 −0.02–1.04）；o = { label 'A' / 'V', max 满偏标注, text 表下读数 } */
  function drawMeter(c, x, y, r, frac, o) {
    o = o || {}; c.save(); shadow(c, x, y + r + 1, r * 0.9, 3, 0.3);
    var g = c.createLinearGradient(0, y - r, 0, y + r); g.addColorStop(0, '#6b717c'); g.addColorStop(1, '#2b2e35');
    c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = g; c.fill();
    c.beginPath(); c.arc(x, y, r * 0.84, 0, 7); c.fillStyle = COL.dark ? '#e2dfd6' : '#fbfaf4'; c.fill();
    var px = x, py = y + r * 0.38, R = r * 0.92, a0 = -Math.PI * 0.8, a1 = -Math.PI * 0.2, i, a;
    c.strokeStyle = '#3a3e46'; c.lineWidth = 1; c.beginPath(); c.arc(px, py, R * 0.86, a0, a1);
    for (i = 0; i <= 10; i++) { a = a0 + (a1 - a0) * i / 10; var k = i % 5 ? 0.78 : 0.7; c.moveTo(px + Math.cos(a) * R * 0.86, py + Math.sin(a) * R * 0.86); c.lineTo(px + Math.cos(a) * R * k, py + Math.sin(a) * R * k); }
    c.stroke();
    if (r >= 17 && o.max != null) { c.fillStyle = '#3a3e46'; c.font = Math.round(r * 0.24) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('0', px + Math.cos(a0) * R * 0.52, py + Math.sin(a0) * R * 0.52 + 2); c.fillText(String(o.max), px + Math.cos(a1) * R * 0.5, py + Math.sin(a1) * R * 0.5 + 2); }
    if (o.label) { c.fillStyle = '#3a3e46'; c.font = '700 ' + Math.round(r * 0.34) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.label, x, y + r * 0.6); }
    a = a0 + (a1 - a0) * clamp(isFinite(frac) ? frac : 1.04, -0.02, 1.04);
    c.strokeStyle = '#c0392b'; c.lineWidth = 1.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(a) * R * 0.9, py + Math.sin(a) * R * 0.9); c.stroke();
    c.beginPath(); c.arc(px, py, Math.max(1.8, r * 0.09), 0, 7); c.fillStyle = '#2b2e35'; c.fill(); c.restore();
    if (o.text) txt(c, o.text, x, y + r + 10, COL['ink-2'], '600 12px ' + FONT);
  }
  /* 滑动变阻器：瓷管绕线从 x0 到 x1（中心高 y），上方金属杆带滑片；frac 0–1 为滑片位置。
     返回 { x 滑片 x, rodY 金属杆 y, coilL / coilR 绕线两端接线处 [x,y], rodR 金属杆右端接线处 [x,y] } */
  function drawRheostat(c, x0, x1, y, frac, o) {
    o = o || {}; var th = o.th || 12, ry = y - th / 2 - 9, xs = x0 + (x1 - x0) * clamp(frac, 0, 1), i; c.save();
    shadow(c, (x0 + x1) / 2, y + th / 2 + 4, (x1 - x0) * 0.55, 3, 0.25);
    c.fillStyle = COL.dark ? '#5b606b' : '#8c929c'; c.fillRect(x0 - 7, ry - 3, 5, y + th / 2 - ry + 4); c.fillRect(x1 + 2, ry - 3, 5, y + th / 2 - ry + 4); /* 两端支架 */
    var g = c.createLinearGradient(0, y - th / 2, 0, y + th / 2); g.addColorStop(0, '#b9a37a'); g.addColorStop(0.35, '#f1e3c4'); g.addColorStop(1, '#8a7650');
    c.fillStyle = g; c.fillRect(x0, y - th / 2, x1 - x0, th);
    c.strokeStyle = 'rgba(70,45,20,.55)'; c.lineWidth = 0.9; c.beginPath(); for (i = x0 + 1.5; i < x1; i += 2.6) { c.moveTo(i, y - th / 2); c.lineTo(i + 1.2, y + th / 2); } c.stroke();
    var m = c.createLinearGradient(0, ry - 2, 0, ry + 2); m.addColorStop(0, '#f1f3f6'); m.addColorStop(1, '#6b717c'); c.fillStyle = m; c.fillRect(x0 - 6, ry - 2, x1 - x0 + 12, 4); /* 金属杆 */
    var sg = c.createLinearGradient(xs - 7, 0, xs + 7, 0); sg.addColorStop(0, '#3a3e46'); sg.addColorStop(0.4, '#9aa0aa'); sg.addColorStop(1, '#2b2e35');
    rrect(c, xs - 7, ry - 6, 14, 10, 2); c.fillStyle = sg; c.fill(); c.fillStyle = '#c9a227'; c.fillRect(xs - 1.5, ry + 4, 3, y - th / 2 - ry - 3); /* 滑片与簧片 */
    c.restore();
    return { x: xs, rodY: ry, coilL: [x0 - 4, y], coilR: [x1 + 4, y], rodR: [x1 + 6, ry] };
  }
  var DM = window.EJUDemo = { reg: function (n, f) { REG[n] = f; }, P: P, COL: COL, fx: fx, sci: sci, arrow: arrow, txt: txt, line: line, dot: dot, Map: Map, axes: axes, bars: bars,
    FONT: FONT, clamp: clamp, shade: shade, alpha: alpha, rrect: rrect, shadow: shadow, drawBall: drawBall, drawCart: drawCart, drawBlock: drawBlock, drawWeight: drawWeight, drawPulley: drawPulley,
    wood: wood, woodPattern: woodPattern, ground: ground, ruler: ruler, trail: Trail, approach: approach, hint: hint, reduced: function () { return RM.matches; },
    glow: glow, wlColor: wlColor, sprite: sprite, ballSprite: ballSprite, blit: blit, drawCharge: drawCharge, bField: bField, wire: wire, drawCell: drawCell, drawResistor: drawResistor, drawMeter: drawMeter, drawRheostat: drawRheostat };
  function boot() {
    readCols();
    var els = [].slice.call(document.querySelectorAll('.demo[data-demo]'));
    function init(el) { if (el._demo || !REG[el.getAttribute('data-demo')]) return; try { el._demo = new Demo(el, REG[el.getAttribute('data-demo')]()); ALL.push(el._demo); } catch (err) { el.textContent = '演示加载失败'; throw err; } }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) init(e.target); if (e.target._demo) e.target._demo.setVisible(e.isIntersecting); }); }, { rootMargin: '150px 0px' });
      els.forEach(function (el) { io.observe(el); });
    } else els.forEach(function (el) { init(el); el._demo.setVisible(true); });
    new MutationObserver(function () { readCols(); ALL.forEach(function (d) { d.redraw(); }); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (RM.addEventListener) RM.addEventListener('change', function () { if (RM.matches) ALL.forEach(function (d) { if (d.playBtn) d.play(false); }); });
  }
  DM.boot = boot;
})();
(function () {
  'use strict';
  var D = window.EJUDemo, P = D.P, C = D.COL, fx = D.fx, arrow = D.arrow, txt = D.txt, line = D.line, dot = D.dot, Map = D.Map, axes = D.axes, bars = D.bars;


  /* ① v–t 图构建：拖动折点，看 x–t 图与位移面积；或直接抓住小车推出去，像运动传感器一样实测 v–t / x–t */
  D.reg('vt', function () {
    var N = [[0, 0], [2, 4], [4, 4], [6, 0], [8, -2], [10, 0]], m1, m2, tr, tc = 0, mode, mu, dd;
    var YR = 50, CW = 44, CH = 15, HX = 2, VM = 3, E = 0.5; /* 手推实验：轨道 0–2 m（真实尺寸、真实时间），|v| ≤ 3 m/s，端挡板恢复系数 0.5 */
    var cx = 1, cv = 0, ca = 0, held = false, rt = 0, x0 = 1, dist = 0, rec = [], ghost = D.trail(6, 0.35), cartX = 0;
    var F12 = '600 12px ' + D.FONT;
    function hand() { return mode.v === 'hand'; }
    function maps() {
      var L = 44, R = dd.W - 14, H = dd.H, mid = H * 0.53, h = hand();
      tr = h ? Map(0, HX, 0, 1, L, R, 0, 1) : Map(-40, 40, 0, 1, L, R, 0, 1);
      m1 = Map(0, 10, h ? -VM : -6, h ? VM : 6, L, R, 100, mid);
      m2 = Map(0, 10, h ? 0 : -40, h ? HX : 40, L, R, mid + 34, H - 22);
    }
    function lim() { return tr.dx(CW / 2 + 3); } /* 小车半长（m），轨道两端留给挡板 */
    function enterHand(x) { cx = D.clamp(x, lim(), HX - lim()); cv = 0; ca = 0; rt = 0; x0 = cx; dist = 0; rec = [[0, cx, 0]]; ghost.clear(); }
    return { aspect: function (w) { return w < 520 ? 0.78 : 1.05; }, maxH: 640, animated: true,
      init: function (d) {
        dd = d;
        mode = d.seg('模式', [['graph', '拖折点（v–t 编辑）'], ['hand', '手推小车（实测）']], 'graph', function (v) { maps(); if (v === 'hand') enterHand(HX / 2); else tc = 0; });
        mu = d.slider('滚动阻力系数 μ（手推时）', 0, 0.2, 0.01, 0.05, function (v) { return fx(v, 2); });
        N.forEach(function (n) { d.handle({ hidden: hand, get: function () { return [m1.X(n[0]), m1.Y(n[1])]; }, set: function (x, y) { n[1] = Math.max(-6, Math.min(6, Math.round(m1.iy(y) * 2) / 2)); } }); });
        d.grab({ r: CW / 2, get: function () { return [cartX, YR - 17]; },
          start: function (x) { if (!hand()) { mode.set('hand'); maps(); } held = true; enterHand(tr.ix(x)); },
          set: function (x) { var nx = D.clamp(tr.ix(x), lim(), HX - lim()); dist += Math.abs(nx - cx); cx = nx; },
          release: function (vx) { held = false; cv = D.clamp(tr.dx(vx), -VM, VM); } });
        d.button('重置', function () { [0, 4, 4, 0, -2, 0].forEach(function (v, i) { N[i][1] = v; }); tc = 0; held = false; mode.set('graph'); maps(); });
      },
      resize: function () { maps(); },
      step: function (d, dt) {
        if (!hand()) { tc += dt * 1.25; if (tc > 10.8) tc = 0; return; }
        if (held) { cv = tr.dx(d.grabVel()[0]); ca = 0; }
        else {
          var r = P.slide1D(cx, cv, 0, mu.v * P.g, dt), lo = lim(), hi = HX - lo; dist += Math.abs(r.x - cx); cx = r.x; cv = r.v; ca = r.a;
          if (cx > hi) { cx = hi; if (cv > 0) cv = -E * cv; } else if (cx < lo) { cx = lo; if (cv < 0) cv = -E * cv; }
        }
        rt += dt;
        if (rt <= 10 && rt - rec[rec.length - 1][0] >= 0.03) rec.push([rt, cx, cv]);
        if (held || Math.abs(cv) > 0.02) ghost.push(rt, cx);
      },
      draw: function (d, c) {
        maps();
        var h = hand(), t = Math.min(tc, 10), xs = P.vtX(N, t), v = h ? cv : P.vtV(N, t), wr = Math.max(4, CH * 0.34), i;
        /* 轨道 + 刻度尺 + 小车（频闪残影） */
        D.ground(c, tr.L - 6, tr.R + 6, YR, { kind: 'rail', depth: 6 });
        D.ruler(c, tr.X, tr.x0, tr.x1, YR + 9, h ? { minor: 0.1, major: 0.5, fmt: function (u) { return String(Math.round(u * 100)); }, unit: 'cm' } : { minor: 5, major: 10, unit: 'm' });
        if (h) ghost.each(function (x, _, f) { D.drawCart(c, tr.X(x), YR, CW, CH, C.c1, { flat: true, alpha: 0.22 * f }); });
        else for (i = 5; i >= 1; i--) { var tg = t - i * 0.5; if (tg >= 0) D.drawCart(c, tr.X(Math.max(-40, Math.min(40, P.vtX(N, tg)))), YR, CW, CH, C.c1, { flat: true, alpha: 0.05 * (6 - i) }); }
        cartX = tr.X(h ? cx : Math.max(-40, Math.min(40, xs)));
        D.drawCart(c, cartX, YR, CW, CH, C.c1, { wheel: (cartX - tr.L) / wr });
        if (Math.abs(v) > 0.05) arrow(c, cartX, 16, cartX + v * (h ? 14 : 5), 16, C.c2, 2);
        if (!d.grabbed) D.hint(c, h ? '抓住小车推出去 →' : '可直接抓住小车推出去', tr.L, 9);
        /* v–t */
        axes(c, m1, 't [s]', 'v [m/s]', 2, h ? 1 : 2);
        if (h) {
          var tE = Math.min(rt, 10), cl = function (q) { return m1.Y(Math.max(-VM, Math.min(VM, q))); };
          if (rec.length > 1) {
            c.save(); c.globalAlpha = 0.28; c.beginPath(); c.moveTo(m1.X(0), m1.Y(0)); rec.forEach(function (p) { c.lineTo(m1.X(p[0]), cl(p[2])); }); c.lineTo(m1.X(rec[rec.length - 1][0]), m1.Y(0)); c.closePath(); c.fillStyle = C.c2; c.fill(); c.restore();
            line(c, rec.map(function (p) { return [m1.X(p[0]), cl(p[2])]; }), C.c2, 2.5);
          }
          line(c, [[m1.X(tE), m1.T], [m1.X(tE), m1.B]], C.warn, 1, [4, 4]);
          axes(c, m2, 't [s]', 'x [m]', 2, 0.5);
          if (rec.length > 1) line(c, rec.map(function (p) { return [m2.X(p[0]), m2.Y(p[1])]; }), C.c1, 2.5);
          dot(c, m2.X(tE), m2.Y(cx), 5, C.warn);
          txt(c, 'v–t 图（手推小车实测，记录 0–10 s）', m1.R - 4, m1.T - 8, C['ink-2'], F12, 'right');
          txt(c, 'x–t 图（v–t 下的面积 = 位移）', m2.R - 4, m2.T - 8, C['ink-2'], F12, 'right');
          d.out([['t', fx(rt, 1) + ' s'], ['v', fx(cv, 2) + ' m/s'], ['位置 x', fx(cx, 2) + ' m'], ['位移 Δx = x − x₀', fx(cx - x0, 2) + ' m'], ['路程', fx(dist, 2) + ' m'], ['加速度 a', held ? '手推中' : fx(ca, 2) + ' m/s²']],
            '手推实验（轨道 2 m，真实尺寸与真实时间）：松手时的手势速度成为初速度；之后小车只受滚动阻力，加速度大小 μg = ' + fx(mu.v * P.g, 2) + ' m/s²、方向与速度相反，所以 v–t 图是斜率 ∓μg 的直线，减到 0 后静止。撞到端挡板时以恢复系数 e = 0.5 反弹。v–t 图下的面积（t 轴下方取负）仍等于位移。');
          return;
        }
        c.save(); c.globalAlpha = 0.28; c.beginPath(); c.moveTo(m1.X(0), m1.Y(0)); N.forEach(function (n) { c.lineTo(m1.X(n[0]), m1.Y(n[1])); }); c.lineTo(m1.X(10), m1.Y(0)); c.closePath(); c.fillStyle = C.c2; c.fill(); c.restore();
        line(c, N.map(function (n) { return [m1.X(n[0]), m1.Y(n[1])]; }), C.c2, 2.5);
        line(c, [[m1.X(t), m1.T], [m1.X(t), m1.B]], C.warn, 1, [4, 4]);
        /* x–t */
        axes(c, m2, 't [s]', 'x [m]', 2, 10);
        var pts = []; for (i = 0; i <= 200; i++) { var tt = i / 20; pts.push([m2.X(tt), m2.Y(Math.max(-44, Math.min(44, P.vtX(N, tt))))]); }
        line(c, pts, C.c1, 2.5); dot(c, m2.X(t), m2.Y(Math.max(-40, Math.min(40, xs))), 5, C.warn);
        txt(c, 'v–t 图（拖动折点）', m1.R - 4, m1.T - 8, C['ink-2'], F12, 'right');
        txt(c, 'x–t 图（v–t 下的面积 = 位移）', m2.R - 4, m2.T - 8, C['ink-2'], F12, 'right');
        var acc = []; for (i = 0; i < N.length - 1; i++) acc.push(fx((N[i + 1][1] - N[i][1]) / 2, 1));
        d.out([['t', fx(t, 1) + ' s'], ['v', fx(v, 2) + ' m/s'], ['x（位移 変位）', fx(xs, 2) + ' m'], ['0–10 s 位移', fx(P.vtX(N, 10), 1) + ' m'], ['0–10 s 路程', fx(P.vtDist(N, 10), 1) + ' m'], ['各段加速度 a', acc.join(', ') + ' m/s²']],
          'v–t 图的斜率是加速度，与 t 轴围成的面积（t 轴下方取负）是位移；x–t 图的斜率是速度。也可直接抓住小车推出去，切换到“手推小车”实测。');
      } };
  });

  /* ② 抛体运动：拖动速度箭头或用滑块；也可直接抓住小球移动抛出点或甩出去 */
  D.reg('proj', function () {
    var m, tc = 0, v0, th, h0, xL = 0, hold = null, ball = [0, 0], BR = 8, K = 1 / 40; /* 手势速度 px/s × K → m/s（画面是 100 m 尺度，按比例换算） */
    function clampHold() { hold[0] = D.clamp(hold[0], 0, m.x1 * 0.7); hold[1] = D.clamp(hold[1], 0, 30); }
    function gesture(vx, vy) { /* 手势速度 → [v0, θ°]；太慢（手指停住后松手）返回 null */
      var ux = vx * K, uy = -vy * K, sp = Math.hypot(ux, uy);
      return sp < 1.5 ? null : [D.clamp(Math.round(sp * 2) / 2, 2, 30), D.clamp(Math.round(Math.atan2(uy, ux) * 180 / Math.PI), -30, 90)];
    }
    function path(x0, y0, r) { var pts = []; for (var i = 0; i <= 100; i++) { var t = r.T * i / 100; pts.push([m.X(x0 + r.vx * t), m.Y(y0 + r.vy * t - 4.9 * t * t)]); } return pts; }
    return { aspect: 1.55, animated: true,
      init: function (d) {
        v0 = d.slider('初速 v₀', 2, 30, 0.5, 18, function (v) { return fx(v, 1) + ' m/s'; }, function () { tc = 0; });
        th = d.slider('仰角 θ', -30, 90, 1, 50, function (v) { return v + '°'; }, function () { tc = 0; });
        h0 = d.slider('抛出高度 h', 0, 30, 0.5, 0, function (v) { return fx(v, 1) + ' m'; }, function () { tc = 0; });
        d.handle({ hidden: function () { return !!hold; }, get: function () { var a = th.v * Math.PI / 180; return [m.X(xL) + Math.cos(a) * v0.v * 4, m.Y(h0.v) - Math.sin(a) * v0.v * 4]; },
          set: function (x, y) { var dx = (x - m.X(xL)) / 4, dy = (m.Y(h0.v) - y) / 4; v0.set(Math.max(2, Math.min(30, Math.round(Math.hypot(dx, dy) * 2) / 2))); th.set(Math.max(-30, Math.min(90, Math.round(Math.atan2(dy, dx) * 180 / Math.PI)))); tc = 0; } });
        d.grab({ r: BR, get: function () { return ball; },
          start: function (x, y) { hold = [m.ix(x), m.iy(y)]; clampHold(); },
          set: function (x, y) { hold = [m.ix(x), m.iy(y)]; clampHold(); },
          release: function (vx, vy) { var g = gesture(vx, vy); xL = hold[0]; h0.set(Math.round(hold[1] * 2) / 2); if (g) { v0.set(g[0]); th.set(g[1]); } hold = null; tc = 0; } });
        d.button('重置', function () { xL = 0; hold = null; v0.set(18); th.set(50); h0.set(0); tc = 0; });
      },
      resize: function (d) { var L = 40, R = d.W - 12, B = d.H - 24, sc = Math.min((R - L) / 100, (B - 12) / 60); m = Map(0, (R - L) / sc, 0, (B - 12) / sc, L, R, 12, B); },
      step: function (d, dt) { if (d.dragging()) return; tc += dt; },
      draw: function (d, c) {
        var a = th.v * Math.PI / 180, r = P.projectile(v0.v, a, h0.v), T = r.T, step = m.x1 > 100 ? 20 : 10, gy = m.Y(0), X, Y, k;
        D.ground(c, m.L, m.R, gy, { kind: 'soil', depth: 10 });
        if (!hold && h0.v > 0) { c.save(); c.globalAlpha = 0.8; D.wood(c, m.X(xL) - 14, m.Y(h0.v), 14, gy - m.Y(h0.v), { tone: 0 }); c.restore(); } /* 抛出台 */
        axes(c, m, 'x [m]', 'y [m]', step, step);
        if (hold) { /* 手持：按当前手势速度预览抛出轨迹 */
          var gv = d.grabVel(), g = gesture(gv[0], gv[1]), pr = g ? P.projectile(g[0], g[1] * Math.PI / 180, hold[1]) : P.projectile(v0.v, a, hold[1]);
          line(c, path(hold[0], hold[1], pr), C.accent, 2, [3, 5]);
          X = m.X(hold[0]); Y = m.Y(hold[1]); ball = [X, Y];
          D.shadow(c, X, gy + 1, BR * 1.2 * D.clamp(1 - hold[1] / 40, 0.35, 1), 3, 0.3);
          if (g) arrow(c, X, Y, X + Math.cos(g[1] * Math.PI / 180) * g[0] * 4, Y - Math.sin(g[1] * Math.PI / 180) * g[0] * 4, C.accent, 2.5);
          D.drawBall(c, X, Y, BR, C.warn);
          txt(c, g ? '松手 → 以 ' + fx(g[0], 1) + ' m/s、' + g[1] + '° 抛出' : '慢慢松手 → 只移动抛出点', X, Y - 20, C['ink-2'], '12px ' + D.FONT);
        } else {
          line(c, path(xL, h0.v, r), C.c2, 2, [6, 5]);
          var t = Math.min(tc % (T + 1.2), T), x = xL + r.vx * t, vy = r.vy - 9.8 * t, y = h0.v + r.vy * t - 4.9 * t * t, dT = T > 4 ? 0.5 : 0.25;
          for (k = 1; k * dT < t - 1e-9 && k < 60; k++) { var tk = k * dT; D.drawBall(c, m.X(xL + r.vx * tk), m.Y(h0.v + r.vy * tk - 4.9 * tk * tk), BR, C.warn, { flat: true, alpha: 0.2 }); } /* 频闪照片 */
          X = m.X(x); Y = m.Y(y); ball = [X, Y];
          var ss = D.clamp(1 - y / 40, 0.35, 1); D.shadow(c, X, gy + 1, BR * 1.3 * ss, 3.2 * ss, 0.34 * ss);
          arrow(c, X, Y, X + r.vx * 4, Y, C.c1, 2, 'vₓ'); arrow(c, X, Y, X, Y - vy * 4, C.c3, 2, 'v_y'); D.drawBall(c, X, Y, BR, C.warn);
          arrow(c, m.X(xL), m.Y(h0.v), m.X(xL) + Math.cos(a) * v0.v * 4, m.Y(h0.v) - Math.sin(a) * v0.v * 4, C.accent, 2.5);
          if (r.vy > 0) { var tp = r.vy / 9.8; dot(c, m.X(xL + r.vx * tp), m.Y(r.H), 3.5, C.c3); }
        }
        if (!d.grabbed) D.hint(c, '可直接抓住小球：慢放＝移动抛出点，甩出＝抛出', m.R - 4, m.T + 8, 'right');
        var dt0 = T > 4 ? 0.5 : 0.25, vyNow = hold ? null : r.vy - 9.8 * Math.min(tc % (T + 1.2), T);
        d.out([['飞行时间 T', fx(T, 2) + ' s'], ['水平射程 R（距抛出点）', fx(r.R, 1) + ' m'], ['最高点高度 H', fx(r.H, 1) + ' m'], ['vₓ（不变）', fx(r.vx, 2) + ' m/s'], ['当前 v_y', hold ? '手持中' : fx(vyNow, 2) + ' m/s'],
          ['抛出点 (x₀, h)', '(' + fx(xL, 1) + ', ' + fx(h0.v, 1) + ') m'], ['频闪间隔 Δt', fx(dt0, 2) + ' s（水平间距 vₓΔt = ' + fx(r.vx * dt0, 2) + ' m）']],
          '水平方向等速：x = x₀ + v₀cosθ·t；竖直方向等加速度：y = h + v₀sinθ·t − ½gt²（g = 9.8 m/s²，忽略空气阻力）。h = 0 时 θ = 45° 射程最大。频闪残影的水平间距相等、竖直间距逐段变化。甩出小球时，手势速度按比例换算成 v₀（画面约 100 m 宽；v₀ 取到 0.5 m/s、θ 取到 1°，限 2–30 m/s、−30°–90°）。');
      } };
  });

  /* ③ 斜面上的连接体：受力图与加速度；可抓住 m₁ / m₂ 拖动或推出，松手后按受力（含动摩擦）继续运动 */
  D.reg('incline', function () {
    var m1, m2, th, mu, s = 0, vel = 0, held = false, hv = 0, ret = false, pinned = false, endT = 0, dd, G;
    function geo() {
      var W = dd.W, H = dd.H, a = th.v * Math.PI / 180, px = W * 0.72, py = H * 0.18, Lr = Math.min(W * 0.6, (H * 0.7) / Math.max(Math.sin(a), 0.01), W * 0.62); /* 斜面顶点 */
      var sc = Math.min(W, 700) / 700, K = 60 * sc, bw = 26 + 6 * Math.sqrt(m1.v), bw2 = 20 + 6 * Math.sqrt(m2.v), pr = 12, pcy = py - pr, h0 = H * 0.55, fy = H - 8;
      G = { a: a, px: px, py: py, Lr: Lr, bx: px - Lr * Math.cos(a), by: py + Lr * Math.sin(a), u: [Math.cos(a), -Math.sin(a)], n: [-Math.sin(a), -Math.cos(a)], sc: sc, K: K, bw: bw, bw2: bw2, pr: pr, pcx: px + 4, pcy: pcy, h0: h0, fy: fy };
      /* s [m]：m₁ 沿斜面向上（= m₂ 下降）为正；绳长不变 ⇒ m₂ 下降量 = m₁ 上滑量 */
      G.smin = Math.max((bw / 2 + 4 - 0.55 * Lr) / K, (pcy + pr + 14 - h0) / K);
      G.smax = Math.min((0.45 * Lr - bw / 2 - 22) / K, (fy - bw2 - h0) / K);
      return G;
    }
    function home() { return D.clamp(0, G.smin, G.smax); }
    function block() { var al = 0.55 * G.Lr + s * G.K; return [G.bx + G.u[0] * al + G.n[0] * G.bw / 2, G.by + G.u[1] * al + G.n[1] * G.bw / 2]; }
    function reset() { geo(); vel = 0; endT = 0; pinned = false; held = false; if (dd.playing && !D.reduced()) ret = true; else { s = home(); ret = false; } }
    function grabbed(k) { return { start: function () { held = true; ret = false; pinned = false; vel = 0; hv = 0; endT = 0; },
      release: function (vx, vy) { geo(); held = false; vel = D.clamp((k ? vy : vx * G.u[0] + vy * G.u[1]) / G.K, -4, 4); hv = 0; } }; }
    return { aspect: 1.5, animated: true,
      init: function (d) {
        dd = d;
        m1 = d.slider('斜面上 m₁', 0.5, 5, 0.1, 2, function (v) { return fx(v, 1) + ' kg'; }, reset);
        m2 = d.slider('悬挂 m₂', 0.1, 5, 0.1, 1.5, function (v) { return fx(v, 1) + ' kg'; }, reset);
        th = d.slider('倾角 θ', 0, 60, 1, 30, function (v) { return v + '°'; }, reset);
        mu = d.slider('摩擦系数 μ', 0, 1, 0.05, 0.2, function (v) { return fx(v, 2); }, reset);
        d.button('重新开始', reset);
        var b1 = grabbed(0), b2 = grabbed(1);
        b1.r = function () { return G ? G.bw / 2 + 2 : 16; }; b1.get = block;
        b1.set = function (x, y) { geo(); var al = (x - G.bx) * G.u[0] + (y - G.by) * G.u[1]; s = D.clamp((al - 0.55 * G.Lr) / G.K, G.smin, G.smax); };
        b2.r = function () { return G ? G.bw2 / 2 + 2 : 14; }; b2.get = function () { return [G.pcx + G.pr, G.h0 + s * G.K + 2 + G.bw2 / 2]; };
        b2.set = function (x, y) { geo(); s = D.clamp((y - 2 - G.bw2 / 2 - G.h0) / G.K, G.smin, G.smax); };
        d.grab(b1); d.grab(b2);
      },
      resize: function () { geo(); },
      step: function (d, dt) {
        geo();
        if (held) { var gv = d.grabVel(); hv = (gv[0] * G.u[0] + gv[1] * G.u[1]) / G.K; return; }
        if (ret) { s = D.approach(s, home(), dt, 0.15); vel = 0; if (Math.abs(s - home()) < 2e-3) { s = home(); ret = false; } return; }
        var M = m1.v + m2.v, r = P.slide1D(s, vel, (m2.v - m1.v * Math.sin(G.a)) * P.g / M, mu.v * m1.v * P.g * Math.cos(G.a) / M, dt);
        s = r.x; vel = r.v; pinned = false;
        if (s >= G.smax) { s = G.smax; if (vel > 0) vel = 0; pinned = vel === 0; } else if (s <= G.smin) { s = G.smin; if (vel < 0) vel = 0; pinned = vel === 0; }
        if (pinned) { endT += dt; if (endT > 1.2) { endT = 0; pinned = false; ret = true; } } else endT = 0;
      },
      draw: function (d, c) {
        var g = geo(), W = d.W, H = d.H, a = g.a, bx = g.bx, by = g.by, px = g.px, py = g.py, u = g.u, nrm = g.n, sc = g.sc, bw = g.bw, bw2 = g.bw2, pr = g.pr, pcx = g.pcx, pcy = g.pcy;
        /* 地面、实验台、木质斜面 */
        D.ground(c, 6, W - 6, g.fy, { kind: 'floor' });
        if (g.fy - by > 14) {
          c.fillStyle = C.dark ? '#5b606b' : '#9aa0aa'; c.fillRect(bx - 6, by + 7, 5, g.fy - by - 7); c.fillRect(px - 12, by + 7, 5, g.fy - by - 7);
          D.wood(c, bx - 14, by, px - bx + 13, 7, { tone: 1 });
        }
        c.save(); c.beginPath(); c.moveTo(bx, by); c.lineTo(px, py); c.lineTo(px, by); c.closePath(); c.fillStyle = D.woodPattern(c, 0); c.fill();
        var sg = c.createLinearGradient(bx, by, px, by); sg.addColorStop(0, 'rgba(255,255,255,.12)'); sg.addColorStop(1, 'rgba(0,0,0,.14)'); c.fillStyle = sg; c.fill(); c.restore();
        line(c, [[bx, by], [px, py], [px, by], [bx, by]], C['ink-3'], 1.5);
        c.save(); c.beginPath(); c.arc(bx, by, 26, -a, 0); c.strokeStyle = C['ink-2']; c.lineWidth = 1; c.stroke(); c.restore();
        txt(c, 'θ', bx + 36 * Math.cos(a / 2), by - 36 * Math.sin(a / 2), C['ink-2']);
        /* 滑轮支架、绳、物块、槽码 */
        var bc = block(), gx = bc[0], gy = bc[1], hy = g.h0 + s * g.K, hx = pcx + pr;
        line(c, [[px - 1, py + 1], [pcx, pcy]], C.dark ? '#8d939e' : '#5d636e', 4);
        line(c, [[gx + u[0] * bw / 2, gy + u[1] * bw / 2], [pcx - pr * Math.sin(a), pcy - pr * Math.cos(a)]], C.ink, 1.3);
        line(c, [[hx, pcy], [hx, hy + 2]], C.ink, 1.3);
        D.drawPulley(c, pcx, pcy, pr, s * g.K / pr);
        D.drawBlock(c, gx, gy, bw, bw, C.c1, { angle: -a, label: 'm₁' });
        D.drawWeight(c, hx, hy, bw2, bw2, C.c3, { label: 'm₂' });
        /* 受力（1 N ≈ k px）：运动中按动摩擦，静止时按静摩擦 */
        var cur = P.inclineAt(m1.v, m2.v, a, mu.v, held ? 0 : vel), k = 2.6 * Math.max(sc, 0.8), gg = 9.8, na = held || pinned, mov = !held && vel !== 0, lp = W < 520 ? 19 : 14; /* 窄屏：力箭头不再按画面缩短，标签离箭头稍远，避免挤在一起 */
        arrow(c, gx, gy, gx, gy + m1.v * gg * k, C.warn, 2, 'm₁g', lp); arrow(c, gx, gy, gx + nrm[0] * cur.N * k, gy + nrm[1] * cur.N * k, C.good, 2, 'N', lp);
        var hc = hy + 2 + bw2 / 2; arrow(c, hx, hc, hx, hc + m2.v * gg * k, C.warn, 2, 'm₂g', lp);
        if (!na) {
          arrow(c, gx, gy, gx + u[0] * cur.T * k, gy + u[1] * cur.T * k, C.c2, 2, 'T', lp);
          if (Math.abs(cur.f) > 1e-6) arrow(c, gx - nrm[0] * bw / 2, gy - nrm[1] * bw / 2, gx - nrm[0] * bw / 2 + u[0] * cur.f * k, gy - nrm[1] * bw / 2 + u[1] * cur.f * k, C.c4, 2, 'f', lp);
          arrow(c, hx, hc, hx, hc - cur.T * k, C.c2, 2, 'T', lp);
        }
        if (!d.grabbed) D.hint(c, '可直接抓住 m₁ 或 m₂ 拖动、推出', 10, W < 520 ? g.fy - 14 : 14); /* 窄屏放到台面下，免得压住 N 的标签 */
        var dir = function (v) { return v > 0 ? 'm₂ 下降，m₁ 沿斜面上滑' : 'm₁ 沿斜面下滑，m₂ 上升'; };
        var st = held ? '手持中（松手后从当时的速度开始按受力运动）' : pinned ? '到达端点被挡住，稍后回到起点' : mov ? dir(vel) + (cur.a * vel < 0 ? '（减速中）' : '')
          : cur.state === 'static' ? '静止（静摩擦力 ' + fx(Math.abs(cur.f), 2) + ' N 足以平衡）' : dir(cur.a);
        d.out([['加速度 a', na ? '—' : fx(Math.abs(cur.a), 2) + ' m/s²'], ['速度 v', fx(Math.abs(held ? hv : vel), 2) + ' m/s'], ['张力 T', na ? '—' : fx(cur.T, 2) + ' N'], ['垂直抗力 N', fx(cur.N, 2) + ' N'],
          ['摩擦力 f', na ? '—' : fx(Math.abs(cur.f), 2) + ' N' + (mov ? '（动摩擦 μN）' : '')], ['状态', st]],
          '运动中：(m₁+m₂)a = m₂g − m₁g sinθ ∓ μm₁g cosθ（动摩擦力与运动方向相反：m₁ 上滑取 −，下滑取 +），T = m₂(g − a)。从静止开始时，先比较 m₂g 与 m₁g sinθ 的差和最大静摩擦力 μm₁g cosθ 判断是否运动（此处静・动摩擦系数取同一值）。推出去后若与“驱动方向”相反，会先减速、停下，再按静止时的判断决定是否反向。');
      } };
  });

  /* ④ 曲面上的能量：抓住小球放到释放点，或沿轨道推出去（松手速度沿切线的分量 = 初速度） */
  D.reg('energy', function () {
    var f = function (x) { return 0.2 * x * x; }, df = function (x) { return 0.4 * x; }, d2 = function () { return 0.4; };
    var m, st = { x: -4, v: 0 }, x0 = -4, v0 = 0, mu, mass = 1, BR = 9, XM = 4.8, held = false, tm = 0, roll = 0, lastP = null, ghost = D.trail(9, 0.08), ball = [0, 0];
    function vmax(x) { return Math.sqrt(Math.max(0, 2 * P.g * (f(XM) - f(x)))); } /* 不冲出轨道两端（x = ±4.8 m）的最大速率 */
    function E0() { return mass * P.g * f(x0) + 0.5 * mass * v0 * v0; }
    function nrm(x) { /* 屏幕上曲面的单位法线（指向上方）；x、y 方向比例尺不同，要按屏幕斜率算 */
      var sx = (m.R - m.L) / (m.x1 - m.x0), sy = (m.B - m.T) / (m.y1 - m.y0), tx = sx, ty = -sy * df(x), L = Math.hypot(tx, ty); return [ty / L, -tx / L];
    }
    function centre(x) { var n = nrm(x); return [m.X(x) + n[0] * BR, m.Y(f(x)) + n[1] * BR]; }
    function along(vx, vy, x) { var yp = df(x); return (m.dx(vx) + m.dy(vy) * yp) / Math.sqrt(1 + yp * yp); } /* 手势速度（px/s）→ 沿轨道切线的速度（m/s） */
    function release() { st = { x: x0, v: v0 }; ghost.clear(); }
    return { aspect: 1.6, animated: true,
      init: function (d) {
        mu = d.slider('动摩擦系数 μ', 0, 0.3, 0.01, 0, function (v) { return fx(v, 2); }, release);
        d.button('重新释放', release);
        d.grab({ r: BR, get: function () { return ball; },
          start: function () { held = true; },
          set: function (X) { var x = m.ix(X); x = m.ix(X - nrm(x)[0] * BR); x0 = D.clamp(x, -XM, XM); st = { x: x0, v: 0 }; },
          release: function (vx, vy) { held = false; var lim = vmax(x0); v0 = D.clamp(along(vx, vy, x0), -lim, lim); if (Math.abs(v0) < 0.05) v0 = 0; release(); } });
      },
      resize: function (d) { var R = d.W * 0.66; m = Map(-5, 5, -0.3, 5.3, 16, R, 26, d.H - 18); },
      step: function (d, dt) {
        tm += dt;
        if (held) { var gv = d.grabVel(), lim = vmax(st.x); st.v = D.clamp(along(gv[0], gv[1], st.x), -lim, lim); return; }
        for (var i = 0; i < 10; i++) st = P.trackStep(st, f, df, d2, mu.v, dt / 10);
        if (Math.abs(st.v) > 0.05) ghost.push(tm, st.x);
      },
      draw: function (d, c) {
        var pts = [], i, x; for (i = 0; i <= 120; i++) { x = -5 + i / 12; pts.push([m.X(x), m.Y(f(x))]); }
        /* 木质曲面轨道 + 实验台 */
        D.ground(c, 6, m.R + 10, m.B + 10, { kind: 'floor' });
        c.save(); c.beginPath(); pts.forEach(function (p, i) { i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.lineTo(m.R, m.B + 10); c.lineTo(m.L, m.B + 10); c.closePath();
        c.fillStyle = D.woodPattern(c, 0); c.fill(); var sg = c.createLinearGradient(0, m.T, 0, m.B + 10); sg.addColorStop(0, 'rgba(255,255,255,.16)'); sg.addColorStop(1, 'rgba(0,0,0,.18)'); c.fillStyle = sg; c.fill(); c.restore();
        line(c, pts, C.dark ? '#c4c9d2' : '#8c929c', 4); line(c, pts, C.dark ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.8)', 1.2);
        var hE = E0() / (mass * P.g), mov = v0 !== 0 && !held; /* 力学能对应的高度 E/mg（μ = 0 时小球能到达的最高点） */
        line(c, [[m.X(-5), m.Y(hE)], [m.X(5), m.Y(hE)]], C['ink-3'], 1, [5, 5]);
        txt(c, mov ? '能量对应高度 E/mg' : '释放高度', m.X(0), m.Y(hE) - 9, C['ink-3'], '11px ' + D.FONT);
        /* 小球（滚动标记 = 屏幕弧长 / r）与频闪残影 */
        ghost.each(function (gx, _, k) { var q = centre(gx); D.drawBall(c, q[0], q[1], BR, C.c1, { flat: true, alpha: 0.2 * k }); });
        ball = centre(st.x); if (lastP) roll += Math.hypot(ball[0] - lastP[0], ball[1] - lastP[1]) * (st.v >= 0 ? 1 : -1) / BR; lastP = ball;
        D.drawBall(c, ball[0], ball[1], BR, C.c1, { spin: roll });
        var yp = df(st.x), q = Math.sqrt(1 + yp * yp), X = ball[0], Y = ball[1];
        if (Math.abs(st.v) > 0.05) arrow(c, X, Y, X + st.v / q * 10, Y - st.v * yp / q * 10, C.c2, 2, 'v');
        if (!d.grabbed) D.hint(c, '可抓住小球：慢放＝从该处静止释放，沿轨道甩出＝带初速度', 10, 12);
        var g = 9.8, K = 0.5 * mass * st.v * st.v, U = mass * g * f(st.x), E = held ? K + U : E0(), Q = Math.max(0, E - K - U);
        bars(c, d.W * 0.7, 36, d.W * 0.28, d.H - 80, [['K', K, C.c2], ['U', U, C.c1], ['热 Q', Q, C.warn], ['合计', K + U + Q, C['ink-3']]], E * 1.02 || 1, '能量 [J]（m = 1 kg）');
        d.out([['高度 y', fx(f(st.x), 2) + ' m'], ['速率 v', fx(Math.abs(st.v), 2) + ' m/s'], ['动能 K', fx(K, 1) + ' J'], ['重力势能 U', fx(U, 1) + ' J'], ['摩擦生热', fx(Q, 1) + ' J'], ['K+U', fx(K + U, 1) + ' J'],
          ['释放时 (x₀, v₀)', held ? '手持中' : '(' + fx(x0, 2) + ' m, ' + fx(v0, 2) + ' m/s)']],
          'μ = 0 时力学能守恒 K + U = mgh₀ + ½mv₀²，小球回到同一高度（虚线 E/mg）；有摩擦时减少的力学能等于摩擦生热（摩擦力做的负功），注意曲面上 N 还含向心项 mv²/r。可直接抓住小球：慢慢松手＝从该处静止释放；沿轨道甩出＝手势速度沿切线的分量（按画面比例换算，轨道宽 10 m、真实时间）作为初速度 v₀，上限为不冲出轨道两端的速率。');
      } };
  });

  /* ⑤ 一维碰撞：动量与动能。两球在光滑水平面上自由运动，可直接抓住推出去 */
  D.reg('collide', function () {
    var m1, m2, v1, v2, e, dd, S = { x1: null }, sc = 40, Y = 100, X0 = 20, TRK = 14, held = 0, tr1 = D.trail(7, 0.12), tr2 = D.trail(7, 0.12);
    var VR = [[-4, 6], [-6, 4]]; /* v₁、v₂ 滑块范围；抛出速度也限制在此范围 */
    function rp(i) { return 9 + 6 * Math.pow(i === 1 ? m1.v : m2.v, 1 / 3); } /* 半径 ∝ m^(1/3)（同材质） */
    function R(i) { return rp(i) / sc; }
    function PX(x) { return X0 + x * sc; }
    function setup(ease) { /* 按滑块的 v₁、v₂ 摆放：会碰撞时让两球约在 x = 7 m 处相碰 */
      var a = v1.v, b = v2.v, r1 = R(1), r2 = R(2), x1 = 4, x2 = 10;
      if (a > b) for (var tc = 2.5; ; tc *= 0.85) { x1 = 7 - r1 - a * tc; x2 = 7 + r2 - b * tc; if ((x1 >= r1 + 0.1 && x2 <= TRK - r2 - 0.1) || tc < 0.2) break; }
      S.t1 = x1; S.t2 = x2; S.v1 = a; S.v2 = b; S.pre = [a, b]; S.hit = false; S.t = 0; S.tHit = 0; S.flash = 0; held = 0; tr1.clear(); tr2.clear();
      if (ease && dd.playing && !D.reduced() && S.x1 != null) S.ret = true; else { S.x1 = x1; S.x2 = x2; S.ret = false; }
    }
    function res() { setup(true); }
    function ball(i) {
      return dd.grab({ r: function () { return rp(i); }, get: function () { return [PX(S['x' + i]), Y - rp(i)]; },
        start: function () { held = i; S.ret = false; },
        set: function (x) { var w = (x - X0) / sc, r1 = R(1), r2 = R(2);
          if (i === 1) S.x1 = D.clamp(w, r1, Math.max(r1, Math.min(TRK - r1, S.x2 - r1 - r2))); else S.x2 = D.clamp(w, Math.min(TRK - r2, Math.max(r2, S.x1 + r1 + r2)), TRK - r2); },
        release: function (vx) { /* 松手速度成为新的“碰撞前速度”；另一球取它当时的速度 */
          S['v' + i] = D.clamp(vx / sc, VR[i - 1][0], VR[i - 1][1]); held = 0; S.pre = [S.v1, S.v2]; S.hit = false; S.t = 0;
          v1.set(Math.round(D.clamp(S.v1, -4, 6) * 10) / 10); v2.set(Math.round(D.clamp(S.v2, -6, 4) * 10) / 10); } });
    }
    return { aspect: function (w) { return w < 520 ? 1.25 : 1.7; }, animated: true,
      init: function (d) {
        dd = d;
        m1 = d.slider('m₁', 0.5, 5, 0.1, 2, function (v) { return fx(v, 1) + ' kg'; }, res);
        v1 = d.slider('v₁', -4, 6, 0.1, 3, function (v) { return fx(v, 1) + ' m/s'; }, res);
        m2 = d.slider('m₂', 0.5, 5, 0.1, 1, function (v) { return fx(v, 1) + ' kg'; }, res);
        v2 = d.slider('v₂', -6, 4, 0.1, 0, function (v) { return fx(v, 1) + ' m/s'; }, res);
        e = d.slider('恢复系数 e', 0, 1, 0.05, 1, function (v) { return fx(v, 2) + (v == 1 ? '（弹性）' : v == 0 ? '（完全非弹性）' : ''); }, res);
        var ps = [['弹性 等质量', 1, 1, 3, 0, 1], ['完全非弹性', 2, 1, 3, 0, 0], ['重撞轻', 4, 1, 2, 0, 1], ['对撞', 1, 2, 3, -2, 0.5]];
        ps.forEach(function (p) { d.button(p[0], function () { m1.set(p[1]); m2.set(p[2]); v1.set(p[3]); v2.set(p[4]); e.set(p[5]); res(); }); });
        ball(1); ball(2);
      },
      resize: function (d) { sc = (d.W - 40) / TRK; Y = d.H * 0.34; if (S.x1 == null) setup(false); },
      step: function (d, dt) {
        if (S.ret) { S.x1 = D.approach(S.x1, S.t1, dt, 0.08); S.x2 = D.approach(S.x2, S.t2, dt, 0.08); if (Math.abs(S.x1 - S.t1) + Math.abs(S.x2 - S.t2) < 0.01) { S.x1 = S.t1; S.x2 = S.t2; S.ret = false; } return; }
        if (S.flash > 0) S.flash = Math.max(0, S.flash - dt / 0.35);
        if (held) S['v' + held] = D.clamp(d.grabVel()[0] / sc, VR[held - 1][0], VR[held - 1][1]); /* 手的速度（画箭头、与另一球接触时用） */
        var r1 = R(1), r2 = R(2), gap = S.x2 - S.x1 - r1 - r2, rel = S.v1 - S.v2, tc = rel > 0 ? Math.max(0, gap) / rel : Infinity;
        function adv(tau) { if (held !== 1) S.x1 += S.v1 * tau; if (held !== 2) S.x2 += S.v2 * tau; }
        if (tc <= dt) { /* 精确求接触时刻：先走到接触，再碰撞，再走完剩余时间 */
          adv(tc);
          if (!held) { var r = P.collide(m1.v, m2.v, S.v1, S.v2, e.v); S.v1 = r.u1; S.v2 = r.u2; S.hit = true; S.tHit = S.t; }
          else if (held === 1) S.v2 = S.v1 - e.v * (S.v2 - S.v1); else S.v1 = S.v2 - e.v * (S.v1 - S.v2); /* 被手握住的球 ≈ 无限大质量 */
          S.flash = 1; S.fx = S.x1 + r1; adv(dt - tc);
        } else adv(dt);
        S.t += dt; tr1.push(S.t, S.x1); tr2.push(S.t, S.x2);
        var off = function (x, r) { return x + r < -0.3 || x - r > TRK + 0.3; };
        if (!held && ((off(S.x1, r1) && off(S.x2, r2)) || (S.hit && S.t - S.tHit > 2.5) || S.t > 9)) setup(true); /* 一轮结束：平滑回到起始位置重播 */
      },
      draw: function (d, c) {
        var W = d.W, pa = S.pre[0], pb = S.pre[1], r = P.collide(m1.v, m2.v, pa, pb, e.v), will = pa > pb, i;
        D.ground(c, 10, W - 10, Y, { kind: 'floor', depth: 8 });
        D.ruler(c, PX, 0, TRK, Y + 11, { minor: 0.5, major: 1, every: 2, unit: 'm', h: 15 });
        var cols = [C.c1, C.c3], trs = [tr1, tr2];
        for (i = 1; i <= 2; i++) { var rr = rp(i), col = cols[i - 1]; trs[i - 1].each(function (x, _, f) { D.drawBall(c, PX(x), Y - rr, rr, col, { flat: true, alpha: 0.16 * f }); }); }
        if (S.flash > 0 && !D.reduced()) { c.save(); c.globalAlpha = S.flash * 0.7; c.strokeStyle = C.warn; c.lineWidth = 2; c.beginPath(); c.arc(PX(S.fx), Y - (rp(1) + rp(2)) / 2, 6 + 22 * (1 - S.flash), 0, 7); c.stroke(); c.restore(); }
        for (i = 1; i <= 2; i++) {
          var R_ = rp(i), X = PX(S['x' + i]), v = S['v' + i];
          D.drawBall(c, X, Y - R_, R_, cols[i - 1], { label: i === 1 ? 'm₁' : 'm₂', shadowY: Y });
          if (Math.abs(v) > 0.02) arrow(c, X, Y - 2 * R_ - 10, X + v * 14, Y - 2 * R_ - 10, cols[i - 1], 2);
        }
        if (!d.grabbed) D.hint(c, '可直接抓住小球推出去', 12, 12);
        var p0 = m1.v * pa + m2.v * pb, p1 = m1.v * r.u1 + m2.v * r.u2, K0 = P.ke(m1.v, pa) + P.ke(m2.v, pb), K1 = P.ke(m1.v, r.u1) + P.ke(m2.v, r.u2);
        var by = d.H * 0.52, bh = d.H * 0.34, bw = (W - 40) / 2 - 10, Km = Math.max(K0, 1e-3);
        bars(c, 20, by, bw, bh, [['p₁', m1.v * pa, C.c1], ['p₂', m2.v * pb, C.c3], ['p₁′', m1.v * r.u1, C.c1], ['p₂′', m2.v * r.u2, C.c3]].map(function (b) { return [b[0], Math.abs(b[1]), b[2]]; }), Math.max(Math.abs(m1.v * pa), Math.abs(m2.v * pb), Math.abs(m1.v * r.u1), Math.abs(m2.v * r.u2), 1e-3), '|动量|（碰撞前 → 后）');
        bars(c, W / 2 + 10, by, bw, bh, [['K 前', K0, C.c2], ['K 后', K1, C.c2], ['损失', K0 - K1, C.warn]], Km, '动能 [J]');
        d.out(will ? [['碰前 v₁ / v₂', fx(pa, 2) + ' / ' + fx(pb, 2) + ' m/s'], ['碰后 v₁′', fx(r.u1, 2) + ' m/s'], ['碰后 v₂′', fx(r.u2, 2) + ' m/s'], ['总动量 前 / 后', fx(p0, 2) + ' / ' + fx(p1, 2) + ' kg·m/s'], ['总动能 前 / 后', fx(K0, 2) + ' / ' + fx(K1, 2) + ' J'], ['动能损失', fx(K0 - K1, 2) + ' J'], ['重心速度 v_G（=共速）', fx(r.vG, 2) + ' m/s']]
          : [['碰前 v₁ / v₂', fx(pa, 2) + ' / ' + fx(pb, 2) + ' m/s'], ['状态', 'v₁ ≤ v₂：追不上，不会碰撞']],
          'm₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′，v₁′ − v₂′ = −e(v₁ − v₂)。动量总守恒；动能只在 e = 1 时守恒。最接近（弹簧最大压缩）时两者共速 v_G。光滑水平面，不计摩擦与滚动；抓住小球推出去时，松手速度（真实比例，限滑块范围）成为新的碰前速度，另一球取它当时的速度。');
      } };
  });
})();
(function () {
  'use strict';
  var D = window.EJUDemo, P = D.P, C = D.COL, fx = D.fx, arrow = D.arrow, txt = D.txt, line = D.line, dot = D.dot, Map = D.Map, axes = D.axes;
  var F11 = '11px ' + D.FONT, F12 = '12px ' + D.FONT;

  /* ⑥ 简谐振动与参考圆：水平弹簧振子（木块可抓住拉开、推一下再松手）+ 转盘上的参考圆 + 位置传感器式 x–t 记录 */
  D.reg('shm', function () {
    var m, k, A, amp = 0.6, th = 0, held = false, xh = 0, vh = 0, tm = 0, rec = [], dd, G;
    function om() { return Math.sqrt(k.v / m.v); }
    function state() { var w = om(); return held ? [xh, vh] : [amp * Math.cos(th), -amp * w * Math.sin(th)]; }
    function clear() { rec = []; }
    function geo() {
      var W = dd.W, H = dd.H, R = Math.min(W * 0.16, H * 0.24), ccx = R + 24, ccy = H * 0.3, bw = 26 + 8 * Math.sqrt(m.v);
      var fy = ccy + 26, wall = ccx + R + 40, ox = wall + (W - wall) * 0.45;
      return (G = { R: R, sc: R, ccx: ccx, ccy: ccy, bw: bw, fy: fy, oy: fy - bw / 2, wall: wall, ox: ox, xmin: Math.max(-1, (wall + 10 + bw / 2 - ox) / R) });
    }
    function spring(c, x0, x1, y, r, n) { /* 螺旋弹簧：后半圈细而暗、前半圈粗而亮，看起来是立体的 */
      var N = n * 16, lead = 5, a = x0 + lead, b = x1 - lead, pts = [], i;
      for (i = 0; i <= N; i++) { var u = i / N, ph = u * n * 2 * Math.PI; pts.push([a + (b - a) * u + Math.cos(ph) * r * 0.22, y - Math.sin(ph) * r, Math.cos(ph)]); }
      c.save(); c.lineCap = 'round';
      [[0, C.dark ? '#6c727c' : '#8d939e', 1.2], [1, C.dark ? '#dfe3ea' : '#4f5560', 2]].forEach(function (pass) {
        c.strokeStyle = pass[1]; c.lineWidth = pass[2]; c.beginPath();
        for (i = 1; i <= N; i++) if ((pts[i][2] >= 0) === !!pass[0]) { c.moveTo(pts[i - 1][0], pts[i - 1][1]); c.lineTo(pts[i][0], pts[i][1]); }
        c.stroke();
      });
      line(c, [[x0, y], [a, y]], C.dark ? '#dfe3ea' : '#4f5560', 2); line(c, [[b, y], [x1, y]], C.dark ? '#dfe3ea' : '#4f5560', 2); c.restore();
    }
    return { aspect: function (w) { return w < 520 ? 1.1 : 1.45; }, animated: true,
      init: function (d) {
        dd = d;
        m = d.slider('质量 m', 0.2, 4, 0.1, 1, function (v) { return fx(v, 1) + ' kg'; }, clear);
        k = d.slider('弹簧常数 k', 5, 60, 1, 20, function (v) { return v + ' N/m'; }, clear);
        A = d.slider('振幅 A', 0.1, 1, 0.05, 0.6, function (v) { return fx(v, 2) + ' m'; }, function (v) { amp = v; th = 0; clear(); });
        d.grab({ r: function () { return G ? G.bw / 2 : 16; }, get: function () { geo(); return [G.ox + state()[0] * G.sc, G.oy]; },
          start: function () { var s = state(); held = true; xh = s[0]; vh = 0; },
          set: function (x) { geo(); xh = D.clamp((x - G.ox) / G.sc, G.xmin, 1); },
          release: function (vx) { /* 松手：x 与松手速度（真实比例 px→m）决定振幅与相位 */
            var w = om(), v = vx / G.sc, a2 = Math.sqrt(xh * xh + v * v / (w * w));
            if (a2 > 1) { v = (v < 0 ? -1 : 1) * w * Math.sqrt(Math.max(0, 1 - xh * xh)); a2 = 1; }
            held = false; amp = a2; th = a2 > 1e-9 ? Math.atan2(-v / w, xh) : 0; A.set(D.clamp(Math.round(a2 * 100) / 100, 0.1, 1)); } });
      },
      resize: function () { geo(); },
      step: function (d, dt) {
        tm += dt;
        if (held) vh = d.grabVel()[0] / G.sc; else th += om() * dt;
        var T = 2 * Math.PI / om(); rec.push([tm, state()[0]]); while (rec.length > 2 && (tm - rec[0][0] > 3 * T || rec.length > 3000)) rec.shift();
      },
      draw: function (d, c) {
        var g0 = geo(), W = d.W, H = d.H, w = om(), T = 2 * Math.PI / w, s = state(), x = s[0], v = s[1], a = -w * w * x, i;
        var R = g0.R, sc = g0.sc, ccx = g0.ccx, ccy = g0.ccy, ra = Math.max(amp, 0.02) * sc;
        /* 参考圆：转盘 + 立柱（等速圆周运动），投影到振子上 */
        var dg = c.createRadialGradient(ccx - R * 0.3, ccy - R * 0.3, R * 0.1, ccx, ccy, R + 8);
        dg.addColorStop(0, C.dark ? '#4a505b' : '#f4f5f7'); dg.addColorStop(1, C.dark ? '#2b2f37' : '#c9cdd4');
        D.shadow(c, ccx + 3, ccy + 5, R + 8, R + 6, 0.18); c.beginPath(); c.arc(ccx, ccy, R + 8, 0, 7); c.fillStyle = dg; c.fill(); c.strokeStyle = C['ink-3']; c.lineWidth = 1; c.stroke();
        c.strokeStyle = C['ink-3']; c.setLineDash([3, 4]); c.beginPath(); c.arc(ccx, ccy, ra, 0, 7); c.stroke(); c.setLineDash([]);
        var ang = held ? (x >= 0 ? 0 : Math.PI) : th, px = ccx + (held ? x * sc : ra * Math.cos(ang)), py = ccy - (held ? 0 : ra * Math.sin(ang));
        line(c, [[ccx, ccy], [px, py]], C.dark ? '#aeb4bd' : '#5d636e', 3); dot(c, ccx, ccy, 3.5, C['ink-2']);
        D.drawBall(c, px, py, 6, C.c2);
        txt(c, '参考圆（等速圆周运动的投影）', ccx, ccy + R + 18, C['ink-3'], F11);
        /* 弹簧振子：墙（木）、台面、刻度尺、弹簧、木块 */
        var fy = g0.fy, oy = g0.oy, wall = g0.wall, ox = g0.ox, bw = g0.bw, bx = ox + x * sc;
        D.ground(c, wall - 12, W - 8, fy, { kind: 'floor' });
        D.wood(c, wall - 12, fy - 66, 12, 66, { tone: 1 });
        D.ruler(c, function (u) { return ox + u * sc; }, -1, 1, fy + 9, { minor: 0.1, major: 0.5, h: 14, unit: 'm' });
        spring(c, wall, bx - bw / 2, oy, 9, 11);
        line(c, [[px, py], [bx, oy]], C['ink-3'], 1, [3, 4]);
        D.drawBlock(c, bx, oy, bw, bw, C.c1, { label: 'm' });
        txt(c, 'O', ox, fy + 32, C['ink-3'], F11);
        if (Math.abs(v) > 0.01) arrow(c, bx, oy - bw / 2 - 12, bx + v * sc * 0.25, oy - bw / 2 - 12, C.c2, 2, 'v');
        if (Math.abs(a) > 0.01 && !held) arrow(c, bx, oy - bw / 2 - 28, bx + a * sc * 0.04, oy - bw / 2 - 28, C.warn, 2, 'a');
        if (!d.grabbed) D.hint(c, '可抓住木块拉开或推一下再松手', wall - 10, 12);
        /* x–t 图：虚线为理论曲线，实线为记录（像位置传感器一样逐帧记录；扫描线到右端后从左端重画） */
        var g = Map(0, 3 * T, -1, 1, 34, W - 10, H * 0.62, H - 18); axes(c, g, 't', 'x', 0, 0.5);
        var tt = tm % (3 * T), pts = [];
        if (!held) { for (i = 0; i <= 240; i++) { var ss = 3 * T * i / 240; pts.push([g.X(ss), g.Y(amp * Math.cos(th + w * (ss - tt)))]); } line(c, pts, C.c1, 1.2, [5, 4]); }
        var t0 = tm - tt, cur = [], old = [];
        rec.forEach(function (p) { if (tm - p[0] < 3 * T) (p[0] >= t0 ? cur : old).push([g.X(p[0] >= t0 ? p[0] - t0 : p[0] - t0 + 3 * T), g.Y(p[1])]); });
        c.save(); c.globalAlpha = 0.35; if (old.length > 1) line(c, old, C.c1, 2); c.restore(); if (cur.length > 1) line(c, cur, C.c1, 2.5);
        dot(c, g.X(tt), g.Y(x), 5, C.warn);
        d.out([['周期 T = 2π√(m/k)', fx(T, 3) + ' s'], ['角频率 ω', fx(w, 2) + ' rad/s'], ['振幅 A', held ? '手持中' : fx(amp, 2) + ' m'], ['最大速度 Aω', held ? '—' : fx(amp * w, 2) + ' m/s'], ['最大加速度 Aω²', held ? '—' : fx(amp * w * w, 2) + ' m/s²'], ['x / v / a', fx(x, 2) + ' / ' + fx(v, 2) + ' / ' + (held ? '手持中' : fx(a, 2))]],
          '单振动（単振動）：a = −ω²x。周期与振幅无关；在中心速度最大、端点加速度最大。可直接抓住木块拉开（或推一下）再松手：松手时的位置 x 与速度 v（真实比例）决定振幅 A = √(x² + (v/ω)²)（限 1 m）和相位；x–t 图的虚线是理论曲线 x = A cos(ωt + φ)，实线是实测记录。');
      } };
  });

  /* ⑦ 卫星轨道与宇宙速度：可抓住卫星移到别处，或朝任意方向甩出（手势速度按动画时间比例换算） */
  D.reg('orbit', function () {
    var r0, vr, s, s0, path = [], m, ph = 0, tan = true, held = false, sat = [0, 0], tm = 0, ghost = D.trail(16, 0.22), stars = [], KT = 2, dd; /* 动画 1 s ↔ 2 个时间单位 √(R³/GM) */
    var seed = 5; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 70; i++) stars.push([rnd(), rnd(), rnd()]);
    function predict(q, n) { var out = []; for (var i = 0; i < n; i++) { q = P.orbitStep(q, 1, 0.01); if (i % 4 === 0) out.push([q.x, q.y]); var rr = Math.hypot(q.x, q.y); if (rr > 12 || rr < 1) break; } return out; }
    function launch(q) { s0 = q; s = { x: q.x, y: q.y, vx: q.vx, vy: q.vy }; path = predict(s0, 3000); ghost.clear(); }
    function reset() { var v = vr.v * P.vCirc(1, r0.v); tan = true; launch({ x: r0.v * Math.cos(ph), y: r0.v * Math.sin(ph), vx: -v * Math.sin(ph), vy: v * Math.cos(ph) }); }
    function gesture(vx, vy, x, y) { /* 手势 px/s → 速度（单位 v₁(R) = 7.9 km/s）；太慢返回 null */
      var ux = m.dx(vx) / KT, uy = m.dy(vy) / KT, sp = Math.hypot(ux, uy), r = Math.hypot(x, y), v1 = P.vCirc(1, r);
      if (sp * 7.9 < 0.4) return null;
      var q = D.clamp(sp / v1, 0.6, 1.6), k = q * v1 / sp; ux *= k; uy *= k;
      var rad = (ux * x + uy * y) / r, gam = Math.asin(D.clamp(rad / (q * v1), -1, 1)); /* 与当地水平方向的夹角 */
      if (Math.abs(gam) < 2 * Math.PI / 180) { var sg = (x * uy - y * ux) >= 0 ? 1 : -1; ux = -sg * q * v1 * y / r; uy = sg * q * v1 * x / r; gam = 0; }
      return { vx: ux, vy: uy, q: q, gam: gam };
    }
    function hold(X, Y) { var x = m.ix(X), y = m.iy(Y), r = Math.hypot(x, y) || 1, rr = D.clamp(r, 1, 2.5); return [x * rr / r, y * rr / r]; }
    return { aspect: 1.35, animated: true,
      init: function (d) {
        dd = d;
        r0 = d.slider('发射处半径 r', 1, 2.5, 0.05, 1.2, function (v) { return fx(v, 2) + ' R'; }, reset);
        vr = d.slider('发射速度 v / v₁(r)', 0.6, 1.6, 0.01, 1.15, function (v) { return fx(v, 2) + (Math.abs(v - 1) < 0.005 ? '（圆）' : Math.abs(v - Math.SQRT2) < 0.006 ? '（逃逸）' : ''); }, reset);
        d.button('重置', function () { ph = 0; r0.set(1.2); vr.set(1.15); reset(); });
        d.grab({ r: 7, get: function () { return sat; },
          start: function () { held = true; },
          set: function (X, Y) { var p = hold(X, Y); s = { x: p[0], y: p[1], vx: s.vx, vy: s.vy }; },
          release: function (vx, vy) {
            held = false; var r = Math.hypot(s.x, s.y), g = gesture(vx, vy, s.x, s.y); ph = Math.atan2(s.y, s.x); r0.set(Math.round(r * 100) / 100);
            if (!g) { reset(); return; }                               /* 慢慢松手：只移动发射点，仍沿切线、v/v₁ 不变 */
            vr.set(Math.round(g.q * 100) / 100); tan = g.gam === 0; if (tan) { reset(); if ((s.x * g.vy - s.y * g.vx) < 0) { s0.vx = g.vx; s0.vy = g.vy; launch(s0); } return; }
            launch({ x: s.x, y: s.y, vx: g.vx, vy: g.vy }); } });
        reset();
      },
      resize: function (d) { var u = Math.min(d.W * 0.62 / 4.6, d.H / 2 / 3.3); m = Map(-0.62 * d.W / u, 0.38 * d.W / u, -d.H / 2 / u, d.H / 2 / u, 0, d.W, 0, d.H); },
      step: function (d, dt) {
        if (held) return; tm += dt;
        for (var i = 0; i < 6; i++) { s = P.orbitStep(s, 1, dt * KT / 6); } var r = Math.hypot(s.x, s.y); if (r > 10 || r < 1) launch(s0);
        ghost.push(tm, s.x, s.y);
      },
      draw: function (d, c) {
        var W = d.W, H = d.H, rr = (m.X(1) - m.X(0)), ex = m.X(0), ey = m.Y(0);
        c.fillStyle = C.dark ? 'rgba(220,225,240,.55)' : 'rgba(90,100,120,.35)'; stars.forEach(function (p) { c.fillRect(p[0] * W, p[1] * H, p[2] > 0.8 ? 2 : 1, p[2] > 0.8 ? 2 : 1); });
        D.glow(c, ex, ey, rr * 1.22, '#6fa8ff', C.dark ? 0.45 : 0.3);                                      /* 大气层 */
        D.drawBall(c, ex, ey, rr, C.dark ? '#3f7fd0' : '#2f6fc0'); c.fillStyle = '#fff'; c.font = '600 13px ' + D.FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('地球', ex, ey);
        c.strokeStyle = C.line; c.setLineDash([3, 5]); c.beginPath(); c.arc(ex, ey, rr * r0.v, 0, 7); c.stroke(); c.setLineDash([]);
        var gv = held ? d.grabVel() : null, g = held ? gesture(gv[0], gv[1], s.x, s.y) : null, pre = path;
        if (held) { var v1h = P.vCirc(1, Math.hypot(s.x, s.y)), q0 = g || { vx: -vr.v * v1h * s.y / Math.hypot(s.x, s.y), vy: vr.v * v1h * s.x / Math.hypot(s.x, s.y) }; pre = predict({ x: s.x, y: s.y, vx: q0.vx, vy: q0.vy }, 1500); }
        line(c, pre.map(function (p) { return [m.X(p[0]), m.Y(p[1])]; }), held ? C.accent : C.c1, 2, held ? [4, 5] : null);
        ghost.each(function (x, y, k) { D.drawBall(c, m.X(x), m.Y(y), 4, C.warn, { flat: true, alpha: 0.3 * k }); });
        var X = m.X(s.x), Y = m.Y(s.y), vx = held ? (g ? g.vx : 0) : s.vx, vy = held ? (g ? g.vy : 0) : s.vy, va = Math.atan2(-vy, vx) + Math.PI / 2;
        sat = [X, Y];
        c.save(); c.translate(X, Y); c.rotate(va); c.fillStyle = C.dark ? '#5d8fd6' : '#2f5f9e'; c.fillRect(-15, -2.5, 8, 5); c.fillRect(7, -2.5, 8, 5); c.restore(); /* 太阳能板 */
        D.drawBall(c, X, Y, 5.5, C.warn);
        if (vx || vy) arrow(c, X, Y, X + vx * 40, Y - vy * 40, C.c3, 2, 'v');
        if (!d.grabbed) D.hint(c, '可抓住卫星移动发射点，或甩出去', 10, H - 12);
        /* 读数按发射时的状态 s0 计算（拿在手里时按将要发射的状态） */
        var L0 = held ? { x: s.x, y: s.y, vx: g ? g.vx : 0, vy: g ? g.vy : 0 } : s0, r = Math.hypot(L0.x, L0.y), v = Math.hypot(L0.vx, L0.vy), v1 = 7.9 / Math.sqrt(r), q = v / P.vCirc(1, r);
        var eps = v * v / 2 - 1 / r, hh = L0.x * L0.vy - L0.y * L0.vx, ecc = Math.sqrt(Math.max(0, 1 + 2 * eps * hh * hh)), rp = hh * hh / (1 + ecc), radial = (L0.x * L0.vx + L0.y * L0.vy) / r;
        var gam = Math.asin(D.clamp(radial / (v || 1), -1, 1)) * 180 / Math.PI, o = P.orbitElems(1, r, v), kind, hit;
        if (held && !g) { kind = '（慢慢松手：只移动发射点）'; hit = ''; }
        else if (held ? g.gam === 0 : tan) {
          kind = q < 0.999 ? '椭圆（发射点为远地点）' : q <= 1.001 ? '圆' : q < Math.SQRT2 - 0.002 ? '椭圆（发射点为近地点）' : q <= Math.SQRT2 + 0.002 ? '抛物线（恰好逃逸）' : '双曲线（逃逸）';
          hit = q < 0.999 && o.rOther < 1 ? '，会撞到地面' : '';
        } else {
          kind = q < Math.SQRT2 - 0.002 ? '椭圆' : q <= Math.SQRT2 + 0.002 ? '抛物线（恰好逃逸）' : '双曲线（逃逸）';
          hit = rp < 1 && (eps < 0 || radial < 0) ? '，会撞到地面' : '';
        }
        var rows = [['轨道', kind + hit], ['v₁(r) = √(GM/r)', fx(v1, 2) + ' km/s'], ['v₂(r) = √2·v₁', fx(v1 * Math.SQRT2, 2) + ' km/s'], ['发射速度', held && !g ? '—' : fx(v1 * q, 2) + ' km/s（' + fx(q, 2) + ' v₁）'],
          ['周期', eps < 0 && !(held && !g) ? fx(2 * Math.PI * Math.pow(-1 / (2 * eps), 1.5) / (2 * Math.PI) * 84.4 / 60, 2) + ' h（以近地圆轨道 84 min 为 1 单位换算）' : '—']];
        if (!(held && !g) && Math.abs(gam) > 0.05) rows.push(['发射方向', '与当地水平方向成 ' + fx(Math.abs(gam), 0) + '°' + (gam > 0 ? '（向外）' : '（向内）')]);
        d.out(rows, '½mv² − GMm/r < 0 绕地球运动，= 0 恰好逃逸。地表附近 v₁ ≈ 7.9 km/s、v₂ ≈ 11.2 km/s。开普勒第二定律：靠近地球时更快。可直接抓住卫星：慢慢松手＝只移动发射点（仍沿切线、v/v₁ 不变）；甩出＝按手势速度和方向发射。动画中 1 s ≈ 27 min（2 个时间单位 √(R³/GM) ≈ 13.4 min），所以手势速度按“画面上每秒移动 1 个地球半径 ≈ 3.95 km/s”换算（限 0.6–1.6 v₁(r)；与水平方向相差 2° 以内视为沿切线）。');
      } };
  });

  /* ⑧ p–V 循环：拖动四个状态点；右侧（窄屏在下方）的气缸随运动中的状态点同步，状态点也可抓住沿循环拖动 */
  D.reg('pv', function () {
    var pts = [[1, 1], [1, 3], [3, 3], [3, 1]], m, ph = 0, held = false, dd, AP, mol = [], dot0 = [0, 0];
    var seed = 3; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 34; i++) { var a = rnd() * 6.283; mol.push([rnd(), rnd(), Math.cos(a), Math.sin(a)]); }
    function set4(a) { a.forEach(function (p, i) { pts[i] = p.slice(); }); pts.length = a.length; ph = 0; }
    function at(u) { var n = pts.length, i = Math.floor(u) % n, f = u - Math.floor(u), A = pts[i], B = pts[(i + 1) % n]; return [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, i, f]; }
    function wide(w) { return w >= 560; }
    return { aspect: function (w) { return wide(w) ? 1.45 : 0.72; }, maxH: 640, animated: true,
      init: function (d) {
        dd = d;
        for (var i = 0; i < 4; i++) (function (i) { d.handle({ hidden: function () { return i >= pts.length; }, get: function () { return [m.X(pts[i][0]), m.Y(pts[i][1])]; }, set: function (x, y) { pts[i] = [Math.max(0.5, Math.min(5, Math.round(m.ix(x) * 4) / 4)), Math.max(0.5, Math.min(4.5, Math.round(m.iy(y) * 4) / 4))]; } }); })(i);
        d.grab({ r: 7, get: function () { return dot0; }, start: function () { held = true; },
          set: function (x, y) { /* 投影到最近的一段上 */
            var best = Infinity, n = pts.length; for (var i = 0; i < n; i++) { var A = [m.X(pts[i][0]), m.Y(pts[i][1])], B = [m.X(pts[(i + 1) % n][0]), m.Y(pts[(i + 1) % n][1])], dx = B[0] - A[0], dy = B[1] - A[1], L2 = dx * dx + dy * dy || 1;
              var f = D.clamp(((x - A[0]) * dx + (y - A[1]) * dy) / L2, 0, 0.999), q = Math.hypot(A[0] + dx * f - x, A[1] + dy * f - y); if (q < best) { best = q; ph = i + f; } } },
          release: function () { held = false; } });
        d.button('矩形循环', function () { set4([[1, 1], [1, 3], [3, 3], [3, 1]]); });
        d.button('三角形循环', function () { set4([[1, 1], [1, 3], [3, 1]]); });
        d.button('反向（制冷机）', function () { pts.reverse(); ph = 0; });
      },
      resize: function (d) {
        var W = d.W, H = d.H;
        if (wide(W)) { m = Map(0, 5.25, 0, 4.75, 46, W * 0.66, 16, H - 30); AP = { x0: W * 0.69, x1: W - 10, y0: 14, y1: H - 14 }; }
        else { m = Map(0, 5.25, 0, 4.75, 46, W - 16, 16, H * 0.56); AP = { x0: 12, x1: W - 12, y0: H * 0.56 + 26, y1: H - 10 }; }
      },
      step: function (d, dt) { if (!held) ph = (ph + dt / 1.5) % pts.length; var st = at(ph), sp = 0.25 * Math.sqrt(Math.max(st[0] * st[1], 0.05)) * dt; /* 分子速率 ∝ √T ∝ √(pV) */
        for (var i = 0; i < mol.length; i++) { var q = mol[i], s = sp; q[0] += q[2] * s; q[1] += q[3] * s; if (q[0] < 0 || q[0] > 1) { q[2] = -q[2]; q[0] = D.clamp(q[0], 0, 1); } if (q[1] < 0 || q[1] > 1) { q[3] = -q[3]; q[1] = D.clamp(q[1], 0, 1); } } },
      draw: function (d, c) {
        var W = d.W, H = d.H, i, A, B;
        if (ph >= pts.length) ph = 0;
        axes(c, m, 'V [×10⁻³ m³]', 'p [×10⁵ Pa]', 1, 1);
        /* 等温线参考 */
        [2, 4, 8].forEach(function (k) { var q = []; for (var V = k / 4.6; V <= 5.2; V += 0.05) q.push([m.X(V), m.Y(k / V)]); line(c, q, C.line, 1, [2, 4]); });
        var r = P.cycle(pts);
        c.beginPath(); pts.forEach(function (p, i) { i ? c.lineTo(m.X(p[0]), m.Y(p[1])) : c.moveTo(m.X(p[0]), m.Y(p[1])); }); c.closePath(); c.fillStyle = r.W >= 0 ? C['accent-soft'] : C['warn-soft'] || C['accent-soft']; c.fill();
        var cols = [C.c1, C.c2, C.c3, C.c4], names = 'ABCD';
        for (i = 0; i < pts.length; i++) {
          A = pts[i]; B = pts[(i + 1) % pts.length]; var x1 = m.X(A[0]), y1 = m.Y(A[1]), x2 = m.X(B[0]), y2 = m.Y(B[1]);
          line(c, [[x1, y1], [x2, y2]], cols[i], 3); arrow(c, (x1 * 0.6 + x2 * 0.4), (y1 * 0.6 + y2 * 0.4), (x1 * 0.45 + x2 * 0.55), (y1 * 0.45 + y2 * 0.55), cols[i], 3);
          txt(c, names[i] + '（T∝pV=' + fx(A[0] * A[1], 2) + '）', x1 + 10, y1 - 18, C['ink-2'], F12, 'left');
        }
        /* 运动中的状态点与此刻的热量方向 */
        var s = at(ph), V = s[0], p = s[1], seg = s[2], A0 = pts[seg], B0 = pts[(seg + 1) % pts.length], e = 1e-3, qd = P.gasSeg(p, V, p + (B0[1] - A0[1]) * e, V + (B0[0] - A0[0]) * e).Q, heat = Math.abs(qd) < 1e-9 ? 0 : qd > 0 ? 1 : -1;
        dot0 = [m.X(V), m.Y(p)]; D.drawBall(c, dot0[0], dot0[1], 6, C.warn);
        /* 气缸：活塞高度 ∝ V，砝码 ∝ p，分子速率 ∝ √T，气体颜色随 T 变化 */
        var ap = AP, cw = Math.min(ap.x1 - ap.x0 - 80, 110), cx = ap.x0 + (ap.x1 - ap.x0 - 60) / 2, base = ap.y1 - 26, Hc = Math.min(base - ap.y0 - 50, 230), hV = Hc * V / 5.25, top = base - hV;
        var Tmax = Math.max.apply(null, pts.map(function (q) { return q[0] * q[1]; })), tk = D.clamp(V * p / (Tmax || 1), 0, 1);
        if (heat > 0) { D.glow(c, cx, base + 14, cw * 0.55, '#ff8a3d', 0.75); txt(c, '吸热 Q > 0', cx, base + 18, C.warn, '600 12px ' + D.FONT); }
        else if (heat < 0) { D.glow(c, cx, base + 14, cw * 0.55, '#58a6ff', 0.6); txt(c, '放热 Q < 0', cx, base + 18, C.c2, '600 12px ' + D.FONT); }
        var gc = 'rgba(' + Math.round(90 + 150 * tk) + ',' + Math.round(140 - 40 * tk) + ',' + Math.round(230 - 170 * tk) + ',' + (C.dark ? 0.32 : 0.22) + ')';
        c.fillStyle = gc; c.fillRect(cx - cw / 2, top, cw, hV);
        var mb = D.ballSprite(2.6, C.dark ? '#e9ecf1' : '#4a4f59'), ms = Math.ceil(2 * 2.6 + 2);
        mol.forEach(function (q) { D.blit(c, mb, cx - cw / 2 + 4 + q[0] * (cw - 8), top + 4 + q[1] * Math.max(hV - 8, 1), ms, ms); });
        var wg = c.createLinearGradient(cx - cw / 2 - 6, 0, cx + cw / 2 + 6, 0); wg.addColorStop(0, 'rgba(120,130,145,.55)'); wg.addColorStop(0.15, 'rgba(255,255,255,.35)'); wg.addColorStop(0.85, 'rgba(255,255,255,.12)'); wg.addColorStop(1, 'rgba(90,100,115,.5)');
        c.fillStyle = wg; c.fillRect(cx - cw / 2 - 5, base - Hc - 12, 5, Hc + 14); c.fillRect(cx + cw / 2, base - Hc - 12, 5, Hc + 14); c.fillRect(cx - cw / 2 - 5, base, cw + 10, 5); /* 玻璃气缸壁 */
        var pg = c.createLinearGradient(0, top - 10, 0, top); pg.addColorStop(0, '#d5d9df'); pg.addColorStop(1, '#7d838d'); c.fillStyle = pg; c.fillRect(cx - cw / 2, top - 10, cw, 10); /* 活塞 */
        D.drawWeight(c, cx, top - 10 - 4 - p * 8, cw * 0.5, p * 8 + 4, C.c3);
        var my = base - Hc * 0.55; D.drawMeter(c, ap.x1 - 22, my, 20, p / 5, { label: 'p', max: 5 });
        txt(c, 'p = ' + fx(p, 2), ap.x1, my + 32, C['ink-2'], F12, 'right'); txt(c, 'V = ' + fx(V, 2), ap.x1, my + 48, C['ink-2'], F12, 'right'); txt(c, 'T∝pV = ' + fx(V * p, 2), ap.x1, my + 64, C['ink-2'], F12, 'right');
        if (!d.grabbed) D.hint(c, '可拖动顶点，或抓住橙色状态点沿循环拖', ap.x0, ap.y0 + 4);
        var U = 100, rows = r.segs.map(function (s, i) { return [names[i] + '→' + names[(i + 1) % pts.length], 'W ' + fx(s.W * U, 0) + '　ΔU ' + fx(s.dU * U, 0) + '　Q ' + fx(s.Q * U, 0) + ' J']; });
        rows.push(['一循环净功 W（= 面积）', fx(r.W * U, 0) + ' J' + (r.W > 0 ? '（顺时针：热机）' : r.W < 0 ? '（逆时针：外界对气体做功）' : '')]);
        rows.push(['吸收热量 Q_in', fx(r.Qin * U, 0) + ' J']); if (r.W > 0) rows.push(['热效率 e = W/Q_in', fx(r.eff * 100, 1) + ' %']);
        rows.push(['状态点（' + names[seg] + '→' + names[(seg + 1) % pts.length] + '）', 'p ' + fx(p, 2) + '　V ' + fx(V, 2) + '　' + (heat > 0 ? '此刻吸热' : heat < 0 ? '此刻放热' : '此刻 Q = 0')]);
        d.out(rows, '单原子理想气体：ΔU = (3/2)nRΔT = (3/2)Δ(pV)，Q = ΔU + W（W 为气体对外做功 = 图线下面积）。1×10⁵ Pa × 1×10⁻³ m³ = 100 J。Q_in 已把一条斜线中途由吸热转放热的情况分开计算。气缸示意图与橙色状态点同步：活塞高度 ∝ V，砝码表示外界压强 p，分子速率 ∝ √T，底部显示此刻吸热还是放热。可拖动顶点 A–D 改变循环，也可抓住橙色状态点沿循环拖动。');
      } };
  });

  /* ⑨ 波：叠加（可抓住绳的两端自己甩出波）、驻波（可拖动第 1 个节改变 λ）、纵波（弹簧圈） */
  D.reg('wave', function () {
    var mode, lam, A2, t = 0, tp = 0, m, L = 8, VW = 1.5, HB = 1 / 120, NB = 720, bufL = new Float32Array(NB), bufR = new Float32Array(NB), kw = -1, hand = [null, null], last = [-1e9, -1e9], yE = [0, 0];
    var rope = function () { return C.dark ? '#d8c39c' : '#7a5530'; };
    function auto(tau, end) { /* 原来的自动脉冲：每 8 s 从两端各发一个高斯脉冲（宽 0.45 m，1.5 m/s） */
      var cyc = Math.floor(tau / 8); if (cyc <= Math.floor(last[end] / 8)) return 0;
      var c0 = -2 + 1.5 * (((tau % 8) + 8) % 8); return (end ? A2.v : 1) * Math.exp(-Math.pow(c0 / 0.45, 2));
    }
    function endY(tau, end) { /* 端点位移的历史（环形缓冲，120 Hz 采样）；早于记录开始时用自动脉冲函数 */
      if (kw < 0) return auto(tau, end);
      var k = tau / HB, k0 = Math.floor(k), b = end ? bufR : bufL;
      if (k0 >= kw) return b[kw % NB];
      if (k0 < Math.max(0, kw - NB + 1)) return auto(tau, end);
      var f = k - k0; return b[k0 % NB] * (1 - f) + b[(k0 + 1) % NB] * f;
    }
    function yAt(x) { return endY(tp - x / VW, 0) + endY(tp - (L - x) / VW, 1); }
    function restart() { t = 0; tp = 0; kw = -1; last = [-1e9, -1e9]; yE = [0, 0]; }
    function endGrab(end) {
      return { r: 11, hidden: function () { return mode.v !== 'pulse'; }, get: function () { return [m.X(end ? L : 0), m.Y(endY(tp, end))]; },
        start: function () { hand[end] = endY(tp, end); }, set: function (x, y) { hand[end] = D.clamp(m.iy(y), -2, 2); }, release: function () { yE[end] = hand[end]; hand[end] = null; } };
    }
    return { aspect: 1.9, animated: true,
      init: function (d) {
        mode = d.seg('模式', [['pulse', '脉冲的叠加'], ['stand', '驻波'], ['long', '纵波']], 'stand', restart);
        lam = d.slider('波长 λ', 1, 4, 0.5, 2, function (v) { return fx(v, 1) + ' m'; });
        A2 = d.slider('脉冲 2 的振幅', -1, 1, 0.1, 1, function (v) { return fx(v, 1); });
        d.grab(endGrab(0)); d.grab(endGrab(1));
        d.grab({ r: 10, hidden: function () { return mode.v !== 'stand'; }, get: function () { return [m.X(lam.v / 2), m.Y(0)]; }, autoplay: false,
          set: function (x) { lam.set(D.clamp(Math.round(4 * m.ix(x)) / 2, 1, 4)); } });
      },
      resize: function (d) { m = Map(0, L, -2.4, 2.4, 20, d.W - 20, 20, d.H - 20); },
      step: function (d, dt) {
        t += dt * 0.5; tp += dt;
        var kn = Math.floor(tp / HB);
        for (var k = kw + 1; k <= kn; k++) for (var e = 0; e < 2; e++) {
          var v; if (hand[e] != null) { v = hand[e]; last[e] = k * HB; } else if (yE[e]) { v = yE[e] = Math.abs(yE[e]) < 0.01 ? 0 : D.approach(yE[e], 0, HB, 0.05); last[e] = k * HB; } else v = auto(k * HB, e);
          (e ? bufR : bufL)[k % NB] = v;
        }
        kw = Math.max(kw, kn);
      },
      draw: function (d, c) {
        var W = d.W, H = d.H, mv = mode.v, i, x, pts;
        function string(p) { line(c, p, rope(), 4); line(c, p.map(function (q) { return [q[0], q[1] - 1]; }), C.dark ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.55)', 1.2); }
        function post(x, y) { var g = c.createLinearGradient(x - 6, 0, x + 6, 0); g.addColorStop(0, '#5d636e'); g.addColorStop(0.4, '#c9cdd5'); g.addColorStop(1, '#4a4f59'); D.rrect(c, x - 5, y - 11, 10, 22, 3); c.fillStyle = g; c.fill(); }
        line(c, [[m.L, m.Y(0)], [m.R, m.Y(0)]], C.line, 1);
        if (mv === 'pulse') {
          var p1 = [], p2 = [], s = [];
          for (i = 0; i <= 320; i++) { x = L * i / 320; var y1 = endY(tp - x / VW, 0), y2 = endY(tp - (L - x) / VW, 1); p1.push([m.X(x), m.Y(y1)]); p2.push([m.X(x), m.Y(y2)]); s.push([m.X(x), m.Y(y1 + y2)]); }
          line(c, p1, C.c1, 1.5, [5, 4]); line(c, p2, C.c3, 1.5, [5, 4]); string(s);
          post(m.X(0), m.Y(endY(tp, 0))); post(m.X(L), m.Y(endY(tp, 1)));
          var tt = -2 + 1.5 * (tp % 8);
          if (tt > -0.5 && tt < L + 0.5 && Math.floor(tp / 8) > Math.floor(last[0] / 8)) arrow(c, m.X(tt), m.Y(1.4), m.X(tt + 0.6), m.Y(1.4), C.c1, 2);
          if (tt > -0.5 && tt < L + 0.5 && Math.floor(tp / 8) > Math.floor(last[1] / 8)) arrow(c, m.X(L - tt), m.Y(-1.4), m.X(L - tt - 0.6), m.Y(-1.4), C.c3, 2);
          if (!d.grabbed) D.hint(c, '可抓住绳的左端或右端上下甩，自己产生波', m.L, 12);
          d.out([['合成波', 'y = y₁ + y₂（重ね合わせの原理）'], ['相遇后', '两个脉冲各自保持原形状继续前进（波的独立性）'], ['波速', fx(VW, 1) + ' m/s（两端不反射）']], '把脉冲 2 的振幅设为 −1：相遇瞬间完全抵消（但能量仍在，介质在运动）。也可直接抓住绳的一端上下甩：端点的运动以波速 1.5 m/s 传开（虚线 1 从左端、虚线 2 从右端），绳上实线始终是两者之和；该端的自动脉冲暂停到下一轮。');
        } else if (mv === 'stand') {
          var T = 2, a = [], b = [], s2 = [], env = [];
          for (i = 0; i <= 320; i++) { x = L * i / 320; var ya = Math.sin(2 * Math.PI * (x / lam.v - t / T)), yb = Math.sin(2 * Math.PI * (x / lam.v + t / T)); a.push([m.X(x), m.Y(ya)]); b.push([m.X(x), m.Y(yb)]); s2.push([m.X(x), m.Y(P.standing(1, lam.v, T, x, t))]); env.push(2 * Math.abs(Math.sin(2 * Math.PI * x / lam.v))); }
          c.save(); c.beginPath(); env.forEach(function (e, i) { var X = m.X(L * i / 320); i ? c.lineTo(X, m.Y(e)) : c.moveTo(X, m.Y(e)); }); for (i = 320; i >= 0; i--) c.lineTo(m.X(L * i / 320), m.Y(-env[i])); c.closePath(); c.fillStyle = D.alpha(C['ink-3'], 0.1); c.fill(); c.restore(); /* 振动包络（快门拍下的模糊范围） */
          line(c, a, C.c1, 1.2, [5, 4]); line(c, b, C.c3, 1.2, [5, 4]); string(s2);
          for (x = 0; x <= L + 1e-9; x += lam.v / 2) { dot(c, m.X(x), m.Y(0), 4, C.warn); }
          c.save(); c.strokeStyle = C.warn; c.lineWidth = 2; c.beginPath(); c.arc(m.X(lam.v / 2), m.Y(0), 8, 0, 7); c.stroke(); c.restore();
          for (x = lam.v / 4; x <= L; x += lam.v / 2) txt(c, '腹', m.X(x), m.Y(2.2), C.good, '600 12px ' + D.FONT);
          if (!d.grabbed) D.hint(c, '可左右拖动圈出的节，改变 λ', m.L, H - 10);
          d.out([['节（節）间距', 'λ/2 = ' + fx(lam.v / 2, 2) + ' m'], ['腹的振幅', '2A'], ['红点', '节：始终不动']], '向右（虚线 1）与向左（虚线 2）传播的同振幅、同波长的波叠加形成驻波（定常波）：y = 2A sin(2πx/λ) cos(2πt/T)。灰色带是绳振动的包络。可左右拖动圈出的第 1 个节（x = λ/2）来改变 λ（取到 0.5 m）。');
        } else {
          var w = 2 * Math.PI / 2, k = 2 * Math.PI / lam.v, Amp = 0.35, yc = H * 0.36, hh = H * 0.11;
          c.save(); c.strokeStyle = C.dark ? '#b9bfc9' : '#6b717c'; c.lineWidth = 1.4; c.beginPath(); /* 弹簧圈（スリンキー）：每一圈是一个介质“粒子” */
          for (x = 0; x <= L; x += 0.16) { var X0 = m.X(x + Amp * Math.sin(k * x - w * t)); c.moveTo(X0 + 2.5, yc); c.ellipse(X0, yc, 2.5, hh, 0, 0, 7); }
          c.stroke(); c.restore();
          for (x = 0; x <= L; x += 0.16) { if (Math.abs(x - 4) < 0.08) { var X1 = m.X(x + Amp * Math.sin(k * x - w * t)); c.save(); c.strokeStyle = C.warn; c.lineWidth = 3; c.beginPath(); c.ellipse(X1, yc, 2.5, hh, 0, 0, 7); c.stroke(); c.restore(); dot(c, X1, yc - hh - 6, 4, C.warn); } }
          var g = Map(0, L, -1, 1, 20, W - 20, H * 0.58, H - 18); line(c, [[g.L, g.Y(0)], [g.R, g.Y(0)]], C.line, 1);
          pts = []; for (i = 0; i <= 320; i++) { x = L * i / 320; pts.push([g.X(x), g.Y(Math.sin(k * x - w * t))]); } line(c, pts, C.c2, 2);
          txt(c, '把向右的位移画成向上：纵波 → 横波表示', g.L + 4, g.T - 6, C['ink-3'], F11, 'left');
          d.out([['密（密）', '横波表示中位移由正变负、斜率为负的零点'], ['疏（疎）', '位移由负变正的零点'], ['橙色圈', '同一个介质粒子：只在原位附近振动，不随波前进']], '纵波（疎密波）的介质振动方向与传播方向平行，例如声波。上图像一根弹簧圈（スリンキー），每一圈相当于一个介质粒子。');
        }
      } };
  });

  /* ⑩ 多普勒效应：可抓住声源小车拖动或甩出（波面就在小车当时的位置发出） */
  D.reg('doppler', function () {
    var vs, vo, f0, t = 0, fronts = [], lastEmit = 0, sx = 0, held = false, hv = 0, dd, K = 1.4; /* 动画是真实时间的 1.4 倍速 */
    var V = 340;
    function reset() { fronts = []; t = 0; lastEmit = -1e9; sx = 0; }
    function pxm() { return dd.W / 2400; }
    function SX(x) { return dd.W * 0.35 + (x - sx * 0.5) * pxm(); } /* 镜头跟随声源的一半位移 */
    function cy() { return dd.H * 0.46; }
    function vsNow() { return held ? D.clamp(Math.round(hv / 10) * 10, -200, 400) : vs.v; }
    function mic(c, x, y, col, lab, al) { var gy = cy() + 30; line(c, [[x, y + 6], [x, gy]], C.dark ? '#9aa0aa' : '#5d636e', 2); line(c, [[x - 8, gy], [x + 8, gy]], C.dark ? '#9aa0aa' : '#5d636e', 3); D.drawBall(c, x, y, 6.5, col); txt(c, lab, x + (al === 'left' ? 6 : -6), y - 18, col, F12, al); }
    return { aspect: 1.9, animated: true,
      init: function (d) {
        dd = d;
        vs = d.slider('声源速度 vₛ（向右）', -200, 400, 10, 120, function (v) { return v + ' m/s' + (v >= 340 ? '（≥ 声速）' : ''); }, reset);
        vo = d.slider('右侧观察者速度 v₀（向左为正）', -200, 200, 10, 0, function (v) { return v + ' m/s'; });
        f0 = d.slider('声源频率 f', 200, 1000, 10, 500, function (v) { return v + ' Hz'; });
        d.grab({ r: 22, get: function () { return [SX(sx), cy() + 12]; },
          start: function () { held = true; hv = 0; },
          set: function (x) { var X = D.clamp(x, 40, dd.W - 60); sx = (X - dd.W * 0.35) / (0.5 * pxm()); },
          release: function () { var v = vsNow(); held = false; vs.set(v); } });
        reset();
      },
      step: function (d, dt) {
        var sc = dt * K; t += sc * 340;
        if (held) hv = 2 * d.grabVel()[0] / pxm() / K;                                /* 屏幕 px/s → 世界 m/s（镜头跟随一半）→ 动画时间 */
        else sx += vs.v * sc;
        if (t - lastEmit >= 120) { fronts.push([sx, t]); lastEmit = t; } if (fronts.length > 30) fronts.shift(); if (Math.abs(sx) > 1800 && !held) reset();
      },
      draw: function (d, c) {
        var W = d.W, H = d.H, pxm_ = pxm(), y = cy(), gy = y + 30, X = SX(sx), V_s = vsNow();
        D.ground(c, 0, W, gy, { kind: 'floor' });
        c.strokeStyle = C.c2; c.lineWidth = 1.5; fronts.forEach(function (fr) { var r = (t - fr[1]) * pxm_; c.globalAlpha = Math.max(0.15, 1 - r / W); c.beginPath(); c.arc(SX(fr[0]), y, r, 0, 7); c.stroke(); }); c.globalAlpha = 1;
        /* 声源：小车上的蜂鸣器 */
        D.drawCart(c, X, gy, 54, 16, C.warn, { wheel: X / 5.44 });
        var top = gy - 2 * 5.44 * 0.9 - 16; c.fillStyle = C.dark ? '#c9cdd5' : '#3a3e46'; c.fillRect(X - 1.5, y + 4, 3, top - y - 4);
        D.glow(c, X, y, 14, C.warn, 0.5); D.drawBall(c, X, y, 6.5, C.dark ? '#8d939e' : '#4a4f59');
        txt(c, '声源', X, gy + 18, C.warn, '600 12px ' + D.FONT);
        mic(c, W - 24, y, C.c3, '观察者 B', 'right'); mic(c, 24, y, C.c1, '观察者 A', 'left');
        if (vo.v) arrow(c, W - 24, y - 32, W - 24 - D.clamp(vo.v / 10, -16, 16), y - 32, C.c3, 2);
        if (!d.grabbed) D.hint(c, '可抓住声源小车拖动或甩出', 10, 12);
        var fB = V_s < V ? P.doppler(f0.v, V, V_s, vo.v) : NaN, fA = P.doppler(f0.v, V, -V_s, 0);
        d.out([['B（前方）听到', isFinite(fB) ? fx(fB, 0) + ' Hz' : '冲击波（马赫锥），公式不适用'], ['A（后方、静止）听到', fx(fA, 0) + ' Hz'], ['前方波长 (V−vₛ)/f', V_s < V ? fx((V - V_s) / f0.v, 3) + ' m' : '—'], ['后方波长 (V+vₛ)/f', fx((V + V_s) / f0.v, 3) + ' m'], ['声源速度 vₛ', V_s + ' m/s' + (held ? '（手推中）' : '')]],
          'f′ = f (V + v₀)/(V − vₛ)（声源朝观察者 vₛ 取正、观察者朝声源 v₀ 取正，V = 340 m/s）。声源移动改变波长，观察者移动改变单位时间接收的波数。可直接抓住声源小车拖动：波面就在小车当时的位置发出；松手速度成为新的 vₛ。画面宽约 2400 m、动画是真实时间的 1.4 倍速，手势速度按此比例换算（取整到 10 m/s，限 −200～400 m/s；停住再松手 vₛ = 0）。');
      } };
  });
})();
(function () {
  'use strict';
  var D = window.EJUDemo, P = D.P, C = D.COL, fx = D.fx, sci = D.sci, arrow = D.arrow, txt = D.txt, line = D.line, dot = D.dot, Map = D.Map, axes = D.axes, bars = D.bars;
  var F11 = '11px ' + D.FONT, F12 = '12px ' + D.FONT;
  function metal(c, x, y, w, hgt, vertical) { /* 金属件（支架、极板）：线性渐变 */
    var g = vertical ? c.createLinearGradient(x, 0, x + w, 0) : c.createLinearGradient(0, y, 0, y + hgt);
    g.addColorStop(0, C.dark ? '#6b717c' : '#8c929c'); g.addColorStop(0.35, C.dark ? '#d5d9df' : '#f1f3f6'); g.addColorStop(1, C.dark ? '#4a4f59' : '#6b717c'); c.fillStyle = g; c.fillRect(x, y, w, hgt);
  }

  /* ⑪ 透镜成像：光具座上的物体可直接抓住拖动（几何光学：拖到新位置后按 1/a + 1/b = 1/f 更新） */
  D.reg('lens', function () {
    var type, f, ob = { a: 30, h: 8 }, m, Hb;
    return { aspect: 1.7,
      init: function (d) {
        type = d.seg('透镜', [['convex', '凸透镜'], ['concave', '凹透镜']], 'convex');
        f = d.slider('焦距 |f|', 8, 25, 1, 15, function (v) { return v + ' cm'; });
        d.grab({ r: 10, get: function () { return [m.X(-ob.a), m.Y(ob.h)]; },
          set: function (x, y) { ob.a = Math.max(2, Math.min(-m.x0 - 2, Math.round(-m.ix(x)))); ob.h = Math.max(2, Math.min(m.y1 - 2, Math.round(m.iy(y)))); } });
      },
      resize: function (d) { var u = d.W / 120, Y0 = d.H * 0.46; Hb = d.H - 28; m = Map(-60, 60, -(Hb - Y0) / u, Y0 / u, 0, d.W, 0, Hb); },
      draw: function (d, c) {
        var F = type.v === 'convex' ? f.v : -f.v, r = P.lens(ob.a, F), X = m.X, Y = m.Y, W = d.W, x0 = X(0), y0 = Y(0);
        /* 光具座：导轨 + 刻度尺（0 在透镜处，单位 cm） */
        D.ground(c, 4, W - 4, Hb + 2, { kind: 'rail', depth: 7 });
        D.ruler(c, X, -60, 60, Hb + 12, { minor: 1, major: 5, every: 10, h: 14, unit: 'cm', fmt: function (u) { return String(Math.abs(u)); } });
        function holder(x, yTop) { metal(c, x - 1.5, yTop, 3, Hb + 2 - yTop, true); D.rrect(c, x - 9, Hb - 5, 18, 7, 2); c.fillStyle = C.dark ? '#3a3e46' : '#4a4f59'; c.fill(); }
        line(c, [[0, y0], [W, y0]], C['ink-3'], 1);
        /* 透镜（玻璃）：凸透镜中间厚，凹透镜边缘厚 */
        var top = Y(m.y1 - 1), bot = Math.min(Y(m.y0 + 1), Hb - 14), hh = (bot - top) / 2, mid = (top + bot) / 2, tk = 7, cv = type.v === 'convex';
        holder(x0, bot);
        c.save(); c.beginPath();
        if (cv) { c.moveTo(x0, top); c.quadraticCurveTo(x0 + tk * 2, mid, x0, bot); c.quadraticCurveTo(x0 - tk * 2, mid, x0, top); }
        else { c.moveTo(x0 - tk, top); c.lineTo(x0 + tk, top); c.quadraticCurveTo(x0 + 1, mid, x0 + tk, bot); c.lineTo(x0 - tk, bot); c.quadraticCurveTo(x0 - 1, mid, x0 - tk, top); }
        c.closePath(); var lg = c.createLinearGradient(x0 - tk, 0, x0 + tk, 0); var gl = C.dark ? '#7fb2e5' : '#5b9bd5'; lg.addColorStop(0, D.alpha(gl, 0.45)); lg.addColorStop(0.45, 'rgba(255,255,255,.6)'); lg.addColorStop(1, D.alpha(gl, 0.35));
        c.fillStyle = lg; c.fill(); c.strokeStyle = gl; c.lineWidth = 1.5; c.stroke(); c.restore(); /* 玻璃 */
        [f.v, -f.v, 2 * f.v, -2 * f.v].forEach(function (x, i) { dot(c, X(x), y0, 3.5, C['ink-2']); txt(c, i < 2 ? 'F' : '2F', X(x), y0 + 13, C['ink-2'], F11); });
        /* 物体：带光源的箭头 */
        var oX = X(-ob.a), oY = Y(ob.h);
        holder(oX, y0 + 2); D.glow(c, oX, oY, 16, C.c1, 0.35); arrow(c, oX, y0, oX, oY, C.c1, 3.5);
        var bx = r.b, by = r.m * ob.h, has = isFinite(bx);
        function ray(pts, col, dash) { line(c, pts.map(function (p) { return [X(p[0]), Y(p[1])]; }), col, 1.6, dash); }
        var far = 70, ra = C.warn, rb = C.c3, rc = C.c4;
        /* 实像：光屏放在像的位置 */
        if (has && bx > 0 && X(bx) < W - 6) {
          var sh = Math.max(Math.abs(Y(by) - y0) + 14, 30), sy = Math.min(y0, Y(by)) - 7; holder(X(bx), Math.max(sy + sh, y0) );
          c.fillStyle = C.dark ? 'rgba(235,232,224,.16)' : 'rgba(255,255,255,.85)'; c.fillRect(X(bx) - 3, sy, 6, sh); c.strokeStyle = C['ink-3']; c.lineWidth = 1; c.strokeRect(X(bx) - 3, sy, 6, sh);
        }
        /* 1) 平行光轴 → 过焦点（凸）/ 好像从前焦点发出（凹） */
        var s1 = -ob.h / F; ray([[-ob.a, ob.h], [0, ob.h], [far, ob.h + s1 * far]], ra);
        /* 2) 过光心直进 */
        var s2 = -ob.h / ob.a; ray([[-ob.a, ob.h], [far, ob.h + s2 * (far + ob.a)]], rb);
        /* 3) 过前焦点（凸）/ 朝后焦点（凹）→ 平行 */
        if (Math.abs(ob.a - F) > 0.5) { var y3 = ob.h * F / (F - ob.a); ray([[-ob.a, ob.h], [0, y3], [far, y3]], rc); }
        if (has && bx < 0) { ray([[0, ob.h], [bx, by]], ra, [4, 4]); ray([[0, 0], [bx, by]], rb, [4, 4]); if (Math.abs(ob.a - F) > 0.5) ray([[0, ob.h * F / (F - ob.a)], [bx, by]], rc, [4, 4]); }
        if (has && Math.abs(bx) < 200) { c.save(); if (bx < 0) c.setLineDash([5, 4]); arrow(c, X(bx), y0, X(bx), Y(by), C.good, 3, bx > 0 ? '实像' : '虚像', 0); c.restore(); }
        if (!d.grabbed) D.hint(c, '可抓住物体（箭头）拖动', 8, 12);
        d.out(has ? [['物距 a', ob.a + ' cm'], ['像距 b', fx(bx, 1) + ' cm'], ['倍率 m = −b/a', fx(r.m, 2)], ['像', (bx > 0 ? '实像（実像）' : '虚像（虚像）') + '・' + (r.m < 0 ? '倒立' : '正立') + '・' + (Math.abs(r.m) > 1 ? '放大' : '缩小')]] : [['像', '物体在焦点上：折射光平行，不成像']],
          '1/a + 1/b = 1/f（凹透镜 f 取负；b < 0 为与物体同侧的虚像）。可直接抓住物体（箭头顶端）拖动，观察三条特征光线；实像落在光屏上，下方刻度尺以透镜为 0（cm）。');
      } };
  });

  /* ⑫ 双缝干涉：激光 → 双缝 → 光屏（侧视图可抓住光屏改 L、抓住上缝改 d；缝间距为示意放大） */
  D.reg('slit', function () {
    var lam, dd, L, dv;
    function geo(d) {
      var W = d.W, H = d.H, ah = Math.max(70, H * 0.26), xs = 86, span = W - xs - 24;
      return { W: W, H: H, ah: ah, mid: 8 + ah / 2, xs: xs, xsc: xs + span * L.v / 3, span: span, dp: 8 + dd.v * 26, y0: ah + 40, sh: H * 0.19 };
    }
    return { aspect: function (w) { return w < 520 ? 1.05 : 1.55; },
      init: function (d) {
        dv = d;
        lam = d.slider('波长 λ', 400, 700, 5, 550, function (v) { return v + ' nm'; });
        dd = d.slider('缝间距 d', 0.1, 1, 0.05, 0.3, function (v) { return fx(v, 2) + ' mm'; });
        L = d.slider('缝到屏距离 L', 0.5, 3, 0.1, 1.5, function (v) { return fx(v, 1) + ' m'; });
        d.grab({ r: 14, get: function () { var g = geo(dv); return [g.xsc, g.mid]; }, set: function (x) { var g = geo(dv); L.set(D.clamp(Math.round((x - g.xs) / g.span * 30) / 10, 0.5, 3)); } });
        d.grab({ r: 6, get: function () { var g = geo(dv); return [g.xs, g.mid - g.dp / 2]; }, set: function (x, y) { var g = geo(dv); dd.set(D.clamp(Math.round(((g.mid - y) * 2 - 8) / 26 / 0.05) * 0.05, 0.1, 1)); } });
      },
      draw: function (d, c) {
        var g = geo(d), W = g.W, H = g.H, col = D.wlColor(lam.v), half = 0.015, i; /* 屏上显示 ±15 mm */
        var Lm = L.v, dm = dd.v * 1e-3, lm = lam.v * 1e-9, I0 = function (x) { return P.slitI(x, Lm, dm, lm); };
        /* —— 侧视图：激光器、双缝板、光屏 —— */
        var mid = g.mid, xs = g.xs, xsc = g.xsc, dp = g.dp, top = 8, bot = 8 + g.ah;
        D.ground(c, 10, W - 10, bot + 4, { kind: 'rail', depth: 6 });
        D.rrect(c, 12, mid - 11, 50, 22, 4); var lg = c.createLinearGradient(0, mid - 11, 0, mid + 11); lg.addColorStop(0, '#5d636e'); lg.addColorStop(0.4, '#9aa0aa'); lg.addColorStop(1, '#2b2e35'); c.fillStyle = lg; c.fill();
        c.fillStyle = '#fff'; c.font = '600 11px ' + D.FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('激光', 37, mid);
        line(c, [[62, mid], [xs, mid]], col, 3); D.glow(c, xs, mid, 14, col, 0.6);
        c.save(); c.globalAlpha = 0.18; c.fillStyle = col; [-1, 1].forEach(function (k) { var sy = mid + k * dp / 2; c.beginPath(); c.moveTo(xs, sy); c.lineTo(xsc, top + 4); c.lineTo(xsc, bot - 4); c.closePath(); c.fill(); }); c.restore();
        metal(c, xs - 3, top, 6, mid - dp / 2 - 2 - top, true); metal(c, xs - 3, mid - dp / 2 + 2, 6, dp - 4, true); metal(c, xs - 3, mid + dp / 2 + 2, 6, bot - mid - dp / 2 - 2, true);
        D.drawBall(c, xs, mid - dp / 2, 3.5, C.accent);
        c.fillStyle = C.dark ? '#e9e6dc' : '#f8f6ef'; c.fillRect(xsc - 3, top, 6, bot - top); c.strokeStyle = C['ink-3']; c.lineWidth = 1; c.strokeRect(xsc - 3, top, 6, bot - top);
        for (i = 0; i < bot - top; i += 2) { var yy = top + i, xm = (yy - mid) / (bot - top) * 0.03; c.fillStyle = D.alpha(col, I0(xm)); c.fillRect(xsc - 3, yy, 6, 2); } /* 侧视的光屏也显示条纹（纵向 ±15 mm） */
        line(c, [[xs, bot + 20], [xsc, bot + 20]], C['ink-3'], 1); line(c, [[xs, bot + 15], [xs, bot + 25]], C['ink-3'], 1); line(c, [[xsc, bot + 15], [xsc, bot + 25]], C['ink-3'], 1);
        txt(c, 'L = ' + fx(Lm, 1) + ' m', (xs + xsc) / 2, bot + 20, C['ink-2'], F11);
        txt(c, 'd', xs + 12, mid - dp / 2 - 8, C.accent, '600 12px ' + D.FONT);
        if (!d.grabbed) D.hint(c, '可拖光屏（改 L）、上缝蓝点（改 d）', 12, H - 8);
        /* —— 光屏正视图（暗室中的屏）与光强分布 —— */
        var m = Map(-half * 1000, half * 1000, 0, 1, 30, W - 14, g.y0 + g.sh + 34, H - 40), y0 = g.y0, sh = g.sh, rgb = col.match(/\d+/g).slice(0, 3).join(',');
        c.fillStyle = '#0b0d12'; c.fillRect(m.L, y0, m.R - m.L, sh);
        for (var X = m.L; X < m.R; X += 2) { c.fillStyle = 'rgba(' + rgb + ',' + I0(m.ix(X) / 1000).toFixed(3) + ')'; c.fillRect(X, y0, 2, sh); }
        c.strokeStyle = C.line; c.strokeRect(m.L, y0, m.R - m.L, sh);
        axes(c, m, 'x [mm]', 'I', 5, 0.5);
        var pts = []; for (X = m.L; X <= m.R; X += 1.5) pts.push([X, m.Y(I0(m.ix(X) / 1000))]);
        line(c, pts, col, 2);
        var dx = P.slitDx(Lm, dm, lm);
        arrow(c, m.X(0), y0 + sh + 8, m.X(dx * 1000), y0 + sh + 8, C.ink, 1.5); txt(c, 'Δx', m.X(dx * 500), y0 + sh + 20, C.ink);
        d.out([['明纹间隔 Δx = Lλ/d', fx(dx * 1000, 2) + ' mm'], ['第 1 明纹', 'x = ±' + fx(dx * 1000, 2) + ' mm'], ['程差（経路差）', '明：d·x/L = mλ　暗：(m+½)λ']], '缝间距变小或 L 变大、λ 变长，条纹都变宽。红光条纹比紫光宽。（理想双缝，未计单缝衍射包络）上方侧视图中可直接抓住光屏左右拖动改变 L，抓住上缝的蓝点上下拖动改变 d（缝距放大画出，非比例）；中间是暗室中看到的光屏（±15 mm）。');
      } };
  });

  /* ⑬ 电场线与等势线：可直接抓住电荷（金属小球）与绿色检验电荷，拖到新位置后电场即时更新（静电场，不做抛掷） */
  D.reg('field', function () {
    var Q = [{ x: 1.3, y: 1.5, q: 2e-9 }, { x: 2.7, y: 1.5, q: -2e-9 }], probe = { x: 2, y: 2.4 }, m, img = null, imgKey = '';
    function preset(k) { if (k === 'dip') Q = [{ x: 1.3, y: 1.5, q: 2e-9 }, { x: 2.7, y: 1.5, q: -2e-9 }]; else if (k === 'same') Q = [{ x: 1.3, y: 1.5, q: 2e-9 }, { x: 2.7, y: 1.5, q: 2e-9 }]; else Q = [{ x: 1.2, y: 1.0, q: 2e-9 }, { x: 2.8, y: 1.0, q: 2e-9 }, { x: 2, y: 2.3, q: -2e-9 }]; img = null; }
    return { aspect: 4 / 3,
      init: function (d) {
        d.seg('电荷配置', [['dip', '正负等量'], ['same', '同号等量'], ['tri', '三个电荷']], 'dip', function (v) { preset(v); });
        d.button('切换第 1 个电荷的正负', function () { Q[0].q = -Q[0].q; img = null; });
        for (var i = 0; i < 3; i++) (function (i) { d.grab({ r: 12, hidden: function () { return i >= Q.length; }, get: function () { return [m.X(Q[i].x), m.Y(Q[i].y)]; }, set: function (x, y) { Q[i].x = Math.max(0.15, Math.min(3.85, Math.round(m.ix(x) * 20) / 20)); Q[i].y = Math.max(0.15, Math.min(2.85, Math.round(m.iy(y) * 20) / 20)); } }); })(i);
        d.grab({ r: 7, get: function () { return [m.X(probe.x), m.Y(probe.y)]; }, set: function (x, y) { probe.x = Math.max(0, Math.min(4, m.ix(x))); probe.y = Math.max(0, Math.min(3, m.iy(y))); } });
      },
      resize: function (d) { m = Map(0, 4, 0, 3, 0, d.W, 0, d.H); img = null; },
      draw: function (d, c) {
        var W = d.W, H = d.H, key = JSON.stringify(Q) + C.dark + W;
        if (key !== imgKey || !img) { /* 低分辨率电势图 + 等势线（每 30 V） */
          var s = 3, nw = Math.ceil(W / s), nh = Math.ceil(H / s), cv = document.createElement('canvas'); cv.width = nw; cv.height = nh;
          var cx = cv.getContext('2d'), id = cx.createImageData(nw, nh), V = new Float32Array(nw * nh), step = 30;
          for (var j = 0; j < nh; j++) for (var i = 0; i < nw; i++) V[j * nw + i] = P.potential(Q, m.ix(i * s + s / 2), m.iy(j * s + s / 2));
          var bg = C.dark ? [28, 32, 41] : [255, 253, 248];
          for (j = 0; j < nh; j++) for (i = 0; i < nw; i++) {
            var v = V[j * nw + i], t = Math.max(-1, Math.min(1, v / 120)), o = (j * nw + i) * 4, col = t > 0 ? [230, 90, 70] : [60, 120, 230], a = Math.abs(t) * 0.45;
            var lv = Math.floor(v / step), edge = (i + 1 < nw && Math.floor(V[j * nw + i + 1] / step) !== lv) || (j + 1 < nh && Math.floor(V[(j + 1) * nw + i] / step) !== lv);
            if (edge && Math.abs(v) < 400) a = 0.9, col = C.dark ? [235, 232, 224] : [80, 80, 80];
            id.data[o] = bg[0] * (1 - a) + col[0] * a; id.data[o + 1] = bg[1] * (1 - a) + col[1] * a; id.data[o + 2] = bg[2] * (1 - a) + col[2] * a; id.data[o + 3] = 255;
          }
          cx.putImageData(id, 0, 0); img = cv; imgKey = key;
        }
        c.imageSmoothingEnabled = true; c.drawImage(img, 0, 0, W, H);
        /* 电场线：从正电荷出发（全为负时从负电荷反向） */
        var src = Q.filter(function (q) { return q.q > 0; }), dir = 1; if (!src.length) { src = Q; dir = -1; }
        c.strokeStyle = C.ink; c.lineWidth = 1.1; c.globalAlpha = 0.75;
        src.forEach(function (q0) { for (var k = 0; k < 16; k++) {
          var an = k / 16 * 2 * Math.PI, x = q0.x + 0.06 * Math.cos(an), y = q0.y + 0.06 * Math.sin(an); c.beginPath(); c.moveTo(m.X(x), m.Y(y));
          for (var n = 0; n < 400; n++) { var E = P.field(Q, x, y), e = Math.hypot(E[0], E[1]); if (!e) break; x += dir * 0.02 * E[0] / e; y += dir * 0.02 * E[1] / e; c.lineTo(m.X(x), m.Y(y));
            if (x < -0.5 || x > 4.5 || y < -0.5 || y > 3.5) break; var hitq = false; Q.forEach(function (qq) { if (qq !== q0 && Math.hypot(x - qq.x, y - qq.y) < 0.05) hitq = true; }); if (hitq) break;
            if (n === 40) { var a2 = Math.atan2(-E[1] * dir, E[0] * dir), X0 = m.X(x), Y0 = m.Y(y); c.stroke(); c.beginPath(); c.moveTo(X0 + 6 * Math.cos(a2), Y0 + 6 * Math.sin(a2)); c.lineTo(X0 - 6 * Math.cos(a2 - 0.5), Y0 - 6 * Math.sin(a2 - 0.5)); c.lineTo(X0 - 6 * Math.cos(a2 + 0.5), Y0 - 6 * Math.sin(a2 + 0.5)); c.closePath(); c.fillStyle = C.ink; c.fill(); c.beginPath(); c.moveTo(X0, Y0); } }
          c.stroke(); } });
        c.globalAlpha = 1;
        Q.forEach(function (q) { var X = m.X(q.x), Y = m.Y(q.y); D.glow(c, X, Y, 22, q.q > 0 ? C.c2 : C.c1, 0.35); D.drawCharge(c, X, Y, 11, q.q); });
        var E = P.field(Q, probe.x, probe.y), e = Math.hypot(E[0], E[1]), sc = Math.min(60, 20 * Math.log10(1 + e)) / (e || 1), PX = m.X(probe.x), PY = m.Y(probe.y);
        arrow(c, PX, PY, PX + E[0] * sc, PY - E[1] * sc, C.good, 2.5, 'E');
        D.drawBall(c, PX, PY, 6, C.good);
        if (!d.grabbed) D.hint(c, '可直接抓住电荷或绿色检验电荷拖动', 8, 12);
        d.out([['探针处电势 V', fx(P.potential(Q, probe.x, probe.y), 1) + ' V'], ['电场强度 |E|', fx(e, 1) + ' V/m（N/C）'], ['电荷', Q.map(function (q) { return (q.q > 0 ? '+' : '−') + '2 nC'; }).join('，')], ['等势线间隔', '30 V']],
          '可直接抓住电荷（红 +、蓝 −）或绿色检验电荷（探针）拖到新位置，电场线与等势线即时重算。电场线与等势线（等電位線）处处垂直，电场线从高电势指向低电势，等势线越密电场越强。V = Σkq/r，E 为各电荷电场的矢量和（坐标单位 m）。');
      } };
  });

  /* ⑭ 平行板电容器：可抓住上极板上下拖动改变 d，点按刀闸开关切换接通 / 断开 */
  D.reg('cap', function () {
    var mode, dr, er, dv;
    function wide(w) { return w >= 520; }
    function geo(d) {
      var W = d.W, H = d.H, wd = wide(W), Hc = wd ? H : H * 0.58, cx = wd ? W * 0.27 : W * 0.48, pw = wd ? Math.min(W * 0.32, 250) : Math.min(W * 0.46, 220);
      var kd = D.clamp(Hc * 0.12, 24, 40), yb = Hc * 0.66, gap = kd * dr.v, yt = yb - gap - 6; /* 下极板固定，上极板随 d 移动；kd = 每 d₀ 的像素 */
      return { W: W, H: H, wd: wd, Hc: Hc, cx: cx, pw: pw, kd: kd, yb: yb, gap: gap, yt: yt, bx: cx - pw / 2 - 40, sw: cx - pw / 4, wy: 24, by: Hc - 16 };
    }
    return { aspect: function (w) { return wide(w) ? 1.7 : 0.95; },
      init: function (d) {
        dv = d;
        mode = d.seg('开关', [['on', '保持接电池（V 一定）'], ['off', '充电后断开（Q 一定）']], 'on');
        dr = d.slider('板间距 d', 0.5, 3, 0.1, 1, function (v) { return fx(v, 1) + ' d₀'; });
        er = d.slider('介质 εᵣ（充满）', 1, 5, 0.5, 1, function (v) { return fx(v, 1); });
        d.grab({ r: 18, get: function () { var g = geo(dv); return [g.cx, g.yt - 10]; }, autoplay: false,
          set: function (x, y) { var g = geo(dv); dr.set(D.clamp(Math.round((g.yb - (y + 10) - 6) / g.kd * 10) / 10, 0.5, 3)); } });
        d.grab({ r: 14, get: function () { var g = geo(dv); return [g.sw, g.wy]; }, autoplay: false, start: function () { mode.set(mode.v === 'on' ? 'off' : 'on'); }, set: function () {} });
      },
      draw: function (d, c) {
        var S = 0.01, d0 = 1e-3, V0 = 10, r0 = P.capacitor(S, d0, 1, d0, V0, true), r = P.capacitor(S, dr.v * d0, er.v, d0, V0, mode.v === 'on');
        var g = geo(d), W = g.W, H = g.H, cx = g.cx, pw = g.pw, yb = g.yb, yt = g.yt, gap = g.gap, x0 = cx - pw / 2, i, x, on = mode.v === 'on';
        var bx = g.bx, wy = g.wy, by = g.by, sw = g.sw, bc = (wy + by) / 2;
        /* 导线、电池、刀闸开关 */
        D.wire(c, [[x0 + 14, yt], [x0 + 14, wy], [sw + 14, wy]]); D.wire(c, [[sw - 14, wy], [bx, wy], [bx, bc - 24]]);
        D.wire(c, [[x0 + 14, yb + 6], [x0 + 14, by], [bx, by], [bx, bc + 24]]);
        D.drawCell(c, bx, bc, 48, 18, -Math.PI / 2); txt(c, '10 V', bx, bc + 38, C['ink-2'], F12);
        var ang = on ? 0 : -0.75; c.save(); c.translate(sw - 14, wy); c.rotate(ang); metal(c, 0, -2, 28, 4); c.restore();
        D.drawBall(c, sw - 14, wy, 3.5, '#6b717c'); D.drawBall(c, sw + 14, wy, 3, '#6b717c'); D.drawBall(c, sw - 14 + Math.cos(ang) * 30, wy + Math.sin(ang) * 30, 4, C.c4);
        if (!on) txt(c, '断开', sw + 10, wy + 18, C.warn, F12);
        /* 介质、极板、电荷、电场 */
        if (er.v > 1) { var dg = c.createLinearGradient(0, yt + 6, 0, yb); dg.addColorStop(0, D.alpha(C.accent, 0.28)); dg.addColorStop(0.5, D.alpha(C.accent, 0.14)); dg.addColorStop(1, D.alpha(C.accent, 0.3)); c.fillStyle = dg; c.fillRect(x0 + 4, yt + 6, pw - 8, gap); txt(c, 'εᵣ = ' + fx(er.v, 1), x0 + pw - 10, yt + 6 + gap / 2, C.accent, F11, 'right'); }
        D.shadow(c, cx, yb + 12, pw * 0.55, 3, 0.25);
        metal(c, x0, yt, pw, 6); metal(c, x0, yb, pw, 6);
        c.fillStyle = C.c2; c.fillRect(x0, yt + 5, pw, 1.5); c.fillStyle = C.c1; c.fillRect(x0, yb - 0.5, pw, 1.5);
        line(c, [[cx, yt], [cx, yt - 8]], C.dark ? '#9aa0aa' : '#5d636e', 3); D.drawBall(c, cx, yt - 12, 6, C.dark ? '#7a6a55' : '#3a3e46'); /* 绝缘把手 */
        var nq = Math.max(1, Math.round(r.Q / r0.Q * 6)); for (i = 0; i < Math.min(nq, 24); i++) { x = x0 + (i + 0.5) * pw / Math.min(nq, 24); txt(c, '+', x, yt - 6, C.c2, '700 12px ' + D.FONT); txt(c, '−', x, yb + 15, C.c1, '700 12px ' + D.FONT); }
        var nE = Math.max(1, Math.round(r.E / r0.E * 5)); for (i = 0; i < Math.min(nE, 20); i++) { x = x0 + (i + 0.5) * pw / Math.min(nE, 20); arrow(c, x, yt + 7, x, yb - 1, C['ink-2'], 1.2); }
        /* 电压表并在极板两端 */
        var mx = x0 + pw + 26, my = (yt + yb) / 2;
        D.wire(c, [[x0 + pw, yt + 3], [mx, yt + 3], [mx, my - 16]], { w: 1.2 }); D.wire(c, [[x0 + pw, yb + 3], [mx, yb + 3], [mx, my + 16]], { w: 1.2 });
        D.drawMeter(c, mx, my, 15, r.V / 30, { label: 'V' }); txt(c, fx(r.V, 1) + ' V', mx, Math.max(yb + 3, my + 15) + 12, C['ink-2'], '600 12px ' + D.FONT);
        if (!d.grabbed) D.hint(c, '可上下拖上极板（改 d），点按开关', 8, 10);
        if (g.wd) bars(c, W * 0.58, 40, W * 0.4, H - 100, [['C', r.C / r0.C, C.c1], ['Q', r.Q / r0.Q, C.c3], ['V', r.V / r0.V, C.c2], ['E', r.E / r0.E, C['ink-2']], ['U', r.U / r0.U, C.warn]], 5, '与初始（d₀, εᵣ=1, 10 V）之比');
        else bars(c, 20, g.Hc + 26, W - 40, H - g.Hc - 62, [['C', r.C / r0.C, C.c1], ['Q', r.Q / r0.Q, C.c3], ['V', r.V / r0.V, C.c2], ['E', r.E / r0.E, C['ink-2']], ['U', r.U / r0.U, C.warn]], 5, '与初始（d₀, εᵣ=1, 10 V）之比');
        d.out([['C = εᵣε₀S/d', fx(r.C / r0.C, 2) + ' 倍（' + fx(r.C * 1e12, 1) + ' pF）'], ['Q', fx(r.Q / r0.Q, 2) + ' 倍'], ['V', fx(r.V, 2) + ' V'], ['E = V/d', fx(r.E / r0.E, 2) + ' 倍'], ['静电能 U = ½QV', fx(r.U / r0.U, 2) + ' 倍']],
          '接着电池：V 不变，Q = CV 随 C 变。断开后：Q 不变，V = Q/C；此时只改变 d 的话 E = Q/(εᵣε₀S) 不变。（S = 100 cm²，d₀ = 1 mm）可直接抓住上极板的绝缘把手上下拖动改变 d，点按刀闸开关切换“接着电池 / 断开”；电压表（满偏 30 V）显示板间电压。');
      } };
  });
})();
(function () {
  'use strict';
  var D = window.EJUDemo, P = D.P, C = D.COL, fx = D.fx, sci = D.sci, arrow = D.arrow, txt = D.txt, line = D.line, dot = D.dot, Map = D.Map, axes = D.axes;
  var F11 = '11px ' + D.FONT, F12 = '12px ' + D.FONT;
  function nice(x) { var e = Math.pow(10, Math.floor(Math.log10(x))), k = x / e; return (k <= 1 ? 1 : k <= 2 ? 2 : k <= 5 ? 5 : 10) * e; } /* 电表满偏取 1-2-5 系列 */

  /* ⑮ 含内阻的电源：输出功率与端电压。可抓住滑动变阻器的滑片（或 P–R 图上的点）改变 R */
  D.reg('dc', function () {
    var E, r, R, mP, mV, CK, dv;
    function wide(w) { return w >= 560; }
    return { aspect: function (w) { return wide(w) ? 1.7 : 0.8; },
      init: function (d) {
        dv = d;
        E = d.slider('电动势 E', 1, 12, 0.5, 6, function (v) { return fx(v, 1) + ' V'; });
        r = d.slider('内阻 r', 0.2, 5, 0.1, 1, function (v) { return fx(v, 1) + ' Ω'; });
        R = d.slider('外电阻 R', 0, 10, 0.1, 2, function (v) { return fx(v, 1) + ' Ω'; });
        d.handle({ get: function () { return [mP.X(R.v), mP.Y(P.circuit(E.v, r.v, R.v).P)]; }, set: function (x) { R.set(Math.max(0, Math.min(10, Math.round(mP.ix(x) * 10) / 10))); } });
        d.grab({ r: 10, get: function () { return [CK.xa0 + (CK.xa1 - CK.xa0) * R.v / 10, CK.rodY]; },
          set: function (x) { R.set(D.clamp(Math.round((x - CK.xa0) / (CK.xa1 - CK.xa0) * 100) / 10, 0, 10)); } });
      },
      resize: function (d) {
        var W = d.W, H = d.H, x0, x1, y0, y1;
        if (wide(W)) { mP = Map(0, 10, 0, 1, W * 0.42 + 30, W - 12, 26, H * 0.5 - 14); mV = Map(0, 1, 0, 1, W * 0.42 + 30, W - 12, H * 0.5 + 30, H - 24); x0 = 10; x1 = W * 0.4; y0 = 0; y1 = H; }
        else { mP = Map(0, 10, 0, 1, 46, W - 12, H * 0.42 + 26, H * 0.7 - 14); mV = Map(0, 1, 0, 1, 46, W - 12, H * 0.7 + 24, H - 24); x0 = 0; x1 = W; y0 = 0; y1 = H * 0.42; }
        var xl = x0 + 22, xr = x1 - 14, xv = xl + 46;
        CK = { xl: xl, xr: xr, xv: xv, yt: y0 + 34, yb: y1 - 22, xa0: xv + 30, xa1: xr - 22 }; CK.rodY = CK.yb - 6 - 9;
      },
      draw: function (d, c) {
        var k = P.circuit(E.v, r.v, R.v), Isc = E.v / r.v, ck = CK, xl = ck.xl, xr = ck.xr, xv = ck.xv, yt = ck.yt, yb = ck.yb, ym = (yt + yb) / 2;
        /* 实物电路：干电池 + 内阻（虚线框内为“电源”）、电流表、电压表（测端电压）、滑动变阻器 R */
        var cl = Math.min(44, (yb - yt) * 0.3), cy = ym - cl / 2 - 4, rt = ym + 6, rb = Math.min(ym + 6 + cl, yb - 12);
        D.wire(c, [[xl, cy - cl / 2], [xl, yt], [xr, yt], [xr, ck.rodY], [ck.xa1 + 6, ck.rodY]]);
        D.wire(c, [[ck.xa0 - 4, yb], [xl, yb], [xl, rb]]); D.wire(c, [[xl, cy + cl / 2], [xl, rt]]);
        D.wire(c, [[xv, yt], [xv, ym - 15]], { w: 1.2 }); D.wire(c, [[xv, ym + 15], [xv, yb]], { w: 1.2 });
        c.save(); c.strokeStyle = C['ink-3']; c.setLineDash([4, 3]); c.strokeRect(xl - 17, cy - cl / 2 - 10, 34, rb - cy + cl / 2 + 18); c.restore();
        D.drawCell(c, xl, cy, cl, 16, -Math.PI / 2);
        D.drawResistor(c, xl, rt, xl, rb, { th: 8, len: (rb - rt) * 0.7 }); txt(c, 'r', xl + 12, (rt + rb) / 2, C['ink-2'], '600 12px ' + D.FONT, 'left');
        txt(c, 'E, r', xl, cy - cl / 2 - 20, C['ink-2'], F12);
        var rh = D.drawRheostat(c, ck.xa0, ck.xa1, yb, R.v / 10); txt(c, 'R = ' + fx(R.v, 1) + ' Ω', (ck.xa0 + ck.xa1) / 2, yb + 15, C.c1, '600 12px ' + D.FONT);
        var Am = nice(Isc), Vm = nice(E.v), ax = (xv + xr) / 2;
        D.drawMeter(c, ax, yt, 16, k.I / Am, { label: 'A', max: Am }); txt(c, 'I = ' + fx(k.I, 2) + ' A', ax, yt + 28, C.c2, '600 12px ' + D.FONT);
        D.drawMeter(c, xv, ym, 15, k.V / Vm, { label: 'V' }); txt(c, fx(k.V, 2) + ' V', xv + 20, ym, C['ink-2'], '600 12px ' + D.FONT, 'left');
        arrow(c, ax + 24, yt - 10, ax + 50, yt - 10, C.c2, 2);
        if (!d.grabbed) D.hint(c, '可拖滑动变阻器的滑片', ck.xa0 - 6, yb - 34);
        /* P–R 曲线 */
        var Pm = k.Pmax * 1.15; mP.y1 = Pm; axes(c, mP, 'R [Ω]', 'P [W]', 2, 0);
        var pts = []; for (var i = 0; i <= 200; i++) { var RR = i / 20; pts.push([mP.X(RR), mP.Y(P.circuit(E.v, r.v, RR).P)]); } line(c, pts, C.c1, 2);
        line(c, [[mP.X(r.v), mP.T], [mP.X(r.v), mP.B]], C.warn, 1, [4, 4]); txt(c, 'R = r', mP.X(r.v) + 4, mP.T + 8, C.warn, F11, 'left');
        /* V–I（电源伏安图） */
        mV.x1 = Isc * 1.05; mV.y1 = E.v * 1.15; axes(c, mV, 'I [A]', 'V [V]', 0, 0);
        line(c, [[mV.X(0), mV.Y(E.v)], [mV.X(Isc), mV.Y(0)]], C.c2, 2); dot(c, mV.X(k.I), mV.Y(k.V), 5, C.warn);
        txt(c, 'E', mV.L - 8, mV.Y(E.v), C.c2, F12, 'right'); txt(c, '斜率 −r', mV.X(Isc * 0.5) + 8, mV.Y(E.v * 0.5) - 6, C.c2, F11, 'left');
        d.out([['电流 I = E/(R+r)', fx(k.I, 2) + ' A'], ['端电压 V = E − rI', fx(k.V, 2) + ' V'], ['R 的功率 P = RI²', fx(k.P, 2) + ' W'], ['最大输出 E²/4r（R = r）', fx(k.Pmax, 2) + ' W'], ['效率 R/(R+r)', fx(k.eta * 100, 0) + ' %']],
          '可直接抓住滑动变阻器的滑片，或拖动 P–R 图上的点改变 R（电流表满偏取短路电流 E/r 以上的 1-2-5 整数值；电压表测端电压）。R = r 时输出功率最大（此时效率 50%）。下图：端电压随电流线性下降，纵截距 E、斜率 −r、横截距为短路电流 E/r。');
      } };
  });

  /* ⑯ 磁场中带电粒子的圆运动：可抓住粒子放到别处或朝任意方向射出（速率按动画比例换算） */
  D.reg('lorentz', function () {
    var sg, v, B, mm, dd, st = null, L0 = null, held = false, wait = 0, tm = 0, ghost = D.trail(16, 0.05), pr = null;
    var mp = 1.67e-27, q = 1.6e-19, KV = 0.09; /* 画面速度 = v[×10⁵ m/s] × 0.09H px/s ⇒ 动画 1 s ≈ 0.2 μs */
    function G() { var W = dd.W, H = dd.H, k = P.cyclo(mm.v * mp, q, v.v * 1e5, B.v), sc = H * 0.45 / 0.1; return { W: W, H: H, bx: W * 0.3, sc: sc, k: k, rp: k.r * sc, spd: v.v * KV * H, y0: H * 0.5 }; }
    function def() { return { u: 0.3 - 0.24, v: 0.5, a: 0 }; }
    function adv(p, dt, g) { /* 场外直线；场内（x > bx）按精确圆弧前进。a 为屏幕坐标下的速度方向角 */
      if (p.x > g.bx) { var Om = -sg.v * g.spd / g.rp, a1 = p.a + Om * dt, Rr = g.spd / Om; p.x += Rr * (Math.sin(a1) - Math.sin(p.a)); p.y -= Rr * (Math.cos(a1) - Math.cos(p.a)); p.turn = (p.turn || 0) + Math.abs(Om * dt); p.a = a1; }
      else { p.x += g.spd * Math.cos(p.a) * dt; p.y += g.spd * Math.sin(p.a) * dt; }
    }
    function out(p, g) { return p.x < -30 || p.x > g.W + 30 || p.y < -30 || p.y > g.H + 30; }
    function predict(p0, g) { /* 预测路径与在场中转过的角度 */
      var p = { x: p0.x, y: p0.y, a: p0.a, turn: 0 }, pts = [[p.x, p.y]], h = Math.min(0.02, 0.04 * g.rp / g.spd), entered = p.x > g.bx;
      for (var i = 0; i < 2000; i++) { adv(p, h, g); if (p.x > g.bx) entered = true; if (i % 2 === 0) pts.push([p.x, p.y]); if (out(p, g) || p.turn > 2 * Math.PI + 0.05) break; }
      return { pts: pts, turn: p.turn, entered: entered, full: p.turn > 2 * Math.PI };
    }
    function launch() { var g = G(); if (!L0) L0 = def(); st = { x: L0.u * g.W, y: L0.v * g.H, a: L0.a, turn: 0 }; wait = 0; ghost.clear(); pr = predict(st, g); }
    function reset() { L0 = def(); launch(); }
    return { aspect: 1.6, animated: true,
      init: function (d) {
        dd = d;
        sg = d.seg('电荷', [[1, '正电荷 +q'], [-1, '负电荷 −q']], 1, launch);
        v = d.slider('速率 v', 1, 4, 0.1, 3, function (x) { return fx(x, 1) + '×10⁵ m/s'; }, launch);
        B = d.slider('磁通密度 B', 0.1, 0.4, 0.01, 0.1, function (x) { return fx(x, 2) + ' T'; }, launch);
        mm = d.slider('质量 m（质子 = 1）', 1, 2, 1, 1, function (x) { return x + ' mₚ'; }, launch);
        d.button('水平入射（默认）', reset);
        d.grab({ r: 8, get: function () { return [st.x, st.y]; }, start: function () { held = true; },
          set: function (x, y) { st.x = D.clamp(x, 8, dd.W - 8); st.y = D.clamp(y, 8, dd.H - 8); },
          release: function (vx, vy) { held = false; var g = G(), sp = Math.hypot(vx, vy);
            if (sp > 0) { st.a = Math.atan2(vy, vx); v.set(D.clamp(Math.round(sp / (KV * g.H) * 10) / 10, 1, 4)); }
            L0 = { u: st.x / g.W, v: st.y / g.H, a: st.a }; launch(); } });
      },
      resize: function () { launch(); },
      step: function (d, dt) {
        if (held) return; var g = G(); tm += dt;
        if (out(st, g)) { wait += dt; if (wait > 0.6) launch(); return; }
        for (var i = 0; i < 6; i++) adv(st, dt / 6, g);
        ghost.push(tm, st.x, st.y);
      },
      draw: function (d, c) {
        var g = G(), W = g.W, H = g.H, k = g.k, bx = g.bx, sgn = sg.v;
        D.bField(c, bx, 0, W, H, -1); txt(c, '磁场 B（垂直纸面向里 ⊗）', bx + 8, 14, C.accent, F12, 'left');
        line(c, [[bx, 0], [bx, H]], D.alpha(C.accent, 0.7), 1.5, [6, 4]);
        var pp = pr;
        if (held) { var gv = d.grabVel(), a = Math.hypot(gv[0], gv[1]) > 0 ? Math.atan2(gv[1], gv[0]) : st.a; pp = predict({ x: st.x, y: st.y, a: a }, g); }
        if (pp) line(c, pp.pts, held ? C.accent : C.c1, 1.5, [4, 4]);
        var col = sgn > 0 ? C.c2 : C.c1;
        ghost.each(function (x, y, f) { D.drawCharge(c, x, y, 6, sgn, { flat: true, alpha: 0.28 * f }); });
        var x = st.x, y = st.y, hv = held ? d.grabVel() : [0, 0], ah = hv[0] || hv[1] ? Math.atan2(hv[1], hv[0]) : st.a;
        arrow(c, x, y, x + Math.cos(ah) * 34, y + Math.sin(ah) * 34, C.c3, 2, 'v');
        if (x > bx && !held) { var Om = -sgn * g.spd / g.rp, Rr = g.spd / Om, xc = x - Rr * Math.sin(st.a), yc = y + Rr * Math.cos(st.a), L = Math.hypot(xc - x, yc - y) || 1;
          arrow(c, x, y, x + (xc - x) / L * 30, y + (yc - y) / L * 30, C.good, 2, 'F'); dot(c, xc, yc, 3, C['ink-2']); }
        D.glow(c, x, y, 16, col, 0.35); D.drawCharge(c, x, y, 8, sgn);
        if (!d.grabbed) D.hint(c, '可抓住粒子移到别处，或朝任意方向射出', 8, H - 10);
        var stay, P0 = pp || pr, turn = P0 ? P0.turn : 0, horiz = L0 && Math.abs(L0.a) < 1e-9 && L0.u < 0.3 && !held;
        if (!P0 || !P0.entered) stay = '不进入磁场';
        else if (P0.full) stay = '一直在场中（完整圆周，T = ' + fx(k.T * 1e9, 1) + ' ns）';
        else if (horiz) stay = 'T/2 = ' + fx(k.T * 5e8, 1) + ' ns';
        else stay = fx(turn * 180 / Math.PI, 0) + '° 圆弧：(Δθ/2π)T = ' + fx(turn / (2 * Math.PI) * k.T * 1e9, 1) + ' ns';
        d.out([['半径 r = mv/(qB)', fx(k.r * 100, 2) + ' cm'], ['周期 T = 2πm/(qB)', fx(k.T * 1e9, 1) + ' ns（与 v 无关）'], ['在磁场中停留', stay], ['偏转方向', sgn > 0 ? '逆时针（向右入射时向上；左手定则：力 = qv×B）' : '顺时针（向右入射时向下）']],
          '洛伦兹力 F = qvB 始终与速度垂直、不做功，提供向心力 qvB = mv²/r。图中轨道按比例绘制（0.1 m ↔ 画面高度的 45%），动画大幅放慢：画面 1 s ≈ 0.2 μs。可直接抓住粒子：停住再松手＝只移动出发点（方向、速率不变）；甩出＝按手势方向射出，速率按画面速度 ÷ 0.09H（px/s → ×10⁵ m/s）换算，取到 0.1、限 1–4×10⁵ m/s。放在磁场内部则一直做圆周运动（只要圆不碰到边界）。');
      } };
  });

  /* ⑰ 导轨上的导体棒：终端速度。可抓住导体棒沿导轨拖动或推出去（真实比例、真实时间） */
  D.reg('rod', function () {
    var F, Bf, R, s = { x: 0, v: 0 }, v0 = 0, hist = [], t = 0, m = 0.1, L = 0.5, held = false, cam = 0, ph = 0, dd;
    function reset() { s = { x: 0, v: 0 }; v0 = 0; hist = [[0, 0]]; t = 0; }
    function G() { var W = dd.W, H = dd.H; return { W: W, H: H, top: 26, bot: H * 0.42, left: 14, right: W - 14, k: D.clamp(W / 10, 36, 70), o: 84 }; } /* k：px / m（水平方向） */
    function SX(x, g) { return g.left + g.o + (x - cam) * g.k; }
    function XR(g) { return -64 / g.k; } /* 电阻所在位置（世界坐标 m） */
    function loop(g, X) { /* 电流回路（正电流方向）：棒 ↓ → 下导轨 ← → 电阻 ↑ → 上导轨 → */
      var xr = Math.max(SX(XR(g), g), g.left - 400); return [[X, g.top], [X, g.bot], [xr, g.bot], [xr, g.top], [X, g.top]];
    }
    return { aspect: 1.6, animated: true,
      init: function (d) {
        dd = d;
        F = d.slider('外力 F', 0.05, 0.5, 0.01, 0.2, function (v) { return fx(v, 2) + ' N'; }, reset);
        Bf = d.slider('磁通密度 B', 0.2, 1, 0.05, 0.4, function (v) { return fx(v, 2) + ' T'; }, reset);
        R = d.slider('电阻 R', 0.05, 0.5, 0.01, 0.2, function (v) { return fx(v, 2) + ' Ω'; }, reset);
        d.button('重新开始', reset);
        d.grab({ r: 14, get: function () { var g = G(); return [SX(s.x, g), (g.top + g.bot) / 2]; }, start: function () { held = true; },
          set: function (x) { var g = G(); s.x = Math.max(cam + (D.clamp(x, g.left + 20, g.right - 16) - g.left - g.o) / g.k, XR(g) + 24 / g.k); },
          release: function (vx) { var g = G(); held = false; s.v = v0 = D.clamp(vx / g.k, -10, 25); t = 0; hist = [[0, v0]]; } });
        reset();
      },
      step: function (d, dt) {
        var g = G();
        if (held) s.v = D.clamp(d.grabVel()[0] / g.k, -10, 25);
        else {
          for (var i = 0; i < 5; i++) s = P.rodStep(s, m, L, Bf.v, R.v, F.v, dt / 5); t += dt; if (t < 12) hist.push([t, s.v]); else reset();
          cam = D.approach(cam, Math.max(0, s.x - (g.right - g.left - g.o) * 0.55 / g.k), dt, 0.12);
        }
        ph += D.clamp(Bf.v * L * s.v / R.v * 60, -400, 400) * dt;
      },
      draw: function (d, c) {
        var g = G(), W = g.W, H = g.H, k = P.rod(m, L, Bf.v, R.v, F.v, 0, t), emf = Bf.v * L * s.v, I = emf / R.v, Fm = I * Bf.v * L, top = g.top, bot = g.bot, i;
        D.bField(c, g.left, top - 10, g.right, bot + 10, 1, { ox: cam * g.k, gap: 40 });
        txt(c, '磁场 B（垂直纸面向外 ⊙）', g.right - 4, 10, C.accent, F11, 'right');
        var xr = SX(XR(g), g), r0 = Math.max(xr, g.left);
        D.ground(c, r0, g.right, top - 3, { kind: 'rail', depth: 6, stops: false }); D.ground(c, r0, g.right, bot - 3, { kind: 'rail', depth: 6, stops: false });
        if (xr > g.left - 10) { D.wire(c, [[xr, top], [xr, top + 8]]); D.wire(c, [[xr, bot - 8], [xr, bot]]); D.drawResistor(c, xr, top + 8, xr, bot - 8, { len: Math.min(60, (bot - top) * 0.5), th: 12 }); txt(c, 'R', xr + 14, (top + bot) / 2, C.c4, '600 12px ' + D.FONT, 'left'); }
        D.ruler(c, function (u) { return SX(u, g); }, Math.max(0, Math.ceil(cam - g.o / g.k)), Math.floor(cam + (g.right - g.left - g.o) / g.k), bot + 12, { minor: 0.5, major: 1, every: g.k < 50 ? 2 : 1, unit: 'm', h: 14 });
        var X = SX(s.x, g);
        /* 电流（正电荷流动方向）的小点：速度 ∝ I */
        if (Math.abs(I) > 1e-4) { var lp = loop(g, X), seg = [], tot = 0; for (i = 0; i < 4; i++) { var Ls = Math.hypot(lp[i + 1][0] - lp[i][0], lp[i + 1][1] - lp[i][1]); seg.push(Ls); tot += Ls; }
          c.fillStyle = C.warn; for (var u = ((ph % 22) + 22) % 22; u < tot; u += 22) { var q = u, j = 0; while (j < 3 && q > seg[j]) { q -= seg[j]; j++; } var f = seg[j] ? q / seg[j] : 0, px = lp[j][0] + (lp[j + 1][0] - lp[j][0]) * f, py = lp[j][1] + (lp[j + 1][1] - lp[j][1]) * f; if (px > g.left - 4 && px < W) { c.beginPath(); c.arc(px, py, 2.6, 0, 7); c.fill(); } } }
        /* 导体棒（铜棒） */
        D.shadow(c, X + 3, (top + bot) / 2, 6, (bot - top) / 2 + 10, 0.25);
        var rg = c.createLinearGradient(X - 5, 0, X + 5, 0); rg.addColorStop(0, '#7a4a1e'); rg.addColorStop(0.4, '#f3c08a'); rg.addColorStop(1, '#6b3d14'); D.rrect(c, X - 5, top - 10, 10, bot - top + 20, 4); c.fillStyle = rg; c.fill();
        var ym = (top + bot) / 2;
        if (!held) arrow(c, X + 6, ym - 14, X + 6 + Math.min(F.v * 160, 110), ym - 14, C.c3, 2, 'F');
        if (Math.abs(Fm) > 1e-4) arrow(c, X - 6 * Math.sign(s.v), ym + 14, X - 6 * Math.sign(s.v) - D.clamp(Fm * 160, -110, 110), ym + 14, C.warn, 2, 'IBL');
        if (!d.grabbed) D.hint(c, '可抓住导体棒拖动或推出去', g.left + 4, 10);
        /* v–t 图：实线实测，虚线为理论 v = v_f + (v₀ − v_f)e^{−t/τ} */
        var vmax = Math.max(k.vt, v0, 0.1), vmin = Math.min(0, v0); hist.forEach(function (p) { if (p[1] > vmax) vmax = p[1]; if (p[1] < vmin) vmin = p[1]; });
        var gm = Map(0, 12, vmin * 1.15, vmax * 1.25, 46, W - 14, H * 0.55, H - 24); axes(c, gm, 't [s]', 'v [m/s]', 2, 0);
        line(c, [[gm.L, gm.Y(k.vt)], [gm.R, gm.Y(k.vt)]], C.warn, 1, [5, 4]); txt(c, '终端速度 v_f', gm.R - 4, gm.Y(k.vt) - 9, C.warn, F11, 'right');
        var th = []; for (i = 0; i <= 120; i++) { var tt = i / 10; th.push([gm.X(tt), gm.Y(P.rod(m, L, Bf.v, R.v, F.v, v0, tt).v)]); } line(c, th, C.c2, 1.2, [3, 4]);
        line(c, hist.map(function (p) { return [gm.X(p[0]), gm.Y(p[1])]; }), C.c1, 2.5);
        d.out([['速度 v', fx(s.v, 2) + ' m/s' + (held ? '（手推中）' : '')], ['感应电动势 V = vBL', fx(emf, 3) + ' V'], ['电流 I = vBL/R', fx(I, 3) + ' A'], ['电磁力 IBL', fx(Fm, 3) + ' N'], ['终端速度 FR/(BL)²', fx(k.vt, 2) + ' m/s'], ['时间常数 mR/(BL)²', fx(k.tau, 2) + ' s']],
          '棒（m = 0.1 kg，L = 0.5 m）在恒力 F 下加速，感应电流受的电磁力 IBL = B²L²v/R 阻碍运动，F = IBL 时以终端速度匀速；此时 F 的功率 Fv_f 全部变成焦耳热 I²R。可直接抓住导体棒沿导轨拖动（拖动时同样产生 vBL 和阻碍运动的电磁力）或推出去：松手速度按导轨下的刻度尺换算（真实时间，限 −10～25 m/s），之后按 v = v_f + (v₀ − v_f)e^{−t/τ} 趋向终端速度（v–t 图虚线）。橙色小点表示电流（正电荷）方向。');
      } };
  });

  /* ⑱ 半衰期：随机衰变。每个原子核的寿命按指数分布抽取，可抓住 N–t 图上的当前点前后拖动查看任意时刻 */
  D.reg('decay', function () {
    var T, srt = [], life = [], t = 0, N0 = 400, seed = 7, gm, held = false;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function reset() { life = []; for (var i = 0; i < N0; i++) life.push(-Math.log(1 - rnd()) / Math.LN2); srt = life.slice().sort(function (a, b) { return a - b; }); t = 0; } /* 寿命（以 T 为单位）：P(τ > s) = (1/2)^s */
    function left(tt) { var x = tt / T.v, lo = 0, hi = N0; while (lo < hi) { var md = (lo + hi) >> 1; if (srt[md] <= x) lo = md + 1; else hi = md; } return N0 - lo; }
    return { aspect: 1.6, animated: true,
      init: function (d) {
        T = d.slider('半衰期 T', 1, 6, 0.5, 3, function (v) { return fx(v, 1) + ' s'; }, reset); d.button('重新开始', reset); reset();
        d.grab({ r: 8, autoplay: false, get: function () { return [gm.X(t), gm.Y(left(t))]; }, start: function () { held = true; }, set: function (x) { t = D.clamp(gm.ix(x), 0, 5 * T.v); }, release: function () { held = false; } });
      },
      resize: function (d) { gm = Map(0, 5 * T.v, 0, N0, d.W * 0.42 + 50, d.W - 14, 18, d.H - 26); },
      step: function (d, dt) { if (held || t > 5 * T.v) return; t += dt; },
      draw: function (d, c) {
        var W = d.W, H = d.H, cols = 20, gw = Math.min(W * 0.42, H - 30), cell = gw / cols, n = left(t), i, rm = D.reduced();
        gm.x1 = 5 * T.v;
        /* 样品盘 + 原子核（缓存图绘制，400 个也不卡） */
        D.shadow(c, 14 + gw / 2, 14 + gw + 4, gw * 0.55, 4, 0.25); D.rrect(c, 8, 8, gw + 12, gw + 12, 6);
        var tg = c.createLinearGradient(0, 8, 0, gw + 20); tg.addColorStop(0, C.dark ? '#4a505b' : '#e3e6ea'); tg.addColorStop(1, C.dark ? '#2b2f37' : '#b8bdc5'); c.fillStyle = tg; c.fill();
        var rr = cell * 0.36, sp = D.ballSprite(rr, C.c1), ss = Math.ceil(2 * rr + 2), dz = D.ballSprite(rr * 0.7, C.dark ? '#5d636e' : '#aeb4bd'), ds = Math.ceil(1.4 * rr + 2);
        for (i = 0; i < N0; i++) {
          var x = 14 + (i % cols + 0.5) * cell, y = 14 + (Math.floor(i / cols) + 0.5) * cell, td = life[i] * T.v;
          if (td > t) { D.blit(c, sp, x, y, ss, ss); continue; }
          D.blit(c, dz, x, y, ds, ds);
          var age = t - td; if (!rm && age < 0.35) { D.glow(c, x, y, cell * (0.6 + age * 3), C.warn, 0.7 * (1 - age / 0.35)); var an = i * 2.39996; dot(c, x + Math.cos(an) * age * 110, y + Math.sin(an) * age * 110, 1.8, C.warn); } /* 刚衰变：闪光 + 放出的粒子 */
        }
        axes(c, gm, 't [s]', 'N', T.v, 100);
        var th = []; for (i = 0; i <= 100; i++) { var tt = 5 * T.v * i / 100; th.push([gm.X(tt), gm.Y(P.decayN(N0, T.v, tt))]); } line(c, th, C.warn, 1.5, [5, 4]);
        var hp = [[gm.X(0), gm.Y(N0)]]; for (i = 0; i < N0 && srt[i] * T.v <= t; i++) { var tx = gm.X(srt[i] * T.v); hp.push([tx, gm.Y(N0 - i)], [tx, gm.Y(N0 - i - 1)]); } hp.push([gm.X(t), gm.Y(n)]);
        line(c, hp, C.c1, 2);
        for (i = 1; i <= 4; i++) line(c, [[gm.X(i * T.v), gm.Y(N0 / Math.pow(2, i))], [gm.X(i * T.v), gm.B]], C['ink-3'], 1, [2, 3]);
        line(c, [[gm.X(t), gm.T], [gm.X(t), gm.B]], D.alpha(C.warn, 0.5), 1, [3, 3]); D.drawBall(c, gm.X(t), gm.Y(n), 6, C.warn);
        if (!d.grabbed) D.hint(c, W < 520 ? '可拖橙色点' : '可左右拖动橙色点查看任意时刻', gm.L + 24, gm.B - 12);
        var rows = [['经过时间 t', fx(t, 1) + ' s'], ['剩余（模拟）', n + ' 个'], ['理论 N₀(1/2)^{t/T}', fx(P.decayN(N0, T.v, t), 0) + ' 个'], ['t/T', fx(t / T.v, 2)]];
        if (t >= 1) rows.push(['最近 1 s 的衰变数 实测 / 期望', (left(t - 1) - n) + ' / ' + fx(P.decayN(N0, T.v, t - 1) - P.decayN(N0, T.v, t), 1)]);
        d.out(rows, '每个原子核何时衰变是随机的，但经过一个半衰期，剩下的数目约减半（N = N₀(1/2)^{t/T}）。原子核数目越多，越接近理论曲线（虚线）。模拟中每个原子核的寿命按 P(寿命 > t) = (1/2)^{t/T} 随机抽取（与逐帧按概率衰变等价），所以可直接抓住 N–t 图上的橙色点前后拖动，查看这次随机结果在任意时刻的样子；单位时间的衰变数（放射能）也随 N 按同一比例减少。');
      } };
  });

  /* ⑲ 光电效应：光电管实验（逆向电压、光电流）+ K₀–ν 图。可抓住分压器的滑片调逆向电压，或拖动图上的点改变频率 */
  D.reg('photo', function () {
    var f, Wk, Vr, In, m, AP, RH, els = [], acc = 0, seed = 11;
    var metals = [['Cs', 2.1], ['Na', 2.3], ['Zn', 4.3], ['Pt', 5.6]], SK = 1.25; /* 电子画面速率 = 1.25·√(K/eV) 管宽 / s（示意） */
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function wide(w) { return w >= 560; }
    function geo() {
      var a = AP, aw = a.x1 - a.x0, ah = a.y1 - a.y0, tx0 = a.x0 + aw * 0.3, tx1 = a.x1 - 10, ty0 = a.y0 + 6, ty1 = a.y0 + ah * 0.55;
      var ry = ty1 + (a.y1 - ty1) * 0.45; return { aw: aw, tx0: tx0, tx1: tx1, ty0: ty0, ty1: ty1, kx: tx0 + 16, axx: tx1 - 16, ry: ry, rx0: a.x0 + aw * 0.25, rx1: a.x1 - aw * 0.3, by: ry + 30 };
    }
    return { aspect: function (w) { return wide(w) ? 1.5 : 0.8; }, animated: true,
      init: function (d) {
        f = d.slider('光的频率 ν', 2, 20, 0.1, 8, function (v) { return fx(v, 1) + '×10¹⁴ Hz'; });
        Wk = d.seg('金属（功函数，约）', metals.map(function (x) { return [x[1], x[0] + ' ' + x[1] + ' eV']; }), 2.3, function () { els = []; });
        Vr = d.slider('逆向电压 V', 0, 6, 0.1, 0, function (v) { return fx(v, 1) + ' V'; });
        In = d.slider('光强（相对）', 1, 5, 1, 3, function (v) { return v; });
        d.handle({ get: function () { var K = P.photo(f.v * 1e14, Wk.v).K; return [m.X(f.v), m.Y(Math.max(K, 0))]; }, set: function (x) { f.set(Math.max(2, Math.min(20, Math.round(m.ix(x) * 10) / 10))); } });
        d.grab({ r: 10, autoplay: false, get: function () { var g = geo(); return [g.rx0 + (g.rx1 - g.rx0) * Vr.v / 6, g.ry - 15]; },
          set: function (x) { var g = geo(); Vr.set(D.clamp(Math.round((x - g.rx0) / (g.rx1 - g.rx0) * 60) / 10, 0, 6)); } });
      },
      resize: function (d) {
        var W = d.W, H = d.H;
        if (wide(W)) { AP = { x0: 8, x1: W * 0.46, y0: 8, y1: H - 8 }; m = Map(0, 20, -6, 6, W * 0.46 + 46, W - 14, 16, H - 26); }
        else { AP = { x0: 8, x1: W - 8, y0: 8, y1: H * 0.5 }; m = Map(0, 20, -6, 6, 50, W - 14, H * 0.5 + 20, H - 26); }
      },
      step: function (d, dt) {
        var K0 = P.photo(f.v * 1e14, Wk.v).K, a = SK * SK * Vr.v / 2, i; /* 等加速度减速：(速率/SK)² = K − eV·x（x 为管内位置 0–1） */
        if (K0 > 0) { acc += In.v * 12 * dt; while (acc >= 1 && els.length < 140) { acc -= 1; els.push({ x: 0, w: SK * Math.sqrt(K0 * rnd()), y: 0.12 + 0.76 * rnd() }); } if (acc >= 1) acc = 0; }
        for (i = els.length - 1; i >= 0; i--) { var e = els[i]; e.w -= a * dt; e.x += e.w * dt; if (e.x >= 1 || (e.x <= 0 && e.w < 0)) els.splice(i, 1); }
      },
      draw: function (d, c) {
        var g = geo(), p = P.photo(f.v * 1e14, Wk.v), lamnm = 3e8 / (f.v * 1e14) * 1e9, col = D.wlColor(lamnm), K0 = p.K, mid = (g.ty0 + g.ty1) / 2, i;
        var name = metals.filter(function (x) { return x[1] === Wk.v; })[0][0], frac = K0 > 0 ? Math.max(0, 1 - Vr.v / K0) : 0, Irel = In.v * frac;
        /* 光源与光束（不可见光用虚线框表示） */
        var lx0 = AP.x0 + 2, lx1 = AP.x0 + g.aw * 0.16;
        c.save(); c.globalAlpha = lamnm < 380 || lamnm > 750 ? 0.18 : 0.28; c.fillStyle = col; c.beginPath(); c.moveTo(lx1, mid - 7); c.lineTo(g.kx, g.ty0 + 12); c.lineTo(g.kx, g.ty1 - 12); c.lineTo(lx1, mid + 7); c.closePath(); c.fill(); c.restore();
        if (lamnm < 380 || lamnm > 750) { c.save(); c.strokeStyle = col; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(lx1, mid - 7); c.lineTo(g.kx, g.ty0 + 12); c.moveTo(lx1, mid + 7); c.lineTo(g.kx, g.ty1 - 12); c.stroke(); c.restore(); }
        txt(c, lamnm < 380 ? '紫外线' : lamnm > 750 ? '红外线' : '可见光', (lx1 + g.kx) / 2, g.ty1 + 2, C['ink-3'], F11);
        D.rrect(c, lx0, mid - 14, lx1 - lx0, 28, 5); var hg = c.createLinearGradient(0, mid - 14, 0, mid + 14); hg.addColorStop(0, '#6b717c'); hg.addColorStop(0.4, '#a7adb7'); hg.addColorStop(1, '#2b2e35'); c.fillStyle = hg; c.fill();
        D.glow(c, lx1, mid, 12, col, 0.8); txt(c, '光源', (lx0 + lx1) / 2, mid - 22, C['ink-2'], F11);
        /* 光电管：玻璃壳、阴极 K、阳极 A */
        D.rrect(c, g.tx0, g.ty0, g.tx1 - g.tx0, g.ty1 - g.ty0, 16); var gg = c.createLinearGradient(0, g.ty0, 0, g.ty1); gg.addColorStop(0, 'rgba(255,255,255,.35)'); gg.addColorStop(0.5, 'rgba(150,180,220,.08)'); gg.addColorStop(1, 'rgba(255,255,255,.18)'); c.fillStyle = gg; c.fill(); c.strokeStyle = D.alpha(C['ink-3'], 0.7); c.lineWidth = 1.2; c.stroke();
        var kg = c.createLinearGradient(g.kx - 4, 0, g.kx + 4, 0); kg.addColorStop(0, '#6b717c'); kg.addColorStop(0.5, '#eef0f3'); kg.addColorStop(1, '#7d838d'); c.fillStyle = kg; c.fillRect(g.kx - 4, g.ty0 + 10, 8, g.ty1 - g.ty0 - 20);
        c.fillStyle = C.dark ? '#c9cdd5' : '#4a4f59'; c.fillRect(g.axx - 1.5, g.ty0 + 16, 3, g.ty1 - g.ty0 - 32);
        txt(c, 'K（' + name + '）', g.kx, g.ty0 - 1, C['ink-2'], F11); txt(c, 'A', g.axx, g.ty0 + 8, C['ink-2'], F11);
        var es = D.ballSprite(2.4, C.c1), en = Math.ceil(2 * 2.4 + 2), gx0 = g.kx + 5, gx1 = g.axx - 3, gy0 = g.ty0 + 12, gh = g.ty1 - g.ty0 - 24;
        els.forEach(function (e) { D.blit(c, es, gx0 + (gx1 - gx0) * D.clamp(e.x, 0, 1), gy0 + gh * e.y, en, en); });
        /* 电路：干电池 → 分压器（滑动变阻器）→ 阴极高、阳极低（逆向电压 V），电流表串联在阳极一侧 */
        RH = D.drawRheostat(c, g.rx0, g.rx1, g.ry, Vr.v / 6, { th: 10 });
        var wl = g.rx0 - 14; D.wire(c, [[g.kx, g.ty1 - 10], [g.kx, g.ry - 30], [wl, g.ry - 30], [wl, g.by], [(g.rx0 + g.rx1) / 2 - 22, g.by]]); D.wire(c, [[wl, g.ry], RH.coilL]);
        D.wire(c, [[(g.rx0 + g.rx1) / 2 + 22, g.by], [RH.coilR[0], g.by], [RH.coilR[0], g.ry + 5]]);
        var amx = (RH.rodR[0] + g.axx) / 2;
        D.wire(c, [[g.axx, g.ty1 - 16], [g.axx, RH.rodY], [amx + 14, RH.rodY]]); D.wire(c, [[amx - 14, RH.rodY], RH.rodR]);
        D.drawCell(c, (g.rx0 + g.rx1) / 2, g.by, 40, 14, Math.PI);
        D.drawMeter(c, amx, RH.rodY, 13, Irel / 5, { label: 'A' });
        txt(c, 'V = ' + fx(Vr.v, 1) + ' V（逆向）', (g.rx0 + g.rx1) / 2, g.ry + 15, C['ink-2'], '600 11px ' + D.FONT);
        txt(c, 'I ∝ ' + fx(Irel, 1), amx, RH.rodY + 24, C['ink-2'], '600 11px ' + D.FONT);
        if (!d.grabbed) D.hint(c, '可拖分压器滑片（V）或图上的点（ν）', AP.x0 + 2, AP.y1 - 4);
        /* K₀–ν 图 */
        axes(c, m, 'ν [×10¹⁴ Hz]', 'K₀ [eV]', 2, 2);
        metals.forEach(function (mt) { var on = mt[1] === Wk.v; line(c, [[m.X(0), m.Y(-mt[1])], [m.X(20), m.Y(P.hEV * 2e15 - mt[1])]], on ? C.c1 : C.line, on ? 2.5 : 1, on ? null : [4, 4]); if (on) txt(c, '斜率 h', m.X(16), m.Y(P.hEV * 1.6e15 - mt[1]) - 14, C.c1, F12); });
        if (Vr.v > 0) { line(c, [[m.L, m.Y(Vr.v)], [m.R, m.Y(Vr.v)]], C.warn, 1, [3, 4]); txt(c, 'eV（逆向电压）', m.R - 4, m.Y(Vr.v) - 9, C.warn, F11, 'right'); }
        line(c, [[m.X(p.f0 / 1e14), m.Y(0) - 8], [m.X(p.f0 / 1e14), m.Y(0) + 8]], C.warn, 2.5); txt(c, 'ν₀', m.X(p.f0 / 1e14), m.Y(0) + 18, C.warn);
        txt(c, '−W', m.L + 18, m.Y(-Wk.v), C.c1, F12);
        d.out([['光子能量 hν', fx(P.hEV * f.v * 1e14, 2) + ' eV（λ = ' + fx(lamnm, 0) + ' nm）'], ['最大动能 K₀ = hν − W', p.K > 0 ? fx(p.K, 2) + ' eV' : '不发射光电子'], ['截止电压 V₀', p.K > 0 ? fx(p.K, 2) + ' V' : '—'], ['极限频率 ν₀ = W/h', fx(p.f0 / 1e14, 2) + '×10¹⁴ Hz'],
          ['逆向电压 V', fx(Vr.v, 1) + ' V'], ['光电流 / 饱和电流', p.K > 0 ? fx(frac * 100, 0) + ' %' + (frac === 0 ? '（V ≥ V₀：截止）' : '') : '0（不发射）']],
          '拖动图上的点改变频率。不论光多强，ν < ν₀ 时都不发射光电子；各金属的直线斜率都是普朗克常数 h，横截距是极限频率（限界振動数）。光强只改变光电子的个数。光电管实验：阴极 K 射出的光电子被逆向电压 V 减速，只有动能大于 eV 的才能到达阳极 A，所以 V ≥ V₀ = K₀/e 时光电流为 0。可直接抓住分压器的滑片调 V。模拟中光电子的初动能在 0～K₀ 间均匀随机（示意，所以光电流 ∝ 1 − eV/K₀；真实分布不同，但截止电压不变），电子画面速率 ∝ √K。');
      } };
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', D.boot); else D.boot();
})();
