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
        var W = d.W, H = d.H, key = JSON.stringify(Q) + C.dark + W + 'x' + H;
        if (key !== imgKey || !img) { /* 电势色块用粗网格；等势线用带插值的 marching squares，电荷附近更密 */
          var step = 30, capV = 400, sW = 3, nw = Math.ceil(W / sW), nh = Math.ceil(H / sW);
          var wash = document.createElement('canvas'); wash.width = nw; wash.height = nh;
          var wx = wash.getContext('2d'), id = wx.createImageData(nw, nh), VW = new Float32Array(nw * nh);
          for (var j = 0; j < nh; j++) for (var i = 0; i < nw; i++) VW[j * nw + i] = P.potential(Q, m.ix(i * sW + sW / 2), m.iy(j * sW + sW / 2));
          var bg = C.dark ? [28, 32, 41] : [255, 253, 248];
          for (j = 0; j < nh; j++) for (i = 0; i < nw; i++) {
            var v = VW[j * nw + i], t = Math.max(-1, Math.min(1, (isFinite(v) ? v : 0) / 120)), o = (j * nw + i) * 4, col = t > 0 ? [230, 90, 70] : [60, 120, 230], a = isFinite(v) ? Math.abs(t) * 0.45 : 0;
            id.data[o] = bg[0] * (1 - a) + col[0] * a; id.data[o + 1] = bg[1] * (1 - a) + col[1] * a; id.data[o + 2] = bg[2] * (1 - a) + col[2] * a; id.data[o + 3] = 255;
          }
          wx.putImageData(id, 0, 0);
          var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var g = cv.getContext('2d');
          g.imageSmoothingEnabled = true; g.drawImage(wash, 0, 0, W, H);
          /* 等势线：粗网格 + 电荷周围加密，边上线性插值，避免锯齿 */
          var sC = W < 400 ? 2.5 : 2, nx = Math.floor(W / sC) + 1, ny = Math.floor(H / sC) + 1, VC = new Float32Array(nx * ny);
          for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) VC[j * nx + i] = P.potential(Q, m.ix(i * sC), m.iy(j * sC));
          function Vcc(ii, jj) { return VC[jj * nx + ii]; }
          function cellSegs(ii, jj, ss, get, path) {
            var v00 = get(ii, jj), v10 = get(ii + 1, jj), v11 = get(ii + 1, jj + 1), v01 = get(ii, jj + 1);
            if (![v00, v10, v11, v01].every(isFinite)) return;
            var vmin = Math.min(v00, v10, v11, v01), vmax = Math.max(v00, v10, v11, v01);
            if (vmin > capV || vmax < -capV) return;
            var lv0 = Math.ceil(Math.max(vmin, -capV) / step) * step, lv1 = Math.floor(Math.min(vmax, capV) / step) * step, lv;
            for (lv = lv0; lv <= lv1 + 1e-6; lv += step) {
              var pts = [];
              function add(a, b, x0, y0, x1, y1) {
                if ((a < lv && b >= lv) || (a >= lv && b < lv)) {
                  var u = (lv - a) / (b - a); if (!isFinite(u)) u = 0.5; if (u < 0) u = 0; if (u > 1) u = 1;
                  pts.push([x0 + u * (x1 - x0), y0 + u * (y1 - y0)]);
                }
              }
              var xA = ii * ss, yA = jj * ss, xB = (ii + 1) * ss, yB = (jj + 1) * ss;
              add(v00, v10, xA, yA, xB, yA); add(v10, v11, xB, yA, xB, yB); add(v11, v01, xB, yB, xA, yB); add(v01, v00, xA, yB, xA, yA);
              if (pts.length >= 2) { path.moveTo(pts[0][0], pts[0][1]); path.lineTo(pts[1][0], pts[1][1]); }
              if (pts.length >= 4) { path.moveTo(pts[2][0], pts[2][1]); path.lineTo(pts[3][0], pts[3][1]); }
            }
          }
          g.beginPath();
          var near = [];
          Q.forEach(function (q) { near.push([m.X(q.x), m.Y(q.y)]); });
          function closeToCharge(ii, jj) {
            var x = (ii + 0.5) * sC, y = (jj + 0.5) * sC, k;
            for (k = 0; k < near.length; k++) if (Math.hypot(x - near[k][0], y - near[k][1]) < 56) return true;
            return false;
          }
          for (j = 0; j < ny - 1; j++) for (i = 0; i < nx - 1; i++) {
            if (closeToCharge(i, j)) {
              /* 电荷周围再细一档（半格），把环线画圆 */
              var gi, gj;
              for (gj = 0; gj < 2; gj++) for (gi = 0; gi < 2; gi++) {
                var i0 = i + gi * 0.5, j0 = j + gj * 0.5;
                function Vr(ii, jj) { return P.potential(Q, m.ix(ii * sC), m.iy(jj * sC)); }
                var vv00 = Vr(i0, j0), vv10 = Vr(i0 + 0.5, j0), vv11 = Vr(i0 + 0.5, j0 + 0.5), vv01 = Vr(i0, j0 + 0.5);
                if (![vv00, vv10, vv11, vv01].every(isFinite)) continue;
                var umin = Math.min(vv00, vv10, vv11, vv01), umax = Math.max(vv00, vv10, vv11, vv01);
                if (umin > capV || umax < -capV) continue;
                var u0 = Math.ceil(Math.max(umin, -capV) / step) * step, u1 = Math.floor(Math.min(umax, capV) / step) * step, u;
                for (u = u0; u <= u1 + 1e-6; u += step) {
                  var qp = [];
                  function add2(a, b, x0, y0, x1, y1) {
                    if ((a < u && b >= u) || (a >= u && b < u)) {
                      var k = (u - a) / (b - a); if (!isFinite(k)) k = 0.5; if (k < 0) k = 0; if (k > 1) k = 1;
                      qp.push([x0 + k * (x1 - x0), y0 + k * (y1 - y0)]);
                    }
                  }
                  var xa = i0 * sC, ya = j0 * sC, xb = (i0 + 0.5) * sC, yb = (j0 + 0.5) * sC;
                  add2(vv00, vv10, xa, ya, xb, ya); add2(vv10, vv11, xb, ya, xb, yb); add2(vv11, vv01, xb, yb, xa, yb); add2(vv01, vv00, xa, yb, xa, ya);
                  if (qp.length >= 2) { g.moveTo(qp[0][0], qp[0][1]); g.lineTo(qp[1][0], qp[1][1]); }
                  if (qp.length >= 4) { g.moveTo(qp[2][0], qp[2][1]); g.lineTo(qp[3][0], qp[3][1]); }
                }
              }
            } else cellSegs(i, j, sC, Vcc, g);
          }
          g.strokeStyle = C.dark ? 'rgba(235,232,224,.88)' : 'rgba(70,70,70,.82)';
          g.lineWidth = 1; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke();
          img = cv; imgKey = key;
        }
        c.imageSmoothingEnabled = true; c.drawImage(img, 0, 0, W, H);
        /* 电场线：从每个正电荷沿电场向前描，从每个负电荷沿电场向后描。
           向后描到正电荷的轨迹已由正电荷画出，跳过以免重复。箭头始终沿电场（由正指向负）。 */
        c.strokeStyle = C.ink; c.lineWidth = 1.1; c.globalAlpha = 0.75;
        function traceLines(q0, dir, skipHitPos) {
          for (var k = 0; k < 16; k++) {
            var an = k / 16 * 2 * Math.PI, x = q0.x + 0.06 * Math.cos(an), y = q0.y + 0.06 * Math.sin(an);
            var pts = [[x, y]], hitPos = false;
            for (var n = 0; n < 400; n++) {
              var E = P.field(Q, x, y), e = Math.hypot(E[0], E[1]); if (!e) break;
              x += dir * 0.02 * E[0] / e; y += dir * 0.02 * E[1] / e; pts.push([x, y]);
              if (x < -0.5 || x > 4.5 || y < -0.5 || y > 3.5) break;
              var hitq = false; Q.forEach(function (qq) { if (qq !== q0 && Math.hypot(x - qq.x, y - qq.y) < 0.05) { hitq = true; if (qq.q > 0) hitPos = true; } });
              if (hitq) break;
            }
            if (skipHitPos && hitPos) continue;
            c.beginPath();
            pts.forEach(function (p, i) { i ? c.lineTo(m.X(p[0]), m.Y(p[1])) : c.moveTo(m.X(p[0]), m.Y(p[1])); });
            c.stroke();
            if (pts.length > 40) {
              var pA = pts[40], E2 = P.field(Q, pA[0], pA[1]), a2 = Math.atan2(-E2[1], E2[0]), X0 = m.X(pA[0]), Y0 = m.Y(pA[1]);
              c.beginPath(); c.moveTo(X0 + 6 * Math.cos(a2), Y0 + 6 * Math.sin(a2)); c.lineTo(X0 - 6 * Math.cos(a2 - 0.5), Y0 - 6 * Math.sin(a2 - 0.5)); c.lineTo(X0 - 6 * Math.cos(a2 + 0.5), Y0 - 6 * Math.sin(a2 + 0.5)); c.closePath(); c.fillStyle = C.ink; c.fill();
            }
          }
        }
        Q.forEach(function (q) { if (q.q > 0) traceLines(q, 1, false); else if (q.q < 0) traceLines(q, -1, true); });
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
      /* 极板组整体靠右，左侧留给电池、极性标注和竖导线；顶轨在提示和上极板把手之下。 */
      var W = d.W, H = d.H, wd = wide(W), Hc = wd ? H : Math.round(H * 0.62);
      var wy = 36, by = Hc - 14, padTop = wy + 28, padBot = 22;
      var room = by - padBot - padTop - 6, kd = D.clamp(Math.floor(room / 3.15), 16, 40);
      var yb = D.clamp(Math.round(Hc * 0.66), padTop + 3 * kd + 6, by - padBot);
      var gap = kd * dr.v, yt = yb - gap - 6;
      var bx = wd ? 38 : 32, xMin = bx + (wd ? 64 : 56), meterGap = wd ? 28 : 26, meterR = 15;
      var rightLim = wd ? W * 0.58 : W;
      var pwMax = Math.max(100, rightLim - (meterGap + meterR + 12) - xMin);
      var pw = Math.min(wd ? Math.min(W * 0.32, 250) : pwMax, pwMax);
      var x0 = xMin, cx = x0 + pw / 2;
      var sw = D.clamp(bx + 20, 22, x0 - 28);
      return { W: W, H: H, wd: wd, Hc: Hc, cx: cx, pw: pw, kd: kd, yb: yb, gap: gap, yt: yt, bx: bx, sw: sw, wy: wy, by: by, x0: x0, meterGap: meterGap, meterR: meterR };
    }
    return { aspect: function (w) { return wide(w) ? 1.7 : 0.85; },
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
        var g = geo(d), W = g.W, H = g.H, cx = g.cx, pw = g.pw, yb = g.yb, yt = g.yt, gap = g.gap, x0 = g.x0, i, x, on = mode.v === 'on';
        var bx = g.bx, wy = g.wy, by = g.by, sw = g.sw, bc = (wy + by) / 2, rise = x0 - 10;
        /* 导线、电池、刀闸开关：刀闸在左槽顶轨上，竖线在极板左缘外侧 */
        D.wire(c, [[x0, yt + 3], [rise, yt + 3], [rise, wy], [sw + 14, wy]]);
        D.wire(c, [[sw - 14, wy], [bx, wy], [bx, bc - 24]]);
        D.wire(c, [[x0, yb + 3], [rise, yb + 3], [rise, by], [bx, by], [bx, bc + 24]]);
        D.drawCell(c, bx, bc, 48, 18, -Math.PI / 2); txt(c, '10 V', bx, bc + 38, C['ink-2'], F12);
        var ang = on ? 0 : -0.75; c.save(); c.translate(sw - 14, wy); c.rotate(ang); metal(c, 0, -2, 28, 4); c.restore();
        D.drawBall(c, sw - 14, wy, 3.5, '#6b717c'); D.drawBall(c, sw + 14, wy, 3, '#6b717c'); D.drawBall(c, sw - 14 + Math.cos(ang) * 30, wy + Math.sin(ang) * 30, 4, C.c4);
        if (!on) txt(c, '断开', (bx + rise) / 2, wy + 16, C.warn, F12);
        /* 介质、极板、电荷、电场 */
        if (er.v > 1) { var dg = c.createLinearGradient(0, yt + 6, 0, yb); dg.addColorStop(0, D.alpha(C.accent, 0.28)); dg.addColorStop(0.5, D.alpha(C.accent, 0.14)); dg.addColorStop(1, D.alpha(C.accent, 0.3)); c.fillStyle = dg; c.fillRect(x0 + 4, yt + 6, pw - 8, gap); txt(c, 'εᵣ = ' + fx(er.v, 1), x0 + pw - 10, yt + 6 + gap / 2, C.accent, F11, 'right'); }
        D.shadow(c, cx, yb + 12, pw * 0.55, 3, 0.25);
        metal(c, x0, yt, pw, 6); metal(c, x0, yb, pw, 6);
        c.fillStyle = C.c2; c.fillRect(x0, yt + 5, pw, 1.5); c.fillStyle = C.c1; c.fillRect(x0, yb - 0.5, pw, 1.5);
        line(c, [[cx, yt], [cx, yt - 8]], C.dark ? '#9aa0aa' : '#5d636e', 3); D.drawBall(c, cx, yt - 12, 6, C.dark ? '#7a6a55' : '#3a3e46'); /* 绝缘把手 */
        var nq = Math.max(1, Math.round(r.Q / r0.Q * 6)); for (i = 0; i < Math.min(nq, 24); i++) { x = x0 + (i + 0.5) * pw / Math.min(nq, 24); txt(c, '+', x, yt - 6, C.c2, '700 12px ' + D.FONT); txt(c, '−', x, yb + 15, C.c1, '700 12px ' + D.FONT); }
        var nE = Math.max(1, Math.round(r.E / r0.E * 5)); for (i = 0; i < Math.min(nE, 20); i++) { x = x0 + (i + 0.5) * pw / Math.min(nE, 20); arrow(c, x, yt + 7, x, yb - 1, C['ink-2'], 1.2); }
        /* 电压表并在极板两端（随极板组一起右移） */
        var mx = x0 + pw + g.meterGap, my = (yt + yb) / 2, mR = g.meterR;
        D.wire(c, [[x0 + pw, yt + 3], [mx, yt + 3], [mx, my - mR - 1]], { w: 1.2 }); D.wire(c, [[x0 + pw, yb + 3], [mx, yb + 3], [mx, my + mR + 1]], { w: 1.2 });
        D.drawMeter(c, mx, my, mR, r.V / 30, { label: 'V' });
        var vLab = fx(r.V, 1) + ' V', vLy = Math.max(yb + 16, my + mR + 12);
        txt(c, vLab, mx, vLy, C['ink-2'], '600 12px ' + D.FONT);
        if (!d.grabbed) D.hint(c, '可上下拖上极板（改 d），点按开关', x0, 12);
        var ratios = [r.C / r0.C, r.Q / r0.Q, r.V / r0.V, r.E / r0.E, r.U / r0.U], barMax = Math.max(5, Math.ceil(Math.max.apply(null, ratios)));
        var barItems = [['C', ratios[0], C.c1], ['Q', ratios[1], C.c3], ['V', ratios[2], C.c2], ['E', ratios[3], C['ink-2']], ['U', ratios[4], C.warn]];
        var barX, barY, barW, barH;
        var barTitle = '与初始（d₀, εᵣ=1, 10 V）之比';
        if (g.wd) {
          barX = W * 0.58; barY = 56; barW = W * 0.4; barH = H - 116;
          bars(c, barX, barY, barW, barH, barItems, barMax, '');
          txt(c, barTitle, barX + barW / 2, 22, C['ink-2'], '600 12px ' + D.FONT);
        } else {
          barX = 20; barY = g.Hc + 26; barW = W - 40; barH = H - g.Hc - 62;
          bars(c, barX, barY, barW, barH, barItems, barMax, barTitle);
        }
        /* 给重叠检查用的几何快照（画面上不另画） */
        (function () {
          function tbox(name, s, x, y, font, align) {
            c.save(); c.font = font || F12; var tw = c.measureText(s).width, th = 13, ax = align === 'left' ? 0 : align === 'right' ? 1 : 0.5; c.restore();
            return { name: name, x: x - ax * tw - 1, y: y - th / 2 - 1, w: tw + 2, h: th + 2 };
          }
          var boxes = [
            { name: 'plateT', x: x0, y: yt, w: pw, h: 6 },
            { name: 'plateB', x: x0, y: yb, w: pw, h: 6 },
            { name: 'handle', x: cx - 8, y: yt - 20, w: 16, h: 22 },
            { name: 'meter', x: mx - mR, y: my - mR, w: 2 * mR, h: 2 * mR, r: mR, cx: mx, cy: my },
            { name: 'batt', x: bx - 10, y: bc - 25, w: 20, h: 50 },
            { name: 'plusRow', x: x0, y: yt - 14, w: pw, h: 12 },
            { name: 'minusRow', x: x0, y: yb + 8, w: pw, h: 14 },
            tbox('battV', '10 V', bx, bc + 38, F12),
            tbox('batt+', '+', bx + 17, bc - 16, '700 12px ' + D.FONT),
            tbox('batt−', '−', bx + 17, bc + 18, '700 12px ' + D.FONT),
            tbox('vread', vLab, mx, vLy, '600 12px ' + D.FONT)
          ];
          if (!on) boxes.push(tbox('openLab', '断开', (bx + rise) / 2, wy + 16, F12));
          if (!d.grabbed) boxes.push(tbox('hint', '可上下拖上极板（改 d），点按开关', x0, 12, '12px ' + D.FONT, 'left'));
          if (er.v > 1) boxes.push(tbox('erLab', 'εᵣ = ' + fx(er.v, 1), x0 + pw - 10, yt + 6 + gap / 2, F11, 'right'));
          boxes.push({ name: 'bars', x: barX, y: g.wd ? 10 : barY - 16, w: barW, h: g.wd ? (barY + barH - 10) : barH + 30 });
          if (g.wd) boxes.push(tbox('barTitle', barTitle, barX + barW / 2, 22, '600 12px ' + D.FONT));
          var ang = on ? 0 : -0.75, tipx = sw - 14 + Math.cos(ang) * 30, tipy = wy + Math.sin(ang) * 30;
          boxes.push({ name: 'switch', x: Math.min(sw - 18, tipx) - 5, y: Math.min(wy, tipy) - 6, w: Math.abs(Math.max(sw + 18, tipx) - Math.min(sw - 18, tipx)) + 10, h: Math.abs(Math.max(wy, tipy) - Math.min(wy, tipy)) + 12 });
          d._audit = {
            W: W, H: H, d: dr.v, er: er.v, on: on, grabbed: !!d.grabbed,
            wires: [
              { name: 'top', pts: [[x0, yt + 3], [rise, yt + 3], [rise, wy], [sw + 14, wy]], w: 3 },
              { name: 'batt+', pts: [[sw - 14, wy], [bx, wy], [bx, bc - 24]], w: 3 },
              { name: 'bot', pts: [[x0, yb + 3], [rise, yb + 3], [rise, by], [bx, by], [bx, bc + 24]], w: 3 },
              { name: 'vmT', pts: [[x0 + pw, yt + 3], [mx, yt + 3], [mx, my - mR - 1]], w: 1.6 },
              { name: 'vmB', pts: [[x0 + pw, yb + 3], [mx, yb + 3], [mx, my + mR + 1]], w: 1.6 }
            ],
            boxes: boxes,
            joints: [[x0, yt + 3], [x0, yb + 3], [x0 + pw, yt + 3], [x0 + pw, yb + 3], [bx, bc - 24], [bx, bc + 24], [bx, wy], [bx, by], [rise, wy], [rise, yt + 3], [rise, yb + 3], [rise, by], [sw - 14, wy], [sw + 14, wy], [mx, yt + 3], [mx, yb + 3], [mx, my - mR - 1], [mx, my + mR + 1]]
          };
        })();
        d.out([['C = εᵣε₀S/d', fx(r.C / r0.C, 2) + ' 倍（' + fx(r.C * 1e12, 1) + ' pF）'], ['Q', fx(r.Q / r0.Q, 2) + ' 倍'], ['V', fx(r.V, 2) + ' V'], ['E = V/d', fx(r.E / r0.E, 2) + ' 倍'], ['静电能 U = ½QV', fx(r.U / r0.U, 2) + ' 倍']],
          '接着电池：V 不变，Q = CV 随 C 变。断开后：Q 不变，V = Q/C；此时只改变 d 的话 E = Q/(εᵣε₀S) 不变。（S = 100 cm²，d₀ = 1 mm）可直接抓住上极板的绝缘把手上下拖动改变 d，点按刀闸开关切换“接着电池 / 断开”；电压表（满偏 30 V）显示板间电压。');
      } };
  });
})();
