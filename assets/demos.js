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
  /* 地面/轨道：o.kind = 'floor'（实验台面 + 剖面线）| 'rail'（铝轨）| 'soil'（室外地面）；o.depth 厚度 px */
  function ground(c, x0, x1, y, o) {
    o = o || {}; var k = o.kind || 'floor', dp = o.depth || (k === 'rail' ? 7 : 8), g; c.save();
    if (k === 'rail') {
      g = c.createLinearGradient(0, y, 0, y + dp); g.addColorStop(0, COL.dark ? '#c4c9d2' : '#eef0f3'); g.addColorStop(0.5, COL.dark ? '#7e8590' : '#b7bcc5'); g.addColorStop(1, COL.dark ? '#4c525c' : '#8c929c');
      c.fillStyle = g; c.fillRect(x0, y, x1 - x0, dp); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x0, y + dp * 0.55, x1 - x0, 1);
      c.fillStyle = COL.dark ? '#2d3139' : '#5d636e'; c.fillRect(x0 - 3, y - 6, 4, dp + 6); c.fillRect(x1 - 1, y - 6, 4, dp + 6); /* 端挡板 */
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
  var DM = window.EJUDemo = { reg: function (n, f) { REG[n] = f; }, P: P, COL: COL, fx: fx, sci: sci, arrow: arrow, txt: txt, line: line, dot: dot, Map: Map, axes: axes, bars: bars,
    FONT: FONT, clamp: clamp, shade: shade, alpha: alpha, rrect: rrect, shadow: shadow, drawBall: drawBall, drawCart: drawCart, drawBlock: drawBlock, drawWeight: drawWeight, drawPulley: drawPulley,
    wood: wood, woodPattern: woodPattern, ground: ground, ruler: ruler, trail: Trail, approach: approach, hint: hint, reduced: function () { return RM.matches; } };
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
        var cur = P.inclineAt(m1.v, m2.v, a, mu.v, held ? 0 : vel), k = 2.6 * sc, gg = 9.8, na = held || pinned, mov = !held && vel !== 0;
        arrow(c, gx, gy, gx, gy + m1.v * gg * k, C.warn, 2, 'm₁g'); arrow(c, gx, gy, gx + nrm[0] * cur.N * k, gy + nrm[1] * cur.N * k, C.good, 2, 'N');
        var hc = hy + 2 + bw2 / 2; arrow(c, hx, hc, hx, hc + m2.v * gg * k, C.warn, 2, 'm₂g');
        if (!na) {
          arrow(c, gx, gy, gx + u[0] * cur.T * k, gy + u[1] * cur.T * k, C.c2, 2, 'T');
          if (Math.abs(cur.f) > 1e-6) arrow(c, gx - nrm[0] * bw / 2, gy - nrm[1] * bw / 2, gx - nrm[0] * bw / 2 + u[0] * cur.f * k, gy - nrm[1] * bw / 2 + u[1] * cur.f * k, C.c4, 2, 'f');
          arrow(c, hx, hc, hx, hc - cur.T * k, C.c2, 2, 'T');
        }
        if (!d.grabbed) D.hint(c, '可直接抓住 m₁ 或 m₂ 拖动、推出', 10, 14);
        var dir = function (v) { return v > 0 ? 'm₂ 下降，m₁ 沿斜面上滑' : 'm₁ 沿斜面下滑，m₂ 上升'; };
        var st = held ? '手持中（松手后从当时的速度开始按受力运动）' : pinned ? '到达端点被挡住，稍后回到起点' : mov ? dir(vel) + (cur.a * vel < 0 ? '（减速中）' : '')
          : cur.state === 'static' ? '静止（静摩擦力 ' + fx(Math.abs(cur.f), 2) + ' N 足以平衡）' : dir(cur.a);
        d.out([['加速度 a', na ? '—' : fx(Math.abs(cur.a), 2) + ' m/s²'], ['速度 v', fx(Math.abs(held ? hv : vel), 2) + ' m/s'], ['张力 T', na ? '—' : fx(cur.T, 2) + ' N'], ['垂直抗力 N', fx(cur.N, 2) + ' N'],
          ['摩擦力 f', na ? '—' : fx(Math.abs(cur.f), 2) + ' N' + (mov ? '（动摩擦 μN）' : '')], ['状态', st]],
          '运动中：(m₁+m₂)a = m₂g − m₁g sinθ ∓ μm₁g cosθ（动摩擦力与运动方向相反：m₁ 上滑取 −，下滑取 +），T = m₂(g − a)。从静止开始时，先比较 m₂g 与 m₁g sinθ 的差和最大静摩擦力 μm₁g cosθ 判断是否运动（此处静・动摩擦系数取同一值）。推出去后若与“驱动方向”相反，会先减速、停下，再按静止时的判断决定是否反向。');
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
