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
