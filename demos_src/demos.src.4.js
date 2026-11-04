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
