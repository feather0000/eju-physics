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
