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
