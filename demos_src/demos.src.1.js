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
