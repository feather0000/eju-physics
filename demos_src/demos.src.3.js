(function () {
  'use strict';
  var D = window.EJUDemo, P = D.P, C = D.COL, fx = D.fx, sci = D.sci, arrow = D.arrow, txt = D.txt, line = D.line, dot = D.dot, Map = D.Map, axes = D.axes, bars = D.bars;
  var F11 = '11px ' + D.FONT, F12 = '12px ' + D.FONT;
  function metal(c, x, y, w, hgt, vertical) { /* 金属件（支架、极板）：线性渐变 */
    var g = vertical ? c.createLinearGradient(x, 0, x + w, 0) : c.createLinearGradient(0, y, 0, y + hgt);
    g.addColorStop(0, C.dark ? '#6b717c' : '#8c929c'); g.addColorStop(0.35, C.dark ? '#d5d9df' : '#f1f3f6'); g.addColorStop(1, C.dark ? '#4a4f59' : '#6b717c'); c.fillStyle = g; c.fillRect(x, y, w, hgt);
  }

  /* ⑪ 透镜成像：光具座上的物体可直接抓住拖动（几何光学：拖到新位置后按 1/a + 1/b = 1/f 更新） */
  D.reg('lens', function () {
    var type, f, ob = { a: 30, h: 8 }, m, Hb;
    return { aspect: 1.7,
      init: function (d) {
        type = d.seg('透镜', [['convex', '凸透镜'], ['concave', '凹透镜']], 'convex');
        f = d.slider('焦距 |f|', 8, 25, 1, 15, function (v) { return v + ' cm'; });
        d.grab({ r: 10, get: function () { return [m.X(-ob.a), m.Y(ob.h)]; },
          set: function (x, y) { ob.a = Math.max(2, Math.min(-m.x0 - 2, Math.round(-m.ix(x)))); ob.h = Math.max(2, Math.min(m.y1 - 2, Math.round(m.iy(y)))); } });
      },
      resize: function (d) { var u = d.W / 120, Y0 = d.H * 0.46; Hb = d.H - 28; m = Map(-60, 60, -(Hb - Y0) / u, Y0 / u, 0, d.W, 0, Hb); },
      draw: function (d, c) {
        var F = type.v === 'convex' ? f.v : -f.v, r = P.lens(ob.a, F), X = m.X, Y = m.Y, W = d.W, x0 = X(0), y0 = Y(0);
        /* 光具座：导轨 + 刻度尺（0 在透镜处，单位 cm） */
        D.ground(c, 4, W - 4, Hb + 2, { kind: 'rail', depth: 7 });
        D.ruler(c, X, -60, 60, Hb + 12, { minor: 1, major: 5, every: 10, h: 14, unit: 'cm', fmt: function (u) { return String(Math.abs(u)); } });
        function holder(x, yTop) { metal(c, x - 1.5, yTop, 3, Hb + 2 - yTop, true); D.rrect(c, x - 9, Hb - 5, 18, 7, 2); c.fillStyle = C.dark ? '#3a3e46' : '#4a4f59'; c.fill(); }
        line(c, [[0, y0], [W, y0]], C['ink-3'], 1);
        /* 透镜（玻璃）：凸透镜中间厚，凹透镜边缘厚 */
        var top = Y(m.y1 - 1), bot = Math.min(Y(m.y0 + 1), Hb - 14), hh = (bot - top) / 2, mid = (top + bot) / 2, tk = 7, cv = type.v === 'convex';
        holder(x0, bot);
        c.save(); c.beginPath();
        if (cv) { c.moveTo(x0, top); c.quadraticCurveTo(x0 + tk * 2, mid, x0, bot); c.quadraticCurveTo(x0 - tk * 2, mid, x0, top); }
        else { c.moveTo(x0 - tk, top); c.lineTo(x0 + tk, top); c.quadraticCurveTo(x0 + 1, mid, x0 + tk, bot); c.lineTo(x0 - tk, bot); c.quadraticCurveTo(x0 - 1, mid, x0 - tk, top); }
        c.closePath(); var lg = c.createLinearGradient(x0 - tk, 0, x0 + tk, 0); var gl = C.dark ? '#7fb2e5' : '#5b9bd5'; lg.addColorStop(0, D.alpha(gl, 0.45)); lg.addColorStop(0.45, 'rgba(255,255,255,.6)'); lg.addColorStop(1, D.alpha(gl, 0.35));
        c.fillStyle = lg; c.fill(); c.strokeStyle = gl; c.lineWidth = 1.5; c.stroke(); c.restore(); /* 玻璃 */
        [f.v, -f.v, 2 * f.v, -2 * f.v].forEach(function (x, i) { dot(c, X(x), y0, 3.5, C['ink-2']); txt(c, i < 2 ? 'F' : '2F', X(x), y0 + 13, C['ink-2'], F11); });
        /* 物体：带光源的箭头 */
        var oX = X(-ob.a), oY = Y(ob.h);
        holder(oX, y0 + 2); D.glow(c, oX, oY, 16, C.c1, 0.35); arrow(c, oX, y0, oX, oY, C.c1, 3.5);
        var bx = r.b, by = r.m * ob.h, has = isFinite(bx);
        function ray(pts, col, dash) { line(c, pts.map(function (p) { return [X(p[0]), Y(p[1])]; }), col, 1.6, dash); }
        var far = 70, ra = C.warn, rb = C.c3, rc = C.c4;
        /* 实像：光屏放在像的位置 */
        if (has && bx > 0 && X(bx) < W - 6) {
          var sh = Math.max(Math.abs(Y(by) - y0) + 14, 30), sy = Math.min(y0, Y(by)) - 7; holder(X(bx), Math.max(sy + sh, y0) );
          c.fillStyle = C.dark ? 'rgba(235,232,224,.16)' : 'rgba(255,255,255,.85)'; c.fillRect(X(bx) - 3, sy, 6, sh); c.strokeStyle = C['ink-3']; c.lineWidth = 1; c.strokeRect(X(bx) - 3, sy, 6, sh);
        }
        /* 1) 平行光轴 → 过焦点（凸）/ 好像从前焦点发出（凹） */
        var s1 = -ob.h / F; ray([[-ob.a, ob.h], [0, ob.h], [far, ob.h + s1 * far]], ra);
        /* 2) 过光心直进 */
        var s2 = -ob.h / ob.a; ray([[-ob.a, ob.h], [far, ob.h + s2 * (far + ob.a)]], rb);
        /* 3) 过前焦点（凸）/ 朝后焦点（凹）→ 平行 */
        if (Math.abs(ob.a - F) > 0.5) { var y3 = ob.h * F / (F - ob.a); ray([[-ob.a, ob.h], [0, y3], [far, y3]], rc); }
        if (has && bx < 0) { ray([[0, ob.h], [bx, by]], ra, [4, 4]); ray([[0, 0], [bx, by]], rb, [4, 4]); if (Math.abs(ob.a - F) > 0.5) ray([[0, ob.h * F / (F - ob.a)], [bx, by]], rc, [4, 4]); }
        if (has && Math.abs(bx) < 200) { c.save(); if (bx < 0) c.setLineDash([5, 4]); arrow(c, X(bx), y0, X(bx), Y(by), C.good, 3, bx > 0 ? '实像' : '虚像', 0); c.restore(); }
        if (!d.grabbed) D.hint(c, '可抓住物体（箭头）拖动', 8, 12);
        d.out(has ? [['物距 a', ob.a + ' cm'], ['像距 b', fx(bx, 1) + ' cm'], ['倍率 m = −b/a', fx(r.m, 2)], ['像', (bx > 0 ? '实像（実像）' : '虚像（虚像）') + '・' + (r.m < 0 ? '倒立' : '正立') + '・' + (Math.abs(r.m) > 1 ? '放大' : '缩小')]] : [['像', '物体在焦点上：折射光平行，不成像']],
          '1/a + 1/b = 1/f（凹透镜 f 取负；b < 0 为与物体同侧的虚像）。可直接抓住物体（箭头顶端）拖动，观察三条特征光线；实像落在光屏上，下方刻度尺以透镜为 0（cm）。');
      } };
  });

  /* ⑫ 双缝干涉：激光 → 双缝 → 光屏（侧视图可抓住光屏改 L、抓住上缝改 d；缝间距为示意放大） */
  D.reg('slit', function () {
    var lam, dd, L, dv;
    function geo(d) {
      var W = d.W, H = d.H, ah = Math.max(70, H * 0.26), xs = 86, span = W - xs - 24;
      return { W: W, H: H, ah: ah, mid: 8 + ah / 2, xs: xs, xsc: xs + span * L.v / 3, span: span, dp: 8 + dd.v * 26, y0: ah + 40, sh: H * 0.19 };
    }
    return { aspect: function (w) { return w < 520 ? 1.05 : 1.55; },
      init: function (d) {
        dv = d;
        lam = d.slider('波长 λ', 400, 700, 5, 550, function (v) { return v + ' nm'; });
        dd = d.slider('缝间距 d', 0.1, 1, 0.05, 0.3, function (v) { return fx(v, 2) + ' mm'; });
        L = d.slider('缝到屏距离 L', 0.5, 3, 0.1, 1.5, function (v) { return fx(v, 1) + ' m'; });
        d.grab({ r: 14, get: function () { var g = geo(dv); return [g.xsc, g.mid]; }, set: function (x) { var g = geo(dv); L.set(D.clamp(Math.round((x - g.xs) / g.span * 30) / 10, 0.5, 3)); } });
        d.grab({ r: 6, get: function () { var g = geo(dv); return [g.xs, g.mid - g.dp / 2]; }, set: function (x, y) { var g = geo(dv); dd.set(D.clamp(Math.round(((g.mid - y) * 2 - 8) / 26 / 0.05) * 0.05, 0.1, 1)); } });
      },
      draw: function (d, c) {
        var g = geo(d), W = g.W, H = g.H, col = D.wlColor(lam.v), half = 0.015, i; /* 屏上显示 ±15 mm */
        var Lm = L.v, dm = dd.v * 1e-3, lm = lam.v * 1e-9, I0 = function (x) { return P.slitI(x, Lm, dm, lm); };
        /* —— 侧视图：激光器、双缝板、光屏 —— */
        var mid = g.mid, xs = g.xs, xsc = g.xsc, dp = g.dp, top = 8, bot = 8 + g.ah;
        D.ground(c, 10, W - 10, bot + 4, { kind: 'rail', depth: 6 });
        D.rrect(c, 12, mid - 11, 50, 22, 4); var lg = c.createLinearGradient(0, mid - 11, 0, mid + 11); lg.addColorStop(0, '#5d636e'); lg.addColorStop(0.4, '#9aa0aa'); lg.addColorStop(1, '#2b2e35'); c.fillStyle = lg; c.fill();
        c.fillStyle = '#fff'; c.font = '600 11px ' + D.FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('激光', 37, mid);
        line(c, [[62, mid], [xs, mid]], col, 3); D.glow(c, xs, mid, 14, col, 0.6);
        c.save(); c.globalAlpha = 0.18; c.fillStyle = col; [-1, 1].forEach(function (k) { var sy = mid + k * dp / 2; c.beginPath(); c.moveTo(xs, sy); c.lineTo(xsc, top + 4); c.lineTo(xsc, bot - 4); c.closePath(); c.fill(); }); c.restore();
        metal(c, xs - 3, top, 6, mid - dp / 2 - 2 - top, true); metal(c, xs - 3, mid - dp / 2 + 2, 6, dp - 4, true); metal(c, xs - 3, mid + dp / 2 + 2, 6, bot - mid - dp / 2 - 2, true);
        D.drawBall(c, xs, mid - dp / 2, 3.5, C.accent);
        c.fillStyle = C.dark ? '#e9e6dc' : '#f8f6ef'; c.fillRect(xsc - 3, top, 6, bot - top); c.strokeStyle = C['ink-3']; c.lineWidth = 1; c.strokeRect(xsc - 3, top, 6, bot - top);
        for (i = 0; i < bot - top; i += 2) { var yy = top + i, xm = (yy - mid) / (bot - top) * 0.03; c.fillStyle = D.alpha(col, I0(xm)); c.fillRect(xsc - 3, yy, 6, 2); } /* 侧视的光屏也显示条纹（纵向 ±15 mm） */
        line(c, [[xs, bot + 20], [xsc, bot + 20]], C['ink-3'], 1); line(c, [[xs, bot + 15], [xs, bot + 25]], C['ink-3'], 1); line(c, [[xsc, bot + 15], [xsc, bot + 25]], C['ink-3'], 1);
        txt(c, 'L = ' + fx(Lm, 1) + ' m', (xs + xsc) / 2, bot + 20, C['ink-2'], F11);
        txt(c, 'd', xs + 12, mid - dp / 2 - 8, C.accent, '600 12px ' + D.FONT);
        if (!d.grabbed) D.hint(c, '可拖光屏（改 L）、上缝蓝点（改 d）', 12, H - 8);
        /* —— 光屏正视图（暗室中的屏）与光强分布 —— */
        var m = Map(-half * 1000, half * 1000, 0, 1, 30, W - 14, g.y0 + g.sh + 34, H - 40), y0 = g.y0, sh = g.sh, rgb = col.match(/\d+/g).slice(0, 3).join(',');
        c.fillStyle = '#0b0d12'; c.fillRect(m.L, y0, m.R - m.L, sh);
        for (var X = m.L; X < m.R; X += 2) { c.fillStyle = 'rgba(' + rgb + ',' + I0(m.ix(X) / 1000).toFixed(3) + ')'; c.fillRect(X, y0, 2, sh); }
        c.strokeStyle = C.line; c.strokeRect(m.L, y0, m.R - m.L, sh);
        axes(c, m, 'x [mm]', 'I', 5, 0.5);
        var pts = []; for (X = m.L; X <= m.R; X += 1.5) pts.push([X, m.Y(I0(m.ix(X) / 1000))]);
        line(c, pts, col, 2);
        var dx = P.slitDx(Lm, dm, lm);
        arrow(c, m.X(0), y0 + sh + 8, m.X(dx * 1000), y0 + sh + 8, C.ink, 1.5); txt(c, 'Δx', m.X(dx * 500), y0 + sh + 20, C.ink);
        d.out([['明纹间隔 Δx = Lλ/d', fx(dx * 1000, 2) + ' mm'], ['第 1 明纹', 'x = ±' + fx(dx * 1000, 2) + ' mm'], ['程差（経路差）', '明：d·x/L = mλ　暗：(m+½)λ']], '缝间距变小或 L 变大、λ 变长，条纹都变宽。红光条纹比紫光宽。（理想双缝，未计单缝衍射包络）上方侧视图中可直接抓住光屏左右拖动改变 L，抓住上缝的蓝点上下拖动改变 d（缝距放大画出，非比例）；中间是暗室中看到的光屏（±15 mm）。');
      } };
  });

  /* ⑬ 电场线与等势线：可直接抓住电荷（金属小球）与绿色检验电荷，拖到新位置后电场即时更新（静电场，不做抛掷） */
  D.reg('field', function () {
    var Q = [{ x: 1.3, y: 1.5, q: 2e-9 }, { x: 2.7, y: 1.5, q: -2e-9 }], probe = { x: 2, y: 2.4 }, m, img = null, imgKey = '';
    function preset(k) { if (k === 'dip') Q = [{ x: 1.3, y: 1.5, q: 2e-9 }, { x: 2.7, y: 1.5, q: -2e-9 }]; else if (k === 'same') Q = [{ x: 1.3, y: 1.5, q: 2e-9 }, { x: 2.7, y: 1.5, q: 2e-9 }]; else Q = [{ x: 1.2, y: 1.0, q: 2e-9 }, { x: 2.8, y: 1.0, q: 2e-9 }, { x: 2, y: 2.3, q: -2e-9 }]; img = null; }
    return { aspect: 4 / 3,
      init: function (d) {
        d.seg('电荷配置', [['dip', '正负等量'], ['same', '同号等量'], ['tri', '三个电荷']], 'dip', function (v) { preset(v); });
        d.button('切换第 1 个电荷的正负', function () { Q[0].q = -Q[0].q; img = null; });
        for (var i = 0; i < 3; i++) (function (i) { d.grab({ r: 12, hidden: function () { return i >= Q.length; }, get: function () { return [m.X(Q[i].x), m.Y(Q[i].y)]; }, set: function (x, y) { Q[i].x = Math.max(0.15, Math.min(3.85, Math.round(m.ix(x) * 20) / 20)); Q[i].y = Math.max(0.15, Math.min(2.85, Math.round(m.iy(y) * 20) / 20)); } }); })(i);
        d.grab({ r: 7, get: function () { return [m.X(probe.x), m.Y(probe.y)]; }, set: function (x, y) { probe.x = Math.max(0, Math.min(4, m.ix(x))); probe.y = Math.max(0, Math.min(3, m.iy(y))); } });
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
        Q.forEach(function (q) { var X = m.X(q.x), Y = m.Y(q.y); D.glow(c, X, Y, 22, q.q > 0 ? C.c2 : C.c1, 0.35); D.drawCharge(c, X, Y, 11, q.q); });
        var E = P.field(Q, probe.x, probe.y), e = Math.hypot(E[0], E[1]), sc = Math.min(60, 20 * Math.log10(1 + e)) / (e || 1), PX = m.X(probe.x), PY = m.Y(probe.y);
        arrow(c, PX, PY, PX + E[0] * sc, PY - E[1] * sc, C.good, 2.5, 'E');
        D.drawBall(c, PX, PY, 6, C.good);
        if (!d.grabbed) D.hint(c, '可直接抓住电荷或绿色检验电荷拖动', 8, 12);
        d.out([['探针处电势 V', fx(P.potential(Q, probe.x, probe.y), 1) + ' V'], ['电场强度 |E|', fx(e, 1) + ' V/m（N/C）'], ['电荷', Q.map(function (q) { return (q.q > 0 ? '+' : '−') + '2 nC'; }).join('，')], ['等势线间隔', '30 V']],
          '可直接抓住电荷（红 +、蓝 −）或绿色检验电荷（探针）拖到新位置，电场线与等势线即时重算。电场线与等势线（等電位線）处处垂直，电场线从高电势指向低电势，等势线越密电场越强。V = Σkq/r，E 为各电荷电场的矢量和（坐标单位 m）。');
      } };
  });

  /* ⑭ 平行板电容器：可抓住上极板上下拖动改变 d，点按刀闸开关切换接通 / 断开 */
  D.reg('cap', function () {
    var mode, dr, er, dv;
    function wide(w) { return w >= 520; }
    function geo(d) {
      var W = d.W, H = d.H, wd = wide(W), Hc = wd ? H : H * 0.58, cx = wd ? W * 0.27 : W * 0.48, pw = wd ? Math.min(W * 0.32, 250) : Math.min(W * 0.46, 220);
      var kd = D.clamp(Hc * 0.12, 24, 40), yb = Hc * 0.66, gap = kd * dr.v, yt = yb - gap - 6; /* 下极板固定，上极板随 d 移动；kd = 每 d₀ 的像素 */
      return { W: W, H: H, wd: wd, Hc: Hc, cx: cx, pw: pw, kd: kd, yb: yb, gap: gap, yt: yt, bx: cx - pw / 2 - 40, sw: cx - pw / 4, wy: 24, by: Hc - 16 };
    }
    return { aspect: function (w) { return wide(w) ? 1.7 : 0.95; },
      init: function (d) {
        dv = d;
        mode = d.seg('开关', [['on', '保持接电池（V 一定）'], ['off', '充电后断开（Q 一定）']], 'on');
        dr = d.slider('板间距 d', 0.5, 3, 0.1, 1, function (v) { return fx(v, 1) + ' d₀'; });
        er = d.slider('介质 εᵣ（充满）', 1, 5, 0.5, 1, function (v) { return fx(v, 1); });
        d.grab({ r: 18, get: function () { var g = geo(dv); return [g.cx, g.yt - 10]; }, autoplay: false,
          set: function (x, y) { var g = geo(dv); dr.set(D.clamp(Math.round((g.yb - (y + 10) - 6) / g.kd * 10) / 10, 0.5, 3)); } });
        d.grab({ r: 14, get: function () { var g = geo(dv); return [g.sw, g.wy]; }, autoplay: false, start: function () { mode.set(mode.v === 'on' ? 'off' : 'on'); }, set: function () {} });
      },
      draw: function (d, c) {
        var S = 0.01, d0 = 1e-3, V0 = 10, r0 = P.capacitor(S, d0, 1, d0, V0, true), r = P.capacitor(S, dr.v * d0, er.v, d0, V0, mode.v === 'on');
        var g = geo(d), W = g.W, H = g.H, cx = g.cx, pw = g.pw, yb = g.yb, yt = g.yt, gap = g.gap, x0 = cx - pw / 2, i, x, on = mode.v === 'on';
        var bx = g.bx, wy = g.wy, by = g.by, sw = g.sw, bc = (wy + by) / 2;
        /* 导线、电池、刀闸开关 */
        D.wire(c, [[x0 + 14, yt], [x0 + 14, wy], [sw + 14, wy]]); D.wire(c, [[sw - 14, wy], [bx, wy], [bx, bc - 24]]);
        D.wire(c, [[x0 + 14, yb + 6], [x0 + 14, by], [bx, by], [bx, bc + 24]]);
        D.drawCell(c, bx, bc, 48, 18, -Math.PI / 2); txt(c, '10 V', bx, bc + 38, C['ink-2'], F12);
        var ang = on ? 0 : -0.75; c.save(); c.translate(sw - 14, wy); c.rotate(ang); metal(c, 0, -2, 28, 4); c.restore();
        D.drawBall(c, sw - 14, wy, 3.5, '#6b717c'); D.drawBall(c, sw + 14, wy, 3, '#6b717c'); D.drawBall(c, sw - 14 + Math.cos(ang) * 30, wy + Math.sin(ang) * 30, 4, C.c4);
        if (!on) txt(c, '断开', sw + 10, wy + 18, C.warn, F12);
        /* 介质、极板、电荷、电场 */
        if (er.v > 1) { var dg = c.createLinearGradient(0, yt + 6, 0, yb); dg.addColorStop(0, D.alpha(C.accent, 0.28)); dg.addColorStop(0.5, D.alpha(C.accent, 0.14)); dg.addColorStop(1, D.alpha(C.accent, 0.3)); c.fillStyle = dg; c.fillRect(x0 + 4, yt + 6, pw - 8, gap); txt(c, 'εᵣ = ' + fx(er.v, 1), x0 + pw - 10, yt + 6 + gap / 2, C.accent, F11, 'right'); }
        D.shadow(c, cx, yb + 12, pw * 0.55, 3, 0.25);
        metal(c, x0, yt, pw, 6); metal(c, x0, yb, pw, 6);
        c.fillStyle = C.c2; c.fillRect(x0, yt + 5, pw, 1.5); c.fillStyle = C.c1; c.fillRect(x0, yb - 0.5, pw, 1.5);
        line(c, [[cx, yt], [cx, yt - 8]], C.dark ? '#9aa0aa' : '#5d636e', 3); D.drawBall(c, cx, yt - 12, 6, C.dark ? '#7a6a55' : '#3a3e46'); /* 绝缘把手 */
        var nq = Math.max(1, Math.round(r.Q / r0.Q * 6)); for (i = 0; i < Math.min(nq, 24); i++) { x = x0 + (i + 0.5) * pw / Math.min(nq, 24); txt(c, '+', x, yt - 6, C.c2, '700 12px ' + D.FONT); txt(c, '−', x, yb + 15, C.c1, '700 12px ' + D.FONT); }
        var nE = Math.max(1, Math.round(r.E / r0.E * 5)); for (i = 0; i < Math.min(nE, 20); i++) { x = x0 + (i + 0.5) * pw / Math.min(nE, 20); arrow(c, x, yt + 7, x, yb - 1, C['ink-2'], 1.2); }
        /* 电压表并在极板两端 */
        var mx = x0 + pw + 26, my = (yt + yb) / 2;
        D.wire(c, [[x0 + pw, yt + 3], [mx, yt + 3], [mx, my - 16]], { w: 1.2 }); D.wire(c, [[x0 + pw, yb + 3], [mx, yb + 3], [mx, my + 16]], { w: 1.2 });
        D.drawMeter(c, mx, my, 15, r.V / 30, { label: 'V' }); txt(c, fx(r.V, 1) + ' V', mx, Math.max(yb + 3, my + 15) + 12, C['ink-2'], '600 12px ' + D.FONT);
        if (!d.grabbed) D.hint(c, '可上下拖上极板（改 d），点按开关', 8, 10);
        if (g.wd) bars(c, W * 0.58, 40, W * 0.4, H - 100, [['C', r.C / r0.C, C.c1], ['Q', r.Q / r0.Q, C.c3], ['V', r.V / r0.V, C.c2], ['E', r.E / r0.E, C['ink-2']], ['U', r.U / r0.U, C.warn]], 5, '与初始（d₀, εᵣ=1, 10 V）之比');
        else bars(c, 20, g.Hc + 26, W - 40, H - g.Hc - 62, [['C', r.C / r0.C, C.c1], ['Q', r.Q / r0.Q, C.c3], ['V', r.V / r0.V, C.c2], ['E', r.E / r0.E, C['ink-2']], ['U', r.U / r0.U, C.warn]], 5, '与初始（d₀, εᵣ=1, 10 V）之比');
        d.out([['C = εᵣε₀S/d', fx(r.C / r0.C, 2) + ' 倍（' + fx(r.C * 1e12, 1) + ' pF）'], ['Q', fx(r.Q / r0.Q, 2) + ' 倍'], ['V', fx(r.V, 2) + ' V'], ['E = V/d', fx(r.E / r0.E, 2) + ' 倍'], ['静电能 U = ½QV', fx(r.U / r0.U, 2) + ' 倍']],
          '接着电池：V 不变，Q = CV 随 C 变。断开后：Q 不变，V = Q/C；此时只改变 d 的话 E = Q/(εᵣε₀S) 不变。（S = 100 cm²，d₀ = 1 mm）可直接抓住上极板的绝缘把手上下拖动改变 d，点按刀闸开关切换“接着电池 / 断开”；电压表（满偏 30 V）显示板间电压。');
      } };
  });
})();
