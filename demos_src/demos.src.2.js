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
