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
    d.aspect = spec.aspect || 1.6;
    d.resize = function () {
      var w = stage.clientWidth || 300, hgt = Math.min(Math.round(w / d.aspect), spec.maxH || 520);
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
    d.drawHandles = function (c) {
      d.handles.forEach(function (o) {
        if (o.hidden && o.hidden()) return;
        var p = o.get(); c.save(); c.beginPath(); c.arc(p[0], p[1], o.r + 6, 0, 7); c.fillStyle = COL.dark ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.07)'; c.fill();
        c.beginPath(); c.arc(p[0], p[1], o.r, 0, 7); c.fillStyle = o.color ? o.color() : COL.accent; c.fill();
        c.lineWidth = 2; c.strokeStyle = COL.surface; c.stroke(); c.restore();
      });
    };
    function pos(e) { var b = d.cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; }
    function hit(p) { var best = null, bd = 24; d.handles.forEach(function (o) { if (o.hidden && o.hidden()) return; var q = o.get(), dd = Math.hypot(q[0] - p[0], q[1] - p[1]); if (dd <= bd) { bd = dd; best = o; } }); return best; }
    var drag = null;
    d.cv.addEventListener('touchstart', function (e) { var t = e.touches[0], b = d.cv.getBoundingClientRect(); if (hit([t.clientX - b.left, t.clientY - b.top])) e.preventDefault(); }, { passive: false });
    d.cv.addEventListener('pointerdown', function (e) { var o = hit(pos(e)); if (!o) return; drag = o; d.cv.setPointerCapture(e.pointerId); e.preventDefault(); d.cv.classList.add('grabbing'); if (o.start) o.start(); });
    d.cv.addEventListener('pointermove', function (e) {
      var p = pos(e);
      if (drag) { drag.set(p[0], p[1]); d.redraw(); return; }
      if (e.pointerType === 'mouse') d.cv.classList.toggle('grab', !!hit(p));
    });
    function up() { if (drag && drag.end) drag.end(); drag = null; d.cv.classList.remove('grabbing'); d.redraw(); }
    d.cv.addEventListener('pointerup', up); d.cv.addEventListener('pointercancel', up);
    d.dragging = function () { return !!drag; };
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
  var DM = window.EJUDemo = { reg: function (n, f) { REG[n] = f; }, P: P, COL: COL, fx: fx, sci: sci, arrow: arrow, txt: txt, line: line, dot: dot, Map: Map, axes: axes, bars: bars };
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

  /* ① v–t 图构建：拖动折点，看 x–t 图与位移面积 */
  D.reg('vt', function () {
    var N = [[0, 0], [2, 4], [4, 4], [6, 0], [8, -2], [10, 0]], m1, m2, tc = 0;
    return { aspect: 1.05, maxH: 640, animated: true,
      init: function (d) {
        N.forEach(function (n, i) { d.handle({ get: function () { return [m1.X(n[0]), m1.Y(n[1])]; }, set: function (x, y) { n[1] = Math.max(-6, Math.min(6, Math.round(m1.iy(y) * 2) / 2)); } }); });
        d.button('重置', function () { [0, 4, 4, 0, -2, 0].forEach(function (v, i) { N[i][1] = v; }); tc = 0; });
      },
      resize: function (d) { var L = 44, R = d.W - 14, H = d.H; m1 = Map(0, 10, -6, 6, L, R, 54, H * 0.5); m2 = Map(0, 10, -40, 40, L, R, H * 0.5 + 34, H - 22); },
      step: function (d, dt) { tc += dt * 1.25; if (tc > 10.8) tc = 0; },
      draw: function (d, c) {
        var t = Math.min(tc, 10), xs = P.vtX(N, t), v = P.vtV(N, t);
        /* 小车轨道 */
        var tr = Map(-40, 40, 0, 1, 44, d.W - 14, 10, 40); line(c, [[tr.X(-40), 34], [tr.X(40), 34]], C['ink-3'], 1.5);
        for (var k = -40; k <= 40; k += 10) { line(c, [[tr.X(k), 30], [tr.X(k), 38]], C['ink-3'], 1); }
        var cx = tr.X(Math.max(-40, Math.min(40, xs))); c.fillStyle = C.c1; c.fillRect(cx - 14, 14, 28, 16); dot(c, cx - 8, 31, 3.5, C.ink); dot(c, cx + 8, 31, 3.5, C.ink);
        if (Math.abs(v) > 0.05) arrow(c, cx, 9, cx + v * 5, 9, C.c2, 2);
        /* v–t */
        axes(c, m1, 't [s]', 'v [m/s]', 2, 2);
        c.save(); c.globalAlpha = 0.28; c.beginPath(); c.moveTo(m1.X(0), m1.Y(0)); N.forEach(function (n) { c.lineTo(m1.X(n[0]), m1.Y(n[1])); }); c.lineTo(m1.X(10), m1.Y(0)); c.closePath(); c.fillStyle = C.c2; c.fill(); c.restore();
        line(c, N.map(function (n) { return [m1.X(n[0]), m1.Y(n[1])]; }), C.c2, 2.5);
        line(c, [[m1.X(t), m1.T], [m1.X(t), m1.B]], C.warn, 1, [4, 4]);
        /* x–t */
        axes(c, m2, 't [s]', 'x [m]', 2, 10);
        var pts = []; for (var i = 0; i <= 200; i++) { var tt = i / 20; pts.push([m2.X(tt), m2.Y(Math.max(-44, Math.min(44, P.vtX(N, tt))))]); }
        line(c, pts, C.c1, 2.5); dot(c, m2.X(t), m2.Y(Math.max(-40, Math.min(40, xs))), 5, C.warn);
        txt(c, 'v–t 图（拖动折点）', m1.R - 4, m1.T - 8, C['ink-2'], '600 12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif', 'right');
        txt(c, 'x–t 图（v–t 下的面积 = 位移）', m2.R - 4, m2.T - 8, C['ink-2'], '600 12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif', 'right');
        var acc = []; for (i = 0; i < N.length - 1; i++) acc.push(fx((N[i + 1][1] - N[i][1]) / 2, 1));
        d.out([['t', fx(t, 1) + ' s'], ['v', fx(v, 2) + ' m/s'], ['x（位移 変位）', fx(xs, 2) + ' m'], ['0–10 s 位移', fx(P.vtX(N, 10), 1) + ' m'], ['0–10 s 路程', fx(P.vtDist(N, 10), 1) + ' m'], ['各段加速度 a', acc.join(', ') + ' m/s²']],
          'v–t 图的斜率是加速度，与 t 轴围成的面积（t 轴下方取负）是位移；x–t 图的斜率是速度。');
      } };
  });

  /* ② 抛体运动：拖动速度箭头或用滑块 */
  D.reg('proj', function () {
    var m, tc = 0, v0, th, h0;
    return { aspect: 1.55, animated: true,
      init: function (d) {
        v0 = d.slider('初速 v₀', 2, 30, 0.5, 18, function (v) { return fx(v, 1) + ' m/s'; }, function () { tc = 0; });
        th = d.slider('仰角 θ', -30, 90, 1, 50, function (v) { return v + '°'; }, function () { tc = 0; });
        h0 = d.slider('抛出高度 h', 0, 30, 1, 0, function (v) { return v + ' m'; }, function () { tc = 0; });
        d.handle({ get: function () { var a = th.v * Math.PI / 180; return [m.X(0) + Math.cos(a) * v0.v * 4, m.Y(h0.v) - Math.sin(a) * v0.v * 4]; },
          set: function (x, y) { var dx = (x - m.X(0)) / 4, dy = (m.Y(h0.v) - y) / 4; v0.set(Math.max(2, Math.min(30, Math.round(Math.hypot(dx, dy) * 2) / 2))); th.set(Math.max(-30, Math.min(90, Math.round(Math.atan2(dy, dx) * 180 / Math.PI)))); tc = 0; } });
      },
      resize: function (d) { var L = 40, R = d.W - 12, B = d.H - 24, sc = Math.min((R - L) / 100, (B - 12) / 60); m = Map(0, (R - L) / sc, 0, (B - 12) / sc, L, R, 12, B); },
      step: function (d, dt) { if (d.dragging()) return; tc += dt; },
      draw: function (d, c) {
        var a = th.v * Math.PI / 180, r = P.projectile(v0.v, a, h0.v), T = r.T, step = m.x1 > 100 ? 20 : 10;
        axes(c, m, 'x [m]', 'y [m]', step, step);
        if (h0.v > 0) { c.fillStyle = C['surface-2']; c.fillRect(m.X(0) - 14, m.Y(h0.v), 14, m.Y(0) - m.Y(h0.v)); }
        var pts = []; for (var i = 0; i <= 100; i++) { var t = T * i / 100; pts.push([m.X(r.vx * t), m.Y(h0.v + r.vy * t - 4.9 * t * t)]); }
        line(c, pts, C.c2, 2, [6, 5]);
        var t = Math.min(tc % (T + 1.2), T), x = r.vx * t, vy = r.vy - 9.8 * t, y = h0.v + r.vy * t - 4.9 * t * t, X = m.X(x), Y = m.Y(y);
        arrow(c, X, Y, X + r.vx * 4, Y, C.c1, 2, 'vₓ'); arrow(c, X, Y, X, Y - vy * 4, C.c3, 2, 'v_y'); dot(c, X, Y, 7, C.warn);
        arrow(c, m.X(0), m.Y(h0.v), m.X(0) + Math.cos(a) * v0.v * 4, m.Y(h0.v) - Math.sin(a) * v0.v * 4, C.accent, 2.5);
        if (r.vy > 0) { var tp = r.vy / 9.8; dot(c, m.X(r.vx * tp), m.Y(r.H), 3.5, C.c3); }
        d.out([['飞行时间 T', fx(T, 2) + ' s'], ['水平射程 R', fx(r.R, 1) + ' m'], ['最高点高度 H', fx(r.H, 1) + ' m'], ['vₓ（不变）', fx(r.vx, 2) + ' m/s'], ['当前 v_y', fx(vy, 2) + ' m/s']],
          '水平方向等速：x = v₀cosθ·t；竖直方向等加速度：y = h + v₀sinθ·t − ½gt²（g = 9.8 m/s²，忽略空气阻力）。h = 0 时 θ = 45° 射程最大。');
      } };
  });

  /* ③ 斜面上的连接体：受力图与加速度 */
  D.reg('incline', function () {
    var m1, m2, th, mu, s = 0, vel = 0;
    function reset() { s = 0; vel = 0; }
    return { aspect: 1.5, animated: true,
      init: function (d) {
        m1 = d.slider('斜面上 m₁', 0.5, 5, 0.1, 2, function (v) { return fx(v, 1) + ' kg'; }, reset);
        m2 = d.slider('悬挂 m₂', 0.1, 5, 0.1, 1.5, function (v) { return fx(v, 1) + ' kg'; }, reset);
        th = d.slider('倾角 θ', 0, 60, 1, 30, function (v) { return v + '°'; }, reset);
        mu = d.slider('摩擦系数 μ', 0, 1, 0.05, 0.2, function (v) { return fx(v, 2); }, reset);
        d.button('重新开始', reset);
      },
      step: function (d, dt) { var r = P.incline(m1.v, m2.v, th.v * Math.PI / 180, mu.v); vel += r.a * dt; s += vel * dt; if (Math.abs(s) > 1.2) reset(); },
      draw: function (d, c) {
        var W = d.W, H = d.H, a = th.v * Math.PI / 180, r = P.incline(m1.v, m2.v, a, mu.v);
        var px = W * 0.72, py = H * 0.18, Lr = Math.min(W * 0.6, (H * 0.7) / Math.max(Math.sin(a), 0.01), W * 0.62); /* 斜面顶点 */
        var bx = px - Lr * Math.cos(a), by = py + Lr * Math.sin(a);
        c.fillStyle = C['surface-2']; c.beginPath(); c.moveTo(bx, by); c.lineTo(px, py); c.lineTo(px, by); c.closePath(); c.fill(); line(c, [[bx, by], [px, py], [px, by], [bx, by]], C['ink-3'], 1.5);
        var u = [Math.cos(a), -Math.sin(a)], nrm = [-Math.sin(a), -Math.cos(a)], sc = Math.min(W, 700) / 700;
        var along = Lr * 0.55 + s * 60 * sc, bw = 26 + 6 * Math.sqrt(m1.v), cxp = bx + u[0] * along, cyp = by + u[1] * along;
        var gx = cxp + nrm[0] * bw / 2, gy = cyp + nrm[1] * bw / 2;
        c.save(); c.translate(gx, gy); c.rotate(-a); c.fillStyle = C.c1; c.fillRect(-bw / 2, -bw / 2, bw, bw); c.restore();
        /* 滑轮与绳 */
        var pr = 12, pcx = px + pr * Math.sin(a) * 0 + 4, pcy = py - pr; dot(c, pcx, pcy, pr, C['ink-3']); dot(c, pcx, pcy, 3, C.surface);
        line(c, [[gx + u[0] * bw / 2, gy + u[1] * bw / 2], [pcx - pr * Math.sin(a), pcy - pr * Math.cos(a)]], C.ink, 1.5);
        var hy = H * 0.55 - s * 60 * sc, bw2 = 20 + 6 * Math.sqrt(m2.v); line(c, [[pcx + pr, pcy], [pcx + pr, hy]], C.ink, 1.5);
        c.fillStyle = C.c3; c.fillRect(pcx + pr - bw2 / 2, hy, bw2, bw2);
        /* 受力（1 N ≈ k px） */
        var k = 2.6 * sc, g = 9.8;
        arrow(c, gx, gy, gx, gy + m1.v * g * k, C.warn, 2, 'm₁g'); arrow(c, gx, gy, gx + nrm[0] * r.N * k, gy + nrm[1] * r.N * k, C.good, 2, 'N');
        arrow(c, gx, gy, gx + u[0] * r.T * k, gy + u[1] * r.T * k, C.c2, 2, 'T');
        if (Math.abs(r.f) > 1e-6) arrow(c, gx - nrm[0] * bw / 2, gy - nrm[1] * bw / 2, gx - nrm[0] * bw / 2 + u[0] * r.f * k, gy - nrm[1] * bw / 2 + u[1] * r.f * k, C.c4, 2, 'f');
        var hx = pcx + pr, hc = hy + bw2 / 2; arrow(c, hx, hc, hx, hc + m2.v * g * k, C.warn, 2, 'm₂g'); arrow(c, hx, hc, hx, hc - r.T * k, C.c2, 2, 'T');
        txt(c, 'θ', bx + 34, by - 9, C['ink-2']);
        var st = r.state === 'static' ? '静止（静摩擦力 ' + fx(Math.abs(r.f), 2) + ' N 足以平衡）' : r.state === 'm2down' ? 'm₂ 下降，m₁ 沿斜面上滑' : 'm₁ 沿斜面下滑，m₂ 上升';
        d.out([['加速度 a', fx(Math.abs(r.a), 2) + ' m/s²'], ['张力 T', fx(r.T, 2) + ' N'], ['垂直抗力 N', fx(r.N, 2) + ' N'], ['摩擦力 f', fx(Math.abs(r.f), 2) + ' N'], ['状态', st]],
          '整体：(m₁+m₂)a = m₂g − m₁g sinθ ∓ μm₁g cosθ。先比较 m₂g 与 m₁g sinθ 的差和最大静摩擦力 μm₁g cosθ 判断是否运动（此处静・动摩擦系数取同一值）。');
      } };
  });

  /* ④ 曲面上的能量：拖动小球到释放点 */
  D.reg('energy', function () {
    var f = function (x) { return 0.2 * x * x; }, df = function (x) { return 0.4 * x; }, d2 = function () { return 0.4; };
    var m, st = { x: -4, v: 0 }, x0 = -4, mu, mass = 1;
    return { aspect: 1.6, animated: true,
      init: function (d) {
        mu = d.slider('动摩擦系数 μ', 0, 0.3, 0.01, 0, function (v) { return fx(v, 2); }, function () { st = { x: x0, v: 0 }; });
        d.button('重新释放', function () { st = { x: x0, v: 0 }; });
        d.handle({ get: function () { return [m.X(st.x), m.Y(f(st.x)) - 9]; }, set: function (X) { x0 = Math.max(-4.8, Math.min(4.8, m.ix(X))); st = { x: x0, v: 0 }; } });
      },
      resize: function (d) { var R = d.W * 0.66; m = Map(-5, 5, -0.3, 5.3, 16, R, 26, d.H - 18); },
      step: function (d, dt) { if (d.dragging()) return; for (var i = 0; i < 10; i++) st = P.trackStep(st, f, df, d2, mu.v, dt / 10); },
      draw: function (d, c) {
        var pts = []; for (var i = 0; i <= 120; i++) { var x = -5 + i / 12; pts.push([m.X(x), m.Y(f(x))]); }
        c.save(); c.beginPath(); pts.forEach(function (p, i) { i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.lineTo(m.R, m.B + 10); c.lineTo(m.L, m.B + 10); c.closePath(); c.fillStyle = C['surface-2']; c.fill(); c.restore();
        line(c, pts, C['ink-3'], 2);
        line(c, [[m.X(-5), m.Y(f(x0))], [m.X(5), m.Y(f(x0))]], C['ink-3'], 1, [5, 5]); txt(c, '释放高度', m.X(0), m.Y(f(x0)) - 9, C['ink-3'], '11px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif');
        var X = m.X(st.x), Y = m.Y(f(st.x)), yp = df(st.x), q = Math.sqrt(1 + yp * yp);
        dot(c, X - 9 * yp / q * -1 * 0, Y - 9, 9, C.c1);
        if (Math.abs(st.v) > 0.05) arrow(c, X, Y - 9, X + st.v / q * 10, Y - 9 - st.v * yp / q * 10, C.c2, 2, 'v');
        var g = 9.8, K = 0.5 * mass * st.v * st.v, U = mass * g * f(st.x), E0 = mass * g * f(x0), Q = Math.max(0, E0 - K - U);
        bars(c, d.W * 0.7, 36, d.W * 0.28, d.H - 80, [['K', K, C.c2], ['U', U, C.c1], ['热 Q', Q, C.warn], ['合计', K + U + Q, C['ink-3']]], E0 * 1.02 || 1, '能量 [J]（m = 1 kg）');
        d.out([['高度 y', fx(f(st.x), 2) + ' m'], ['速率 v', fx(Math.abs(st.v), 2) + ' m/s'], ['动能 K', fx(K, 1) + ' J'], ['重力势能 U', fx(U, 1) + ' J'], ['摩擦生热', fx(Q, 1) + ' J'], ['K+U', fx(K + U, 1) + ' J']],
          'μ = 0 时力学能守恒 K + U = mgh₀，小球回到同一高度；有摩擦时减少的力学能等于摩擦生热（摩擦力做的负功），注意曲面上 N 还含向心项 mv²/r。');
      } };
  });

  /* ⑤ 一维碰撞：动量与动能 */
  D.reg('collide', function () {
    var m1, m2, v1, v2, e, tc = 0;
    function res() { tc = 0; }
    return { aspect: 1.7, animated: true,
      init: function (d) {
        m1 = d.slider('m₁', 0.5, 5, 0.1, 2, function (v) { return fx(v, 1) + ' kg'; }, res);
        v1 = d.slider('v₁', -4, 6, 0.1, 3, function (v) { return fx(v, 1) + ' m/s'; }, res);
        m2 = d.slider('m₂', 0.5, 5, 0.1, 1, function (v) { return fx(v, 1) + ' kg'; }, res);
        v2 = d.slider('v₂', -6, 4, 0.1, 0, function (v) { return fx(v, 1) + ' m/s'; }, res);
        e = d.slider('恢复系数 e', 0, 1, 0.05, 1, function (v) { return fx(v, 2) + (v == 1 ? '（弹性）' : v == 0 ? '（完全非弹性）' : ''); }, res);
        var ps = [['弹性 等质量', 1, 1, 3, 0, 1], ['完全非弹性', 2, 1, 3, 0, 0], ['重撞轻', 4, 1, 2, 0, 1], ['对撞', 1, 2, 3, -2, 0.5]];
        ps.forEach(function (p) { d.button(p[0], function () { m1.set(p[1]); m2.set(p[2]); v1.set(p[3]); v2.set(p[4]); e.set(p[5]); res(); }); });
      },
      step: function (d, dt) { tc += dt; },
      draw: function (d, c) {
        var r = P.collide(m1.v, m2.v, v1.v, v2.v, e.v), will = v1.v > v2.v, W = d.W, sc = (W - 40) / 14; /* 屏幕 14 m */
        var w1 = 22 + 10 * Math.sqrt(m1.v), w2 = 22 + 10 * Math.sqrt(m2.v), gap = 4 / sc * 0 + 3, tcol = will ? 3 / (v1.v - v2.v) : Infinity;
        var ks = Math.min(1, 5 / (3 * Math.max(Math.abs(v1.v), Math.abs(v2.v), Math.abs(r.u1), Math.abs(r.u2), 0.1))), t = (tc % 6 - 3) * ks, x1, x2; /* 碰撞时刻 t=0，碰撞点 x=7 m */
        var X0 = 7, half1 = w1 / 2 / sc, half2 = w2 / 2 / sc;
        if (!will) { x1 = 4 + v1.v * (t + 3 * ks); x2 = 10 + v2.v * (t + 3 * ks); }
        else if (t < 0) { x1 = X0 - half1 + v1.v * t; x2 = X0 + half2 + v2.v * t; }
        else { x1 = X0 - half1 + r.u1 * t; x2 = X0 + half2 + r.u2 * t; }
        var Y = d.H * 0.34; line(c, [[10, Y + 2], [W - 10, Y + 2]], C['ink-3'], 2);
        function cart(x, w, col, lab, v) { var X = 20 + x * sc; c.fillStyle = col; c.fillRect(X - w / 2, Y - w * 0.7, w, w * 0.7 - 4); dot(c, X - w / 3, Y - 2, 4, C.ink); dot(c, X + w / 3, Y - 2, 4, C.ink); txt(c, lab, X, Y - w * 0.35 - 2, '#fff', '600 12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif');
          if (Math.abs(v) > 0.02) arrow(c, X, Y - w * 0.7 - 10, X + v * 14, Y - w * 0.7 - 10, col, 2); }
        var cv1 = !will || t < 0 ? v1.v : r.u1, cv2 = !will || t < 0 ? v2.v : r.u2;
        cart(x1, w1, C.c1, 'm₁', cv1); cart(x2, w2, C.c3, 'm₂', cv2);
        var p0 = m1.v * v1.v + m2.v * v2.v, p1 = m1.v * r.u1 + m2.v * r.u2, K0 = P.ke(m1.v, v1.v) + P.ke(m2.v, v2.v), K1 = P.ke(m1.v, r.u1) + P.ke(m2.v, r.u2);
        var by = d.H * 0.52, bh = d.H * 0.34, bw = (W - 40) / 2 - 10;
        var pm = Math.max(Math.abs(p0), 1e-3), Km = Math.max(K0, 1e-3);
        bars(c, 20, by, bw, bh, [['p₁', m1.v * v1.v, C.c1], ['p₂', m2.v * v2.v, C.c3], ['p₁′', m1.v * r.u1, C.c1], ['p₂′', m2.v * r.u2, C.c3]].map(function (b) { return [b[0], Math.abs(b[1]), b[2]]; }), Math.max(Math.abs(m1.v * v1.v), Math.abs(m2.v * v2.v), Math.abs(m1.v * r.u1), Math.abs(m2.v * r.u2), 1e-3), '|动量|（碰撞前 → 后）');
        bars(c, W / 2 + 10, by, bw, bh, [['K 前', K0, C.c2], ['K 后', K1, C.c2], ['损失', K0 - K1, C.warn]], Km, '动能 [J]');
        d.out(will ? [['碰后 v₁′', fx(r.u1, 2) + ' m/s'], ['碰后 v₂′', fx(r.u2, 2) + ' m/s'], ['总动量 前 / 后', fx(p0, 2) + ' / ' + fx(p1, 2) + ' kg·m/s'], ['总动能 前 / 后', fx(K0, 2) + ' / ' + fx(K1, 2) + ' J'], ['动能损失', fx(K0 - K1, 2) + ' J'], ['重心速度 v_G（=共速）', fx(r.vG, 2) + ' m/s']] : [['状态', 'v₁ ≤ v₂：追不上，不会碰撞']],
          'm₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′，v₁′ − v₂′ = −e(v₁ − v₂)。动量总守恒；动能只在 e = 1 时守恒。最接近（弹簧最大压缩）时两者共速 v_G。');
      } };
  });
})();
(function () {
  'use strict';
  var D = window.EJUDemo, P = D.P, C = D.COL, fx = D.fx, arrow = D.arrow, txt = D.txt, line = D.line, dot = D.dot, Map = D.Map, axes = D.axes;

  /* ⑥ 简谐振动与参考圆 */
  D.reg('shm', function () {
    var m, k, A, t = 0, hist = [];
    return { aspect: 1.45, animated: true,
      init: function (d) {
        m = d.slider('质量 m', 0.2, 4, 0.1, 1, function (v) { return fx(v, 1) + ' kg'; }, function () { hist = []; });
        k = d.slider('弹簧常数 k', 5, 60, 1, 20, function (v) { return v + ' N/m'; }, function () { hist = []; });
        A = d.slider('振幅 A', 0.1, 1, 0.05, 0.6, function (v) { return fx(v, 2) + ' m'; }, function () { hist = []; t = 0; });
      },
      step: function (d, dt) { t += dt; },
      draw: function (d, c) {
        var W = d.W, H = d.H, w = Math.sqrt(k.v / m.v), T = 2 * Math.PI / w, x = A.v * Math.cos(w * t), v = -A.v * w * Math.sin(w * t), a = -w * w * x;
        var R = Math.min(W * 0.16, H * 0.24), ccx = R + 24, ccy = H * 0.3, sc = R / 1; /* 1 m = R px */
        c.strokeStyle = C.line; c.beginPath(); c.arc(ccx, ccy, R * A.v, 0, 7); c.stroke();
        var px = ccx + x * sc, py = ccy - A.v * Math.sin(w * t) * sc; line(c, [[ccx, ccy], [px, py]], C['ink-3'], 1.5); dot(c, px, py, 5, C.c2);
        txt(c, '参考圆（等速圆周运动的投影）', ccx, ccy + R + 16, C['ink-3'], '11px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif');
        /* 弹簧振子 */
        var oy = ccy, wall = ccx + R + 40, ox = wall + (W - wall) * 0.45, bx = ox + x * sc; line(c, [[wall, oy - 30], [wall, oy + 30]], C.ink, 3);
        var n = 14, sp = [[wall, oy]]; for (var i = 1; i < n; i++) sp.push([wall + (bx - 18 - wall) * i / n, oy + (i % 2 ? -9 : 9)]); sp.push([bx - 18, oy]); line(c, sp, C['ink-2'], 1.5);
        c.fillStyle = C.c1; c.fillRect(bx - 18, oy - 18, 36, 36); line(c, [[ox, oy + 26], [ox, oy + 36]], C['ink-3'], 1); txt(c, 'O', ox, oy + 44, C['ink-3'], '11px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif');
        line(c, [[px, py], [bx, oy]], C['ink-3'], 1, [3, 4]);
        if (Math.abs(v) > 0.01) arrow(c, bx, oy - 28, bx + v * sc * 0.25, oy - 28, C.c2, 2, 'v');
        if (Math.abs(a) > 0.01) arrow(c, bx, oy + 26, bx + a * sc * 0.04, oy + 26, C.warn, 2, 'a');
        /* x–t 图 */
        var g = Map(0, 3 * T, -1, 1, 34, W - 10, H * 0.62, H - 18); axes(c, g, 't', 'x', 0, 0.5);
        var tt = t % (3 * T), pts = []; for (i = 0; i <= 240; i++) { var s = 3 * T * i / 240; pts.push([g.X(s), g.Y(A.v * Math.cos(w * (s + t - tt)))]); }
        line(c, pts, C.c1, 2); dot(c, g.X(tt), g.Y(x), 5, C.warn);
        d.out([['周期 T = 2π√(m/k)', fx(T, 3) + ' s'], ['角频率 ω', fx(w, 2) + ' rad/s'], ['最大速度 Aω', fx(A.v * w, 2) + ' m/s'], ['最大加速度 Aω²', fx(A.v * w * w, 2) + ' m/s²'], ['x / v / a', fx(x, 2) + ' / ' + fx(v, 2) + ' / ' + fx(a, 2)]],
          '单振动（単振動）：a = −ω²x。周期与振幅无关；在中心速度最大、端点加速度最大。');
      } };
  });

  /* ⑦ 卫星轨道与宇宙速度 */
  D.reg('orbit', function () {
    var r0, vr, s, path = [], t = 0, m;
    function reset() { var v = vr.v * P.vCirc(1, r0.v); s = { x: r0.v, y: 0, vx: 0, vy: v }; path = []; var q = s; for (var i = 0; i < 3000; i++) { q = P.orbitStep(q, 1, 0.01); if (i % 4 === 0) path.push([q.x, q.y]); if (Math.hypot(q.x, q.y) > 12 || Math.hypot(q.x, q.y) < 1) break; } }
    return { aspect: 1.35, animated: true,
      init: function (d) {
        r0 = d.slider('发射处半径 r', 1, 2.5, 0.05, 1.2, function (v) { return fx(v, 2) + ' R'; }, reset);
        vr = d.slider('发射速度 v / v₁(r)', 0.6, 1.6, 0.01, 1.15, function (v) { return fx(v, 2) + (Math.abs(v - 1) < 0.005 ? '（圆）' : Math.abs(v - Math.SQRT2) < 0.006 ? '（逃逸）' : ''); }, reset);
        reset();
      },
      resize: function (d) { var u = Math.min(d.W * 0.62 / 4.6, d.H / 2 / 3.3); m = Map(-0.62 * d.W / u, 0.38 * d.W / u, -d.H / 2 / u, d.H / 2 / u, 0, d.W, 0, d.H); },
      step: function (d, dt) { for (var i = 0; i < 6; i++) { s = P.orbitStep(s, 1, dt / 3); } var r = Math.hypot(s.x, s.y); if (r > 10 || r < 1) reset(); },
      draw: function (d, c) {
        var rr = (m.X(1) - m.X(0)); c.beginPath(); c.arc(m.X(0), m.Y(0), rr, 0, 7); c.fillStyle = C.c2; c.globalAlpha = 0.85; c.fill(); c.globalAlpha = 1; txt(c, '地球', m.X(0), m.Y(0), '#fff');
        c.strokeStyle = C.line; c.setLineDash([3, 5]); c.beginPath(); c.arc(m.X(0), m.Y(0), rr * r0.v, 0, 7); c.stroke(); c.setLineDash([]);
        line(c, path.map(function (p) { return [m.X(p[0]), m.Y(p[1])]; }), C.c1, 2);
        var X = m.X(s.x), Y = m.Y(s.y); dot(c, X, Y, 6, C.warn); arrow(c, X, Y, X + s.vx * 40, Y - s.vy * 40, C.c3, 2, 'v');
        var v = vr.v * P.vCirc(1, r0.v), o = P.orbitElems(1, r0.v, v), v1 = 7.9 / Math.sqrt(r0.v);
        var kind = vr.v < 0.999 ? '椭圆（发射点为远地点）' : vr.v <= 1.001 ? '圆' : vr.v < Math.SQRT2 - 0.002 ? '椭圆（发射点为近地点）' : vr.v <= Math.SQRT2 + 0.002 ? '抛物线（恰好逃逸）' : '双曲线（逃逸）';
        var hit = vr.v < 0.999 && o.rOther < 1 ? '，会撞到地面' : '';
        d.out([['轨道', kind + hit], ['v₁(r) = √(GM/r)', fx(v1, 2) + ' km/s'], ['v₂(r) = √2·v₁', fx(v1 * Math.SQRT2, 2) + ' km/s'], ['发射速度', fx(v1 * vr.v, 2) + ' km/s'], ['周期', o.T ? fx(o.T / (2 * Math.PI) * 84.4 / 60, 2) + ' h（以近地圆轨道 84 min 为 1 单位换算）' : '—']],
          '½mv² − GMm/r < 0 绕地球运动，= 0 恰好逃逸。地表附近 v₁ ≈ 7.9 km/s、v₂ ≈ 11.2 km/s。开普勒第二定律：靠近地球时更快。');
      } };
  });

  /* ⑧ p–V 循环：拖动四个状态点 */
  D.reg('pv', function () {
    var pts = [[1, 1], [1, 3], [3, 3], [3, 1]], m;
    function set4(a) { a.forEach(function (p, i) { pts[i] = p.slice(); }); pts.length = a.length; }
    return { aspect: 1.25, maxH: 600,
      init: function (d) {
        for (var i = 0; i < 4; i++) (function (i) { d.handle({ hidden: function () { return i >= pts.length; }, get: function () { return [m.X(pts[i][0]), m.Y(pts[i][1])]; }, set: function (x, y) { pts[i] = [Math.max(0.5, Math.min(5, Math.round(m.ix(x) * 4) / 4)), Math.max(0.5, Math.min(4.5, Math.round(m.iy(y) * 4) / 4))]; } }); })(i);
        d.button('矩形循环', function () { set4([[1, 1], [1, 3], [3, 3], [3, 1]]); });
        d.button('三角形循环', function () { set4([[1, 1], [1, 3], [3, 1]]); });
        d.button('反向（制冷机）', function () { pts.reverse(); });
      },
      resize: function (d) { m = Map(0, 5.25, 0, 4.75, 46, d.W - 16, 16, d.H - 30); },
      draw: function (d, c) {
        axes(c, m, 'V [×10⁻³ m³]', 'p [×10⁵ Pa]', 1, 1);
        /* 等温线参考 */
        [2, 4, 8].forEach(function (k) { var q = []; for (var V = k / 4.6; V <= 5.2; V += 0.05) q.push([m.X(V), m.Y(k / V)]); line(c, q, C.line, 1, [2, 4]); });
        var r = P.cycle(pts), area = 0; for (var i = 0; i < pts.length; i++) { var A = pts[i], B = pts[(i + 1) % pts.length]; area += A[0] * B[1] - B[0] * A[1]; }
        c.beginPath(); pts.forEach(function (p, i) { i ? c.lineTo(m.X(p[0]), m.Y(p[1])) : c.moveTo(m.X(p[0]), m.Y(p[1])); }); c.closePath(); c.fillStyle = r.W >= 0 ? C['accent-soft'] : C['warn-soft'] || C['accent-soft']; c.fill();
        var cols = [C.c1, C.c2, C.c3, C.c4], names = 'ABCD';
        for (i = 0; i < pts.length; i++) {
          A = pts[i]; B = pts[(i + 1) % pts.length]; var x1 = m.X(A[0]), y1 = m.Y(A[1]), x2 = m.X(B[0]), y2 = m.Y(B[1]);
          line(c, [[x1, y1], [x2, y2]], cols[i], 3); arrow(c, (x1 * 0.6 + x2 * 0.4), (y1 * 0.6 + y2 * 0.4), (x1 * 0.45 + x2 * 0.55), (y1 * 0.45 + y2 * 0.55), cols[i], 3);
          txt(c, names[i] + '（T∝pV=' + fx(A[0] * A[1], 2) + '）', x1 + 10, y1 - 18, C['ink-2'], '12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif', 'left');
        }
        var U = 100, rows = r.segs.map(function (s, i) { return [names[i] + '→' + names[(i + 1) % pts.length], 'W ' + fx(s.W * U, 0) + '　ΔU ' + fx(s.dU * U, 0) + '　Q ' + fx(s.Q * U, 0) + ' J']; });
        rows.push(['一循环净功 W（= 面积）', fx(r.W * U, 0) + ' J' + (r.W > 0 ? '（顺时针：热机）' : r.W < 0 ? '（逆时针：外界对气体做功）' : '')]);
        rows.push(['吸收热量 Q_in', fx(r.Qin * U, 0) + ' J']); if (r.W > 0) rows.push(['热效率 e = W/Q_in', fx(r.eff * 100, 1) + ' %']);
        d.out(rows, '单原子理想气体：ΔU = (3/2)nRΔT = (3/2)Δ(pV)，Q = ΔU + W（W 为气体对外做功 = 图线下面积）。1×10⁵ Pa × 1×10⁻³ m³ = 100 J。Q_in 已把一条斜线中途由吸热转放热的情况分开计算。');
      } };
  });

  /* ⑨ 波：叠加、驻波、纵波 */
  D.reg('wave', function () {
    var mode, lam, A2, t = 0;
    return { aspect: 1.9, animated: true,
      init: function (d) {
        mode = d.seg('模式', [['pulse', '脉冲的叠加'], ['stand', '驻波'], ['long', '纵波']], 'stand', function () { t = 0; });
        lam = d.slider('波长 λ', 1, 4, 0.5, 2, function (v) { return fx(v, 1) + ' m'; });
        A2 = d.slider('脉冲 2 的振幅', -1, 1, 0.1, 1, function (v) { return fx(v, 1); });
      },
      step: function (d, dt) { t += dt * 0.5; },
      draw: function (d, c) {
        var W = d.W, H = d.H, mv = mode.v, L = 8, i, x, pts;
        var m = Map(0, L, -2.4, 2.4, 20, W - 20, 20, H - 20);
        line(c, [[m.L, m.Y(0)], [m.R, m.Y(0)]], C.line, 1);
        if (mv === 'pulse') {
          var tt = (t % 4) / 4 * 12 - 2, pk = function (x, c0, a) { return a * Math.exp(-Math.pow((x - c0) / 0.45, 2)); };
          var p1 = [], p2 = [], s = [];
          for (i = 0; i <= 320; i++) { x = L * i / 320; var y1 = pk(x, tt, 1), y2 = pk(x, L - tt, A2.v); p1.push([m.X(x), m.Y(y1)]); p2.push([m.X(x), m.Y(y2)]); s.push([m.X(x), m.Y(y1 + y2)]); }
          line(c, p1, C.c1, 1.5, [5, 4]); line(c, p2, C.c3, 1.5, [5, 4]); line(c, s, C.ink, 2.5);
          arrow(c, m.X(tt), m.Y(1.4), m.X(tt + 0.6), m.Y(1.4), C.c1, 2); arrow(c, m.X(L - tt), m.Y(-1.4), m.X(L - tt - 0.6), m.Y(-1.4), C.c3, 2);
          d.out([['合成波', 'y = y₁ + y₂（重ね合わせの原理）'], ['相遇后', '两个脉冲各自保持原形状继续前进（波的独立性）']], '把脉冲 2 的振幅设为 −1：相遇瞬间完全抵消（但能量仍在，介质在运动）。');
        } else if (mv === 'stand') {
          var T = 2, a = [], b = [], s2 = [];
          for (i = 0; i <= 320; i++) { x = L * i / 320; var ya = Math.sin(2 * Math.PI * (x / lam.v - t / T)), yb = Math.sin(2 * Math.PI * (x / lam.v + t / T)); a.push([m.X(x), m.Y(ya)]); b.push([m.X(x), m.Y(yb)]); s2.push([m.X(x), m.Y(P.standing(1, lam.v, T, x, t))]); }
          line(c, a, C.c1, 1.2, [5, 4]); line(c, b, C.c3, 1.2, [5, 4]); line(c, s2, C.ink, 2.5);
          for (x = 0; x <= L + 1e-9; x += lam.v / 2) { dot(c, m.X(x), m.Y(0), 4, C.warn); }
          for (x = lam.v / 4; x <= L; x += lam.v / 2) txt(c, '腹', m.X(x), m.Y(2.2), C.good, '600 12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif');
          d.out([['节（節）间距', 'λ/2 = ' + fx(lam.v / 2, 2) + ' m'], ['腹的振幅', '2A'], ['红点', '节：始终不动']], '向右（虚线 1）与向左（虚线 2）传播的同振幅、同波长的波叠加形成驻波（定常波）：y = 2A sin(2πx/λ) cos(2πt/T)。');
        } else {
          var w = 2 * Math.PI / 2, k = 2 * Math.PI / lam.v, Amp = 0.35, row = [H * 0.3, H * 0.42];
          for (x = 0; x <= L; x += 0.16) { var sx = Amp * Math.sin(k * x - w * t); for (var j = 0; j < 2; j++) dot(c, m.X(x + sx), row[j], 3, C.c1); }
          for (x = 0; x <= L; x += 0.16) { if (Math.abs(x - 4) < 0.08) { var s0 = Amp * Math.sin(k * x - w * t); dot(c, m.X(x + s0), row[0], 5, C.warn); } }
          var g = Map(0, L, -1, 1, 20, W - 20, H * 0.58, H - 18); line(c, [[g.L, g.Y(0)], [g.R, g.Y(0)]], C.line, 1);
          pts = []; for (i = 0; i <= 320; i++) { x = L * i / 320; pts.push([g.X(x), g.Y(Math.sin(k * x - w * t))]); } line(c, pts, C.c2, 2);
          txt(c, '把向右的位移画成向上：纵波 → 横波表示', g.L + 4, g.T - 6, C['ink-3'], '11px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif', 'left');
          d.out([['密（密）', '横波表示中位移由正变负、斜率为负的零点'], ['疏（疎）', '位移由负变正的零点'], ['橙点', '同一个介质粒子：只在原位附近振动，不随波前进']], '纵波（疎密波）的介质振动方向与传播方向平行，例如声波。');
        }
      } };
  });

  /* ⑩ 多普勒效应 */
  D.reg('doppler', function () {
    var vs, vo, f0, t = 0, fronts = [], lastEmit = 0, sx = 0;
    var V = 340;
    function reset() { fronts = []; t = 0; lastEmit = -1e9; sx = 0; }
    return { aspect: 1.9, animated: true,
      init: function (d) {
        vs = d.slider('声源速度 vₛ（向右）', -200, 400, 10, 120, function (v) { return v + ' m/s' + (v >= 340 ? '（≥ 声速）' : ''); }, reset);
        vo = d.slider('右侧观察者速度 v₀（向左为正）', -200, 200, 10, 0, function (v) { return v + ' m/s'; });
        f0 = d.slider('声源频率 f', 200, 1000, 10, 500, function (v) { return v + ' Hz'; });
        reset();
      },
      step: function (d, dt) { var sc = dt * 1.4; t += sc * 340; sx += vs.v * sc; if (t - lastEmit >= 120) { fronts.push([sx, t]); lastEmit = t; } if (fronts.length > 30) fronts.shift(); if (Math.abs(sx) > 1800) reset(); },
      draw: function (d, c) {
        var W = d.W, H = d.H, pxm = W / 2400, cx = W * 0.35, cy = H * 0.5;
        var ox = sx > 0 ? cx - sx * pxm + 0 : cx; var X = function (x) { return W * 0.35 + (x - sx * 0.5) * pxm; };
        c.strokeStyle = C.c2; c.lineWidth = 1.5; fronts.forEach(function (fr) { var r = (t - fr[1]) * pxm; c.globalAlpha = Math.max(0.15, 1 - r / W); c.beginPath(); c.arc(X(fr[0]), cy, r, 0, 7); c.stroke(); }); c.globalAlpha = 1;
        dot(c, X(sx), cy, 8, C.warn); txt(c, '声源', X(sx), cy + 20, C.warn, '12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif');
        dot(c, W - 24, cy, 7, C.c3); txt(c, '观察者 B', W - 30, cy - 18, C.c3, '12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif', 'right');
        dot(c, 24, cy, 7, C.c1); txt(c, '观察者 A', 30, cy - 18, C.c1, '12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif', 'left');
        var fB = vs.v < V ? P.doppler(f0.v, V, vs.v, vo.v) : NaN, fA = P.doppler(f0.v, V, -vs.v, 0);
        d.out([['B（前方）听到', isFinite(fB) ? fx(fB, 0) + ' Hz' : '冲击波（马赫锥），公式不适用'], ['A（后方、静止）听到', fx(fA, 0) + ' Hz'], ['前方波长 (V−vₛ)/f', vs.v < V ? fx((V - vs.v) / f0.v, 3) + ' m' : '—'], ['后方波长 (V+vₛ)/f', fx((V + vs.v) / f0.v, 3) + ' m']],
          'f′ = f (V + v₀)/(V − vₛ)（声源朝观察者 vₛ 取正、观察者朝声源 v₀ 取正，V = 340 m/s）。声源移动改变波长，观察者移动改变单位时间接收的波数。');
      } };
  });
})();
(function () {
  'use strict';
  var D = window.EJUDemo, P = D.P, C = D.COL, fx = D.fx, sci = D.sci, arrow = D.arrow, txt = D.txt, line = D.line, dot = D.dot, Map = D.Map, axes = D.axes, bars = D.bars;

  /* ⑪ 透镜成像：拖动物体 */
  D.reg('lens', function () {
    var type, f, ob = { a: 30, h: 8 }, m;
    return { aspect: 1.7,
      init: function (d) {
        type = d.seg('透镜', [['convex', '凸透镜'], ['concave', '凹透镜']], 'convex');
        f = d.slider('焦距 |f|', 8, 25, 1, 15, function (v) { return v + ' cm'; });
        d.handle({ get: function () { return [m.X(-ob.a), m.Y(ob.h)]; }, set: function (x, y) { ob.a = Math.max(2, Math.min(-m.x0 - 2, Math.round(-m.ix(x)))); ob.h = Math.max(2, Math.min(m.y1 - 2, Math.round(m.iy(y)))); } });
      },
      resize: function (d) { var u = d.W / 120; m = Map(-60, 60, -d.H / 2 / u, d.H / 2 / u, 0, d.W, 0, d.H); },
      draw: function (d, c) {
        var F = type.v === 'convex' ? f.v : -f.v, r = P.lens(ob.a, F), X = m.X, Y = m.Y;
        line(c, [[0, Y(0)], [d.W, Y(0)]], C['ink-3'], 1);
        line(c, [[X(0), Y(m.y1 - 1)], [X(0), Y(m.y0 + 1)]], C.c2, 3);
        var e = type.v === 'convex' ? 1 : -1; arrow(c, X(0), Y(0), X(0), Y(m.y1 - 1), C.c2, 3); arrow(c, X(0), Y(0), X(0), Y(m.y0 + 1), C.c2, 3);
        if (e < 0) { line(c, [[X(-1.5), Y(m.y1 - 3)], [X(0), Y(m.y1 - 1)], [X(1.5), Y(m.y1 - 3)]], C.surface, 4); }
        [f.v, -f.v, 2 * f.v, -2 * f.v].forEach(function (x, i) { dot(c, X(x), Y(0), 3.5, C['ink-2']); txt(c, i < 2 ? 'F' : '2F', X(x), Y(0) + 13, C['ink-2'], '11px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif'); });
        arrow(c, X(-ob.a), Y(0), X(-ob.a), Y(ob.h), C.c1, 3);
        var bx = r.b, by = r.m * ob.h, has = isFinite(bx);
        function ray(pts, col, dash) { line(c, pts.map(function (p) { return [X(p[0]), Y(p[1])]; }), col, 1.6, dash); }
        var far = 70, ra = C.warn, rb = C.c3, rc = C.c4;
        /* 1) 平行光轴 → 过焦点（凸）/ 好像从前焦点发出（凹） */
        var s1 = -ob.h / F; ray([[-ob.a, ob.h], [0, ob.h], [far, ob.h + s1 * far]], ra);
        /* 2) 过光心直进 */
        var s2 = -ob.h / ob.a; ray([[-ob.a, ob.h], [far, ob.h + s2 * (far + ob.a)]], rb);
        /* 3) 过前焦点（凸）/ 朝后焦点（凹）→ 平行 */
        if (Math.abs(ob.a - F) > 0.5) { var y3 = ob.h * F / (F - ob.a); ray([[-ob.a, ob.h], [0, y3], [far, y3]], rc); }
        if (has && bx < 0) { ray([[0, ob.h], [bx, by]], ra, [4, 4]); ray([[0, 0], [bx, by]], rb, [4, 4]); if (Math.abs(ob.a - F) > 0.5) ray([[0, ob.h * F / (F - ob.a)], [bx, by]], rc, [4, 4]); }
        if (has && Math.abs(bx) < 200) { c.save(); if (bx < 0) c.setLineDash([5, 4]); arrow(c, X(bx), Y(0), X(bx), Y(by), C.good, 3, bx > 0 ? '实像' : '虚像', 0); c.restore(); }
        d.out(has ? [['物距 a', ob.a + ' cm'], ['像距 b', fx(bx, 1) + ' cm'], ['倍率 m = −b/a', fx(r.m, 2)], ['像', (bx > 0 ? '实像（実像）' : '虚像（虚像）') + '・' + (r.m < 0 ? '倒立' : '正立') + '・' + (Math.abs(r.m) > 1 ? '放大' : '缩小')]] : [['像', '物体在焦点上：折射光平行，不成像']],
          '1/a + 1/b = 1/f（凹透镜 f 取负；b < 0 为与物体同侧的虚像）。拖动物体（箭头顶端）观察三条特征光线。');
      } };
  });

  /* ⑫ 双缝干涉 */
  D.reg('slit', function () {
    var lam, dd, L;
    function wl2rgb(w) { var r = 0, g = 0, b = 0; if (w < 440) { r = (440 - w) / 60; b = 1; } else if (w < 490) { g = (w - 440) / 50; b = 1; } else if (w < 510) { g = 1; b = (510 - w) / 20; } else if (w < 580) { r = (w - 510) / 70; g = 1; } else if (w < 645) { r = 1; g = (645 - w) / 65; } else r = 1; return [r * 255 | 0, g * 255 | 0, b * 255 | 0]; }
    return { aspect: 1.9,
      init: function (d) {
        lam = d.slider('波长 λ', 400, 700, 5, 550, function (v) { return v + ' nm'; });
        dd = d.slider('缝间距 d', 0.1, 1, 0.05, 0.3, function (v) { return fx(v, 2) + ' mm'; });
        L = d.slider('缝到屏距离 L', 0.5, 3, 0.1, 1.5, function (v) { return fx(v, 1) + ' m'; });
      },
      draw: function (d, c) {
        var W = d.W, H = d.H, rgb = wl2rgb(lam.v), half = 0.015; /* 屏上显示 ±15 mm */
        var m = Map(-half * 1000, half * 1000, 0, 1, 30, W - 14, H * 0.42, H - 26);
        var stripH = H * 0.3, y0 = 14;
        for (var X = m.L; X < m.R; X += 2) { var x = m.ix(X) / 1000, I = P.slitI(x, L.v, dd.v * 1e-3, lam.v * 1e-9); c.fillStyle = 'rgba(' + rgb.join(',') + ',' + I.toFixed(3) + ')'; c.fillRect(X, y0, 2, stripH); }
        c.strokeStyle = C.line; c.strokeRect(m.L, y0, m.R - m.L, stripH);
        axes(c, m, 'x [mm]', 'I', 5, 0.5);
        var pts = []; for (X = m.L; X <= m.R; X += 1.5) pts.push([X, m.Y(P.slitI(m.ix(X) / 1000, L.v, dd.v * 1e-3, lam.v * 1e-9))]);
        line(c, pts, 'rgb(' + rgb.join(',') + ')', 2);
        var dx = P.slitDx(L.v, dd.v * 1e-3, lam.v * 1e-9);
        arrow(c, m.X(0), y0 + stripH + 8, m.X(dx * 1000), y0 + stripH + 8, C.ink, 1.5); txt(c, 'Δx', m.X(dx * 500), y0 + stripH + 20, C.ink);
        d.out([['明纹间隔 Δx = Lλ/d', fx(dx * 1000, 2) + ' mm'], ['第 1 明纹', 'x = ±' + fx(dx * 1000, 2) + ' mm'], ['程差（経路差）', '明：d·x/L = mλ　暗：(m+½)λ']], '缝间距变小或 L 变大、λ 变长，条纹都变宽。红光条纹比紫光宽。（理想双缝，未计单缝衍射包络）');
      } };
  });

  /* ⑬ 电场线与等势线：拖动电荷与探针 */
  D.reg('field', function () {
    var Q = [{ x: 1.3, y: 1.5, q: 2e-9 }, { x: 2.7, y: 1.5, q: -2e-9 }], probe = { x: 2, y: 2.4 }, m, img = null, imgKey = '';
    function preset(k) { if (k === 'dip') Q = [{ x: 1.3, y: 1.5, q: 2e-9 }, { x: 2.7, y: 1.5, q: -2e-9 }]; else if (k === 'same') Q = [{ x: 1.3, y: 1.5, q: 2e-9 }, { x: 2.7, y: 1.5, q: 2e-9 }]; else Q = [{ x: 1.2, y: 1.0, q: 2e-9 }, { x: 2.8, y: 1.0, q: 2e-9 }, { x: 2, y: 2.3, q: -2e-9 }]; img = null; }
    return { aspect: 4 / 3,
      init: function (d) {
        d.seg('电荷配置', [['dip', '正负等量'], ['same', '同号等量'], ['tri', '三个电荷']], 'dip', function (v) { preset(v); });
        d.button('切换第 1 个电荷的正负', function () { Q[0].q = -Q[0].q; img = null; });
        for (var i = 0; i < 3; i++) (function (i) { d.handle({ r: 11, hidden: function () { return i >= Q.length; }, color: function () { return Q[i].q > 0 ? C.warn : C.c2; }, get: function () { return [m.X(Q[i].x), m.Y(Q[i].y)]; }, set: function (x, y) { Q[i].x = Math.max(0.15, Math.min(3.85, Math.round(m.ix(x) * 20) / 20)); Q[i].y = Math.max(0.15, Math.min(2.85, Math.round(m.iy(y) * 20) / 20)); } }); })(i);
        d.handle({ r: 7, color: function () { return C.good; }, get: function () { return [m.X(probe.x), m.Y(probe.y)]; }, set: function (x, y) { probe.x = Math.max(0, Math.min(4, m.ix(x))); probe.y = Math.max(0, Math.min(3, m.iy(y))); } });
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
        Q.forEach(function (q) { txt(c, q.q > 0 ? '+' : '−', m.X(q.x), m.Y(q.y) - 20, q.q > 0 ? C.warn : C.c2, '700 15px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif'); });
        var E = P.field(Q, probe.x, probe.y), e = Math.hypot(E[0], E[1]), sc = Math.min(60, 20 * Math.log10(1 + e)) / (e || 1);
        arrow(c, m.X(probe.x), m.Y(probe.y), m.X(probe.x) + E[0] * sc, m.Y(probe.y) - E[1] * sc, C.good, 2.5, 'E');
        d.out([['探针处电势 V', fx(P.potential(Q, probe.x, probe.y), 1) + ' V'], ['电场强度 |E|', fx(e, 1) + ' V/m（N/C）'], ['电荷', Q.map(function (q) { return (q.q > 0 ? '+' : '−') + '2 nC'; }).join('，')], ['等势线间隔', '30 V']],
          '拖动电荷或绿色探针。电场线与等势线（等電位線）处处垂直，电场线从高电势指向低电势，等势线越密电场越强。V = Σkq/r，E 为各电荷电场的矢量和（坐标单位 m）。');
      } };
  });

  /* ⑭ 平行板电容器：接电池 / 断开 */
  D.reg('cap', function () {
    var mode, dr, er;
    return { aspect: 1.7,
      init: function (d) {
        mode = d.seg('开关', [['on', '保持接电池（V 一定）'], ['off', '充电后断开（Q 一定）']], 'on');
        dr = d.slider('板间距 d', 0.5, 3, 0.1, 1, function (v) { return fx(v, 1) + ' d₀'; });
        er = d.slider('介质 εᵣ（充满）', 1, 5, 0.5, 1, function (v) { return fx(v, 1); });
      },
      draw: function (d, c) {
        var S = 0.01, d0 = 1e-3, V0 = 10, r0 = P.capacitor(S, d0, 1, d0, V0, true), r = P.capacitor(S, dr.v * d0, er.v, d0, V0, mode.v === 'on');
        var W = d.W, H = d.H, cx = W * 0.3, gap = 26 * dr.v, pw = Math.min(W * 0.38, 220), top = H * 0.5 - gap / 2 - 26;
        if (er.v > 1) { c.fillStyle = C['accent-soft']; c.fillRect(cx - pw / 2, H * 0.5 - gap / 2, pw, gap); }
        c.fillStyle = C.warn; c.fillRect(cx - pw / 2, H * 0.5 - gap / 2 - 6, pw, 6); c.fillStyle = C.c2; c.fillRect(cx - pw / 2, H * 0.5 + gap / 2, pw, 6);
        var nq = Math.max(1, Math.round(r.Q / r0.Q * 6)); for (var i = 0; i < Math.min(nq, 24); i++) { var x = cx - pw / 2 + (i + 0.5) * pw / Math.min(nq, 24); txt(c, '+', x, H * 0.5 - gap / 2 - 14, C.warn, '700 12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif'); txt(c, '−', x, H * 0.5 + gap / 2 + 16, C.c2, '700 12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif'); }
        var nE = Math.max(1, Math.round(r.E / r0.E * 5)); for (i = 0; i < Math.min(nE, 20); i++) { x = cx - pw / 2 + (i + 0.5) * pw / Math.min(nE, 20); arrow(c, x, H * 0.5 - gap / 2 + 1, x, H * 0.5 + gap / 2 - 1, C['ink-2'], 1.2); }
        /* 导线与电池 */
        var bx = cx - pw / 2 - 40; line(c, [[cx, H * 0.5 - gap / 2 - 6], [cx, 22], [bx, 22], [bx, H * 0.5 - 12]], C.ink, 1.5); line(c, [[cx, H * 0.5 + gap / 2 + 6], [cx, H - 18], [bx, H - 18], [bx, H * 0.5 + 12]], C.ink, 1.5);
        line(c, [[bx - 14, H * 0.5 - 6], [bx + 14, H * 0.5 - 6]], C.ink, 2.5); line(c, [[bx - 8, H * 0.5 + 6], [bx + 8, H * 0.5 + 6]], C.ink, 4);
        if (mode.v === 'off') { c.fillStyle = C.surface; c.fillRect(cx - pw / 4 - 16, 14, 40, 16); line(c, [[cx - pw / 4 - 16, 22], [cx - pw / 4 + 18, 8]], C.ink, 2); txt(c, '断开', cx - pw / 4, 40, C.warn, '12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif'); }
        var bw = W * 0.4; bars(c, W * 0.58, 40, bw, H - 100, [['C', r.C / r0.C, C.c1], ['Q', r.Q / r0.Q, C.c3], ['V', r.V / r0.V, C.c2], ['E', r.E / r0.E, C['ink-2']], ['U', r.U / r0.U, C.warn]], 5, '与初始（d₀, εᵣ=1, 10 V）之比');
        d.out([['C = εᵣε₀S/d', fx(r.C / r0.C, 2) + ' 倍（' + fx(r.C * 1e12, 1) + ' pF）'], ['Q', fx(r.Q / r0.Q, 2) + ' 倍'], ['V', fx(r.V, 2) + ' V'], ['E = V/d', fx(r.E / r0.E, 2) + ' 倍'], ['静电能 U = ½QV', fx(r.U / r0.U, 2) + ' 倍']],
          '接着电池：V 不变，Q = CV 随 C 变。断开后：Q 不变，V = Q/C；此时只改变 d 的话 E = Q/(εᵣε₀S) 不变。（S = 100 cm²，d₀ = 1 mm）');
      } };
  });
})();
(function () {
  'use strict';
  var D = window.EJUDemo, P = D.P, C = D.COL, fx = D.fx, sci = D.sci, arrow = D.arrow, txt = D.txt, line = D.line, dot = D.dot, Map = D.Map, axes = D.axes;

  /* ⑮ 含内阻的电源：输出功率与端电压 */
  D.reg('dc', function () {
    var E, r, R, mP, mV;
    return { aspect: 1.7,
      init: function (d) {
        E = d.slider('电动势 E', 1, 12, 0.5, 6, function (v) { return fx(v, 1) + ' V'; });
        r = d.slider('内阻 r', 0.2, 5, 0.1, 1, function (v) { return fx(v, 1) + ' Ω'; });
        R = d.slider('外电阻 R', 0, 10, 0.1, 2, function (v) { return fx(v, 1) + ' Ω'; });
        d.handle({ get: function () { return [mP.X(R.v), mP.Y(P.circuit(E.v, r.v, R.v).P)]; }, set: function (x) { R.set(Math.max(0, Math.min(10, Math.round(mP.ix(x) * 10) / 10))); } });
      },
      resize: function (d) { var W = d.W, H = d.H; mP = Map(0, 10, 0, 1, W * 0.42 + 30, W - 12, 26, H * 0.5 - 14); mV = Map(0, 1, 0, 1, W * 0.42 + 30, W - 12, H * 0.5 + 30, H - 24); },
      draw: function (d, c) {
        var W = d.W, H = d.H, k = P.circuit(E.v, r.v, R.v), Isc = E.v / r.v;
        /* 电路图 */
        var x0 = 18, x1 = W * 0.4, y0 = H * 0.2, y1 = H * 0.78; line(c, [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], C.ink, 1.5);
        c.fillStyle = C.surface; c.fillRect(x0 - 12, (y0 + y1) / 2 - 30, 24, 60); c.strokeStyle = C['ink-3']; c.setLineDash([4, 3]); c.strokeRect(x0 - 14, (y0 + y1) / 2 - 34, 28, 68); c.setLineDash([]);
        line(c, [[x0 - 10, (y0 + y1) / 2 - 18], [x0 + 10, (y0 + y1) / 2 - 18]], C.ink, 2.5); line(c, [[x0 - 5, (y0 + y1) / 2 - 10], [x0 + 5, (y0 + y1) / 2 - 10]], C.ink, 4);
        c.fillStyle = C.c4; c.fillRect(x0 - 5, (y0 + y1) / 2 + 2, 10, 22); txt(c, 'E, r', x0 + 30, (y0 + y1) / 2, C['ink-2'], '12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif');
        c.fillStyle = C.surface; c.fillRect(x1 - 9, (y0 + y1) / 2 - 28, 18, 56); c.strokeStyle = C.c1; c.lineWidth = 2; c.strokeRect(x1 - 9, (y0 + y1) / 2 - 28, 18, 56); txt(c, 'R', x1 - 22, (y0 + y1) / 2, C.c1, '600 13px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif');
        arrow(c, (x0 + x1) / 2 - 20, y0 - 10, (x0 + x1) / 2 + 20, y0 - 10, C.c2, 2); txt(c, 'I = ' + fx(k.I, 2) + ' A', (x0 + x1) / 2, y0 - 24, C.c2, '12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif');
        /* P–R 曲线 */
        var Pm = k.Pmax * 1.15; mP.y1 = Pm; axes(c, mP, 'R [Ω]', 'P [W]', 2, 0);
        var pts = []; for (var i = 0; i <= 200; i++) { var RR = i / 20; pts.push([mP.X(RR), mP.Y(P.circuit(E.v, r.v, RR).P)]); } line(c, pts, C.c1, 2);
        line(c, [[mP.X(r.v), mP.T], [mP.X(r.v), mP.B]], C.warn, 1, [4, 4]); txt(c, 'R = r', mP.X(r.v) + 4, mP.T + 8, C.warn, '11px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif', 'left');
        /* V–I（电源伏安图） */
        mV.x1 = Isc * 1.05; mV.y1 = E.v * 1.15; axes(c, mV, 'I [A]', 'V [V]', 0, 0);
        line(c, [[mV.X(0), mV.Y(E.v)], [mV.X(Isc), mV.Y(0)]], C.c2, 2); dot(c, mV.X(k.I), mV.Y(k.V), 5, C.warn);
        txt(c, 'E', mV.L - 8, mV.Y(E.v), C.c2, '12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif', 'right'); txt(c, '斜率 −r', mV.X(Isc * 0.5) + 8, mV.Y(E.v * 0.5) - 6, C.c2, '11px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif', 'left');
        d.out([['电流 I = E/(R+r)', fx(k.I, 2) + ' A'], ['端电压 V = E − rI', fx(k.V, 2) + ' V'], ['R 的功率 P = RI²', fx(k.P, 2) + ' W'], ['最大输出 E²/4r（R = r）', fx(k.Pmax, 2) + ' W'], ['效率 R/(R+r)', fx(k.eta * 100, 0) + ' %']],
          '拖动 P–R 图上的点改变 R。R = r 时输出功率最大（此时效率 50%）。下图：端电压随电流线性下降，纵截距 E、斜率 −r、横截距为短路电流 E/r。');
      } };
  });

  /* ⑯ 磁场中带电粒子的圆运动 */
  D.reg('lorentz', function () {
    var sg, v, B, mm, t = 0;
    return { aspect: 1.6, animated: true,
      init: function (d) {
        sg = d.seg('电荷', [[1, '正电荷 +q'], [-1, '负电荷 −q']], 1, function () { t = 0; });
        v = d.slider('速率 v', 1, 4, 0.1, 3, function (x) { return fx(x, 1) + '×10⁵ m/s'; }, function () { t = 0; });
        B = d.slider('磁通密度 B', 0.1, 0.4, 0.01, 0.1, function (x) { return fx(x, 2) + ' T'; }, function () { t = 0; });
        mm = d.slider('质量 m（质子 = 1）', 1, 2, 1, 1, function (x) { return x + ' mₚ'; }, function () { t = 0; });
      },
      step: function (d, dt) { t += dt; },
      draw: function (d, c) {
        var W = d.W, H = d.H, mp = 1.67e-27, q = 1.6e-19, k = P.cyclo(mm.v * mp, q, v.v * 1e5, B.v), bx = W * 0.3, sc = (H * 0.45) / 0.1; /* 0.1 m ↔ 0.45H */
        c.fillStyle = C['accent-soft']; c.fillRect(bx, 0, W - bx, H); txt(c, '磁场 B（垂直纸面向里 ⊗）', bx + 8, 14, C.accent, '12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif', 'left');
        c.fillStyle = C['ink-3']; c.font = '12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        for (var gx = bx + 22; gx < W; gx += 38) for (var gy = 36; gy < H; gy += 38) c.fillText('×', gx, gy);
        var y0 = H * 0.5, rp = k.r * sc, sgn = sg.v; /* 正电荷（v 向右，B 向里）：力 qv×B 向上 */
        var T0 = 1.6, tt = t % (T0 + 1.6), ph = Math.min(1, Math.max(0, (tt - 0.8) / T0)), x, y, vx, vy;
        var cy = y0 - sgn * rp;
        line(c, [[0, y0], [bx, y0]], C['ink-3'], 1, [4, 4]);
        c.strokeStyle = C.c1; c.setLineDash([4, 4]); c.lineWidth = 1.5; c.beginPath(); if (sgn > 0) c.arc(bx, cy, rp, Math.PI / 2, -Math.PI / 2, true); else c.arc(bx, cy, rp, -Math.PI / 2, Math.PI / 2, false); c.stroke(); c.setLineDash([]);
        if (tt < 0.8) { x = bx - (0.8 - tt) * W * 0.3; y = y0; vx = 1; vy = 0; }
        else if (ph < 1) { var a = Math.PI * ph; x = bx + rp * Math.sin(a); y = cy + sgn * rp * Math.cos(a); vx = Math.cos(a); vy = -sgn * Math.sin(a); }
        else { x = bx - (tt - 0.8 - T0) * W * 0.3; y = y0 - 2 * sgn * rp; vx = -1; vy = 0; }
        dot(c, x, y, 7, sgn > 0 ? C.warn : C.c2); txt(c, sgn > 0 ? '+' : '−', x, y, '#fff', '700 11px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif');
        arrow(c, x, y, x + vx * 34, y + vy * 34, C.c3, 2, 'v');
        if (ph > 0 && ph < 1) arrow(c, x, y, x + (bx - x) / rp * 30, y + (cy - y) / rp * 30, C.good, 2, 'F');
        dot(c, bx, cy, 3, C['ink-2']);
        d.out([['半径 r = mv/(qB)', fx(k.r * 100, 2) + ' cm'], ['周期 T = 2πm/(qB)', fx(k.T * 1e9, 1) + ' ns（与 v 无关）'], ['在磁场中停留', 'T/2 = ' + fx(k.T * 5e8, 1) + ' ns'], ['偏转方向', sgn > 0 ? '向上（左手定则：力 = qv×B）' : '向下']],
          '洛伦兹力 F = qvB 始终与速度垂直、不做功，提供向心力 qvB = mv²/r。图中轨道按比例绘制。');
      } };
  });

  /* ⑰ 导轨上的导体棒：终端速度 */
  D.reg('rod', function () {
    var F, Bf, R, s = { x: 0, v: 0 }, hist = [], t = 0, m = 0.1, L = 0.5;
    function reset() { s = { x: 0, v: 0 }; hist = []; t = 0; }
    return { aspect: 1.6, animated: true,
      init: function (d) {
        F = d.slider('外力 F', 0.05, 0.5, 0.01, 0.2, function (v) { return fx(v, 2) + ' N'; }, reset);
        Bf = d.slider('磁通密度 B', 0.2, 1, 0.05, 0.4, function (v) { return fx(v, 2) + ' T'; }, reset);
        R = d.slider('电阻 R', 0.05, 0.5, 0.01, 0.2, function (v) { return fx(v, 2) + ' Ω'; }, reset);
        d.button('重新开始', reset);
      },
      step: function (d, dt) { for (var i = 0; i < 5; i++) s = P.rodStep(s, m, L, Bf.v, R.v, F.v, dt / 5); t += dt; if (t < 12) hist.push([t, s.v]); else reset(); },
      draw: function (d, c) {
        var W = d.W, H = d.H, k = P.rod(m, L, Bf.v, R.v, F.v, 0, t), emf = Bf.v * L * s.v, I = emf / R.v, Fm = I * Bf.v * L;
        var top = 20, bot = H * 0.42, left = 30, right = W - 14;
        c.fillStyle = C['accent-soft']; c.fillRect(left, top, right - left, bot - top);
        c.fillStyle = C['ink-3']; c.font = '11px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; for (var gx = left + 30; gx < right; gx += 40) for (var gy = top + 16; gy < bot; gy += 30) c.fillText('⊙', gx, gy);
        line(c, [[left, top], [right, top]], C.ink, 2.5); line(c, [[left, bot], [right, bot]], C.ink, 2.5); line(c, [[left, top], [left, bot]], C.ink, 2.5);
        c.fillStyle = C.c4; c.fillRect(left - 6, (top + bot) / 2 - 16, 12, 32); txt(c, 'R', left + 14, (top + bot) / 2, C.c4, '600 12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif');
        var X = left + 40 + ((s.x * 60) % (right - left - 80)); line(c, [[X, top - 6], [X, bot + 6]], C.c1, 6);
        arrow(c, X + 4, (top + bot) / 2 - 14, X + 4 + F.v * 160, (top + bot) / 2 - 14, C.c3, 2, 'F'); if (Fm > 1e-4) arrow(c, X - 4, (top + bot) / 2 + 14, X - 4 - Fm * 160, (top + bot) / 2 + 14, C.warn, 2, 'IBL');
        var g = Map(0, 12, 0, Math.max(k.vt * 1.25, 0.1), 46, W - 14, H * 0.52, H - 24); axes(c, g, 't [s]', 'v [m/s]', 2, 0);
        line(c, [[g.L, g.Y(k.vt)], [g.R, g.Y(k.vt)]], C.warn, 1, [5, 4]); txt(c, '终端速度 v_f', g.R - 4, g.Y(k.vt) - 9, C.warn, '11px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif', 'right');
        line(c, hist.map(function (p) { return [g.X(p[0]), g.Y(p[1])]; }), C.c1, 2.5);
        d.out([['速度 v', fx(s.v, 2) + ' m/s'], ['感应电动势 V = vBL', fx(emf, 3) + ' V'], ['电流 I = vBL/R', fx(I, 3) + ' A'], ['电磁力 IBL', fx(Fm, 3) + ' N'], ['终端速度 FR/(BL)²', fx(k.vt, 2) + ' m/s'], ['时间常数 mR/(BL)²', fx(k.tau, 2) + ' s']],
          '棒（m = 0.1 kg，L = 0.5 m）在恒力 F 下加速，感应电流受的电磁力 IBL = B²L²v/R 阻碍运动，F = IBL 时以终端速度匀速；此时 F 的功率 Fv_f 全部变成焦耳热 I²R。');
      } };
  });

  /* ⑱ 半衰期：随机衰变 */
  D.reg('decay', function () {
    var T, st = [], t = 0, hist = [], N0 = 400, seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function reset() { st = []; for (var i = 0; i < N0; i++) st.push(1); t = 0; hist = [[0, N0]]; }
    return { aspect: 1.6, animated: true,
      init: function (d) { T = d.slider('半衰期 T', 1, 6, 0.5, 3, function (v) { return fx(v, 1) + ' s'; }, reset); d.button('重新开始', reset); reset(); },
      step: function (d, dt) { if (t > 5 * T.v) return; var p = P.decayP(T.v, dt), n = 0; for (var i = 0; i < N0; i++) if (st[i] && rnd() < p) st[i] = 0; st.forEach(function (x) { n += x; }); t += dt; hist.push([t, n]); },
      draw: function (d, c) {
        var W = d.W, H = d.H, cols = 20, gw = Math.min(W * 0.42, H - 30), cell = gw / cols, n = 0;
        for (var i = 0; i < N0; i++) { n += st[i]; dot(c, 14 + (i % cols + 0.5) * cell, 14 + (Math.floor(i / cols) + 0.5) * cell * 1, cell * 0.36, st[i] ? C.c1 : C.line); }
        var g = Map(0, 5 * T.v, 0, N0, W * 0.42 + 50, W - 14, 18, H - 26); axes(c, g, 't [s]', 'N', T.v, 100);
        var th = []; for (i = 0; i <= 100; i++) { var tt = 5 * T.v * i / 100; th.push([g.X(tt), g.Y(P.decayN(N0, T.v, tt))]); } line(c, th, C.warn, 1.5, [5, 4]);
        line(c, hist.map(function (p) { return [g.X(p[0]), g.Y(p[1])]; }), C.c1, 2);
        for (i = 1; i <= 4; i++) line(c, [[g.X(i * T.v), g.Y(N0 / Math.pow(2, i))], [g.X(i * T.v), g.B]], C['ink-3'], 1, [2, 3]);
        d.out([['经过时间 t', fx(t, 1) + ' s'], ['剩余（模拟）', n + ' 个'], ['理论 N₀(1/2)^{t/T}', fx(P.decayN(N0, T.v, t), 0) + ' 个'], ['t/T', fx(t / T.v, 2)]],
          '每个原子核何时衰变是随机的，但经过一个半衰期，剩下的数目约减半（N = N₀(1/2)^{t/T}）。原子核数目越多，越接近理论曲线（虚线）。');
      } };
  });

  /* ⑲ 光电效应 */
  D.reg('photo', function () {
    var f, Wk, m;
    var metals = [['Cs', 2.1], ['Na', 2.3], ['Zn', 4.3], ['Pt', 5.6]];
    return { aspect: 1.7,
      init: function (d) {
        f = d.slider('光的频率 ν', 2, 20, 0.1, 8, function (v) { return fx(v, 1) + '×10¹⁴ Hz'; });
        Wk = d.seg('金属（功函数，约）', metals.map(function (x) { return [x[1], x[0] + ' ' + x[1] + ' eV']; }), 2.3);
        d.handle({ get: function () { var K = P.photo(f.v * 1e14, Wk.v).K; return [m.X(f.v), m.Y(Math.max(K, 0))]; }, set: function (x) { f.set(Math.max(2, Math.min(20, Math.round(m.ix(x) * 10) / 10))); } });
      },
      resize: function (d) { m = Map(0, 20, -6, 6, 50, d.W - 14, 16, d.H - 26); },
      draw: function (d, c) {
        axes(c, m, 'ν [×10¹⁴ Hz]', 'K₀ [eV]', 2, 2);
        metals.forEach(function (mt) { var on = mt[1] === Wk.v; line(c, [[m.X(0), m.Y(-mt[1])], [m.X(20), m.Y(P.hEV * 2e15 - mt[1])]], on ? C.c1 : C.line, on ? 2.5 : 1, on ? null : [4, 4]); if (on) txt(c, '斜率 h', m.X(16), m.Y(P.hEV * 1.6e15 - mt[1]) - 14, C.c1, '12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif'); });
        var p = P.photo(f.v * 1e14, Wk.v), lamnm = 3e8 / (f.v * 1e14) * 1e9;
        line(c, [[m.X(p.f0 / 1e14), m.Y(0) - 8], [m.X(p.f0 / 1e14), m.Y(0) + 8]], C.warn, 2.5); txt(c, 'ν₀', m.X(p.f0 / 1e14), m.Y(0) + 18, C.warn);
        txt(c, '−W', m.L + 18, m.Y(-Wk.v), C.c1, '12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif');
        d.out([['光子能量 hν', fx(P.hEV * f.v * 1e14, 2) + ' eV（λ = ' + fx(lamnm, 0) + ' nm）'], ['最大动能 K₀ = hν − W', p.K > 0 ? fx(p.K, 2) + ' eV' : '不发射光电子'], ['截止电压 V₀', p.K > 0 ? fx(p.K, 2) + ' V' : '—'], ['极限频率 ν₀ = W/h', fx(p.f0 / 1e14, 2) + '×10¹⁴ Hz']],
          '拖动图上的点改变频率。不论光多强，ν < ν₀ 时都不发射光电子；各金属的直线斜率都是普朗克常数 h，横截距是极限频率（限界振動数）。光强只改变光电子的个数。');
      } };
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', D.boot); else D.boot();
})();
