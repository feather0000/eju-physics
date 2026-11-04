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
