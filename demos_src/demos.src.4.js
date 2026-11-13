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
