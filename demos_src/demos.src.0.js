/* EJU 物理 互动演示（原生 JS + canvas；进入视口才初始化，离开视口暂停） */
(function () {
  'use strict';
  var P = window.PHYS, RM = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var COL = {}, ALL = [], REG = {};
  function readCols() {
    var cs = getComputedStyle(document.documentElement);
    ['ink', 'ink-2', 'ink-3', 'line', 'surface', 'surface-2', 'accent', 'accent-soft', 'warn', 'good', 'c1', 'c2', 'c3', 'c4', 'bg'].forEach(function (k) {
      COL[k] = cs.getPropertyValue('--' + k).trim() || '#888';
    });
    COL.dark = document.documentElement.getAttribute('data-theme') === 'dark';
  }
  function fx(v, d) { if (!isFinite(v)) return '∞'; d = d == null ? 2 : d; var s = Math.abs(v) < 1e-9 ? (0).toFixed(d) : v.toFixed(d); return s.replace('-', '−'); }
  function sci(v, d) { if (v === 0) return '0'; var e = Math.floor(Math.log10(Math.abs(v))), m = v / Math.pow(10, e); return fx(m, d == null ? 2 : d) + '×10<sup>' + String(e).replace('-', '−') + '</sup>'; }
  function h(tag, attrs, parent, text) { var e = document.createElement(tag); for (var k in attrs || {}) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; }

  function Demo(root, spec) {
    var d = this; d.root = root; d.spec = spec; d.handles = []; d.playing = false; d.visible = false; d.t = 0;
    root.classList.add('demo-on');
    var stage = h('div', { 'class': 'demo-stage' }, root);
    d.cv = h('canvas', { role: 'img', 'aria-label': root.getAttribute('data-title') || '互动演示' }, stage);
    d.ctx = d.cv.getContext('2d');
    d.ctl = h('div', { 'class': 'demo-ctl' }, root);
    d.outEl = h('div', { 'class': 'demo-out', 'aria-live': 'polite' }, root);
    d.aspect = spec.aspect || 1.6; /* 可为函数 aspect(宽度px)：窄屏可取更高的画面 */
    d.resize = function () {
      var w = stage.clientWidth || 300, asp = typeof d.aspect === 'function' ? d.aspect(w) : d.aspect, hgt = Math.min(Math.round(w / asp), spec.maxH || 520);
      var r = Math.min(window.devicePixelRatio || 1, 2);
      d.W = w; d.H = hgt; d.cv.width = Math.round(w * r); d.cv.height = Math.round(hgt * r);
      d.cv.style.height = hgt + 'px'; d.ctx.setTransform(r, 0, 0, r, 0, 0);
      if (spec.resize) spec.resize(d);
      d.draw();
    };
    d.draw = function () { var c = d.ctx; c.clearRect(0, 0, d.W, d.H); c.save(); spec.draw(d, c); c.restore(); d.drawHandles(c); };
    var raf = 0, last = 0;
    function frame(ts) {
      raf = 0; var dt = last ? Math.min((ts - last) / 1000, 0.05) : 0; last = ts;
      if (spec.step && dt > 0) spec.step(d, dt);
      d.draw();
      if (d.playing && d.visible) raf = requestAnimationFrame(frame); else last = 0;
    }
    d.kick = function () { if (!raf && d.playing && d.visible) { last = 0; raf = requestAnimationFrame(frame); } };
    d.redraw = function () { if (!raf) { raf = requestAnimationFrame(function (ts) { raf = 0; d.draw(); d.kick(); }); } };
    d.setVisible = function (v) { d.visible = v; if (v) d.kick(); };
    d.play = function (on) { d.playing = on; if (d.playBtn) { d.playBtn.textContent = on ? '暂停' : '播放'; d.playBtn.setAttribute('aria-pressed', on); } if (on) d.kick(); else d.redraw(); };
    /* —— 控件 —— */
    d.slider = function (label, min, max, step, val, fmt, on) {
      var w = h('label', { 'class': 'demo-sl' }, d.ctl), sp = h('span', null, w), inp = h('input', { type: 'range', min: min, max: max, step: step, value: val }, w);
      var o = { v: +val, el: inp, set: function (x) { o.v = +x; inp.value = x; sp.innerHTML = label + '　<b>' + fmt(o.v) + '</b>'; } };
      o.set(val);
      inp.addEventListener('input', function () { o.set(inp.value); if (on) on(o.v); d.redraw(); });
      return o;
    };
    d.seg = function (label, opts, val, on) {
      var w = h('div', { 'class': 'demo-seg', role: 'group', 'aria-label': label }, d.ctl); h('span', null, w, label);
      var o = { v: val, btns: [] };
      opts.forEach(function (op) {
        var b = h('button', { type: 'button', 'aria-pressed': op[0] === val }, w, op[1]);
        b.addEventListener('click', function () { o.v = op[0]; o.btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); if (on) on(o.v); d.redraw(); });
        o.btns.push(b);
      });
      o.set = function (v) { o.v = v; o.btns.forEach(function (x, i) { x.setAttribute('aria-pressed', opts[i][0] === v); }); };
      return o;
    };
    d.button = function (label, on) { if (!d.row) d.row = h('div', { 'class': 'demo-row' }, d.ctl); var b = h('button', { type: 'button', 'class': 'demo-btn' }, d.row, label); b.addEventListener('click', function () { on(); d.redraw(); }); return b; };
    d.playToggle = function () { d.playBtn = d.button('播放', function () { d.play(!d.playing); }); d.playBtn.setAttribute('aria-pressed', 'false'); };
    d.out = function (rows, note) {
      var s = '<dl>' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl>';
      if (note) s += '<p>' + note + '</p>';
      if (s !== d._lastOut) { d.outEl.innerHTML = s; d._lastOut = s; }
    };
    /* —— 可拖动把手（显示 r≈9px，触控命中半径 24px ⇒ 48px 目标） —— */
    d.handle = function (o) { o.r = o.r || 9; d.handles.push(o); return o; };
    /* —— 可抓取物体：抓住拖动、松手按平滑后的手势速度抛出 ——
       o = { get()→[x,y] 物体中心, r 物体半径 px（数或函数）, set(x,y) 新中心（已扣除抓取点偏移）,
             start(x,y) 抓起, release(vx,vy) 松手（px/s；手指停住后松手 ⇒ 0）, hidden(), autoplay: false 可关闭“抓起即播放” }
       命中：距中心 ≤ max(24, r+10) px；物体由 demo 自己画（框架不画把手圆点） */
    d.grab = function (o) { o.body = true; o.r = o.r || 12; d.handles.push(o); return o; };
    function rad(o) { return typeof o.r === 'function' ? o.r() : o.r; }
    d.drawHandles = function (c) {
      d.handles.forEach(function (o) {
        if (o.body || (o.hidden && o.hidden())) return;
        var p = o.get(); c.save(); c.beginPath(); c.arc(p[0], p[1], o.r + 6, 0, 7); c.fillStyle = COL.dark ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.07)'; c.fill();
        c.beginPath(); c.arc(p[0], p[1], o.r, 0, 7); c.fillStyle = o.color ? o.color() : COL.accent; c.fill();
        c.lineWidth = 2; c.strokeStyle = COL.surface; c.stroke(); c.restore();
      });
    };
    function pos(e) { var b = d.cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; }
    function hit(p) { /* 物体按“到边缘的距离”比较，大物体内部优先于附近的小把手 */
      var best = null, bs = Infinity;
      d.handles.forEach(function (o) {
        if (o.hidden && o.hidden()) return;
        var q = o.get(), dd = Math.hypot(q[0] - p[0], q[1] - p[1]), rr = o.body ? rad(o) : 0;
        if (dd <= Math.max(24, rr + 10) && dd - rr < bs) { bs = dd - rr; best = o; }
      });
      return best;
    }
    var drag = null, pid = null, off = [0, 0], samp = [];
    function now() { return window.performance ? performance.now() : Date.now(); }
    function vel() { /* 最近 ~100 ms 的平均速度；手指停住 >80 ms 视为 0 */
      var n = samp.length, l = samp[n - 1], j = n - 1;
      if (n < 2 || now() - l[0] > 80) return [0, 0];
      while (j > 0 && l[0] - samp[j - 1][0] <= 100) j--;
      if (j === n - 1) j--;
      var dt = (l[0] - samp[j][0]) / 1000;
      return dt > 0.004 ? [(l[1] - samp[j][1]) / dt, (l[2] - samp[j][2]) / dt] : [0, 0];
    }
    function sample(p) { var t = now(); samp.push([t, p[0], p[1]]); while (samp.length > 2 && t - samp[0][0] > 160) samp.shift(); }
    d.cv.addEventListener('touchstart', function (e) { var t = e.touches[0], b = d.cv.getBoundingClientRect(); if (drag || hit([t.clientX - b.left, t.clientY - b.top])) e.preventDefault(); }, { passive: false });
    d.cv.addEventListener('pointerdown', function (e) {
      if (drag) return; var p = pos(e), o = hit(p); if (!o) return;
      drag = o; pid = e.pointerId; d.cv.setPointerCapture(e.pointerId); e.preventDefault(); d.cv.classList.add('grabbing');
      if (o.body) {
        var q = o.get(); off = [p[0] - q[0], p[1] - q[1]]; samp = []; sample(p); d.grabbed = true;
        if (o.start) o.start(q[0], q[1]);
        if (d.playBtn && o.autoplay !== false) d.play(true);
      } else if (o.start) o.start();
    });
    d.cv.addEventListener('pointermove', function (e) {
      var p = pos(e);
      if (drag) { if (e.pointerId !== pid) return; if (drag.body) { sample(p); drag.set(p[0] - off[0], p[1] - off[1]); } else drag.set(p[0], p[1]); d.redraw(); return; }
      if (e.pointerType === 'mouse') d.cv.classList.toggle('grab', !!hit(p));
    });
    function up(e) {
      if (drag && e && e.pointerId !== pid) return;
      if (drag && drag.body && drag.release) { var v = e && e.type === 'pointerup' ? vel() : [0, 0]; drag.release(v[0], v[1]); }
      if (drag && drag.end) drag.end();
      drag = null; pid = null; d.cv.classList.remove('grabbing'); d.redraw();
    }
    d.cv.addEventListener('pointerup', up); d.cv.addEventListener('pointercancel', up);
    d.dragging = function (o) { return o ? drag === o : !!drag; };
    d.grabVel = function () { return drag && drag.body ? vel() : [0, 0]; }; /* 拖动中的平滑手势速度 px/s */
    spec.init(d);
    if (spec.animated) { d.playToggle(); d.playing = !RM.matches; d.play(d.playing); }
    if (window.ResizeObserver) new ResizeObserver(function () { if (stage.clientWidth !== d.W) d.resize(); }).observe(stage);
    d.resize();
  }
  /* —— 绘图工具 —— */
  function arrow(c, x1, y1, x2, y2, col, w, label, lpos) {
    var L = Math.hypot(x2 - x1, y2 - y1); c.save(); c.strokeStyle = c.fillStyle = col; c.lineWidth = w || 2.5;
    if (L > 1) {
      var a = Math.atan2(y2 - y1, x2 - x1), hd = Math.min(10, L * 0.45);
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2 - Math.cos(a) * hd * 0.6, y2 - Math.sin(a) * hd * 0.6); c.stroke();
      c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - hd * Math.cos(a - 0.4), y2 - hd * Math.sin(a - 0.4)); c.lineTo(x2 - hd * Math.cos(a + 0.4), y2 - hd * Math.sin(a + 0.4)); c.closePath(); c.fill();
    }
    if (label) { c.font = '600 13px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; var lp = lpos || 14, ang = Math.atan2(y2 - y1, x2 - x1);
      txt(c, label, x2 + Math.cos(ang) * lp, y2 + Math.sin(ang) * lp, col); }
    c.restore();
  }
  function txt(c, s, x, y, col, font, align, base) {
    c.save(); c.font = font || '13px system-ui,"PingFang SC","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif'; c.textAlign = align || 'center'; c.textBaseline = base || 'middle';
    c.lineWidth = 3; c.strokeStyle = COL.surface; c.lineJoin = 'round'; c.strokeText(s, x, y); c.fillStyle = col || COL.ink; c.fillText(s, x, y); c.restore();
  }
  function line(c, pts, col, w, dash) { c.save(); c.strokeStyle = col; c.lineWidth = w || 1.5; if (dash) c.setLineDash(dash); c.beginPath(); pts.forEach(function (p, i) { i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.stroke(); c.restore(); }
  function dot(c, x, y, r, col) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = col; c.fill(); }
  /* 线性映射：世界坐标 → 屏幕 */
  function Map(x0, x1, y0, y1, L, R, T, B) {
    var m = { x0: x0, x1: x1, y0: y0, y1: y1, L: L, R: R, T: T, B: B };
    m.X = function (x) { return m.L + (x - m.x0) / (m.x1 - m.x0) * (m.R - m.L); };
    m.Y = function (y) { return m.B - (y - m.y0) / (m.y1 - m.y0) * (m.B - m.T); };
    m.ix = function (X) { return m.x0 + (X - m.L) / (m.R - m.L) * (m.x1 - m.x0); };
    m.iy = function (Y) { return m.y0 + (m.B - Y) / (m.B - m.T) * (m.y1 - m.y0); };
    m.dx = function (px) { return px * (m.x1 - m.x0) / (m.R - m.L); };   /* 屏幕位移/速度 → 世界（如 grab 的 px/s → m/s） */
    m.dy = function (py) { return -py * (m.y1 - m.y0) / (m.B - m.T); };
    return m;
  }
  function axes(c, m, xl, yl, xt, yt) {
    c.save(); c.strokeStyle = COL.line; c.lineWidth = 1; c.font = '11px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif'; c.fillStyle = COL['ink-3'];
    if (xt) for (var x = Math.ceil(m.x0 / xt) * xt; x <= m.x1 + 1e-9; x += xt) { c.beginPath(); c.moveTo(m.X(x), m.T); c.lineTo(m.X(x), m.B); c.stroke(); c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText(+x.toFixed(6), m.X(x), m.B + 3); }
    if (yt) for (var y = Math.ceil(m.y0 / yt) * yt; y <= m.y1 + 1e-9; y += yt) { c.beginPath(); c.moveTo(m.L, m.Y(y)); c.lineTo(m.R, m.Y(y)); c.stroke(); c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(+y.toFixed(6), m.L - 4, m.Y(y)); }
    c.strokeStyle = COL['ink-3']; c.lineWidth = 1.5; var zy = Math.max(m.T, Math.min(m.B, m.Y(0))), zx = Math.max(m.L, Math.min(m.R, m.X(0)));
    c.beginPath(); c.moveTo(m.L, zy); c.lineTo(m.R, zy); c.moveTo(zx, m.T); c.lineTo(zx, m.B); c.stroke(); c.restore();
    if (xl) txt(c, xl, m.R - 4, zy - 10, COL['ink-2'], null, 'right');
    if (yl) txt(c, yl, zx + 6, m.T + 8, COL['ink-2'], null, 'left');
  }
  function bars(c, x, y, w, hgt, items, max, title) { /* 竖直柱状图 items=[[label,val,col]] */
    var n = items.length, bw = w / n; txt(c, title || '', x + w / 2, y - 10, COL['ink-2'], '600 12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif');
    line(c, [[x, y + hgt], [x + w, y + hgt]], COL['ink-3'], 1);
    items.forEach(function (it, i) {
      var v = it[1], bh = Math.min(Math.abs(v) / (max || 1), 1.05) * hgt * (v < 0 ? 0 : 1);
      c.fillStyle = it[2]; c.fillRect(x + i * bw + bw * 0.18, y + hgt - bh, bw * 0.64, bh);
      txt(c, it[0], x + i * bw + bw / 2, y + hgt + 11, COL['ink-2'], '12px system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif');
    });
  }
  /* —— 真实化外观（可复用；全部只用 canvas 2D，无外部资源） —— */
  var FONT = 'system-ui,"PingFang SC","Hiragino Sans","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif', RGB = {};
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rgb(col) {
    if (RGB[col]) return RGB[col];
    var m, r = [136, 136, 136];
    if ((m = /^#([0-9a-f]{3,8})$/i.exec(col))) { var s = m[1]; if (s.length < 6) s = s.replace(/./g, '$&$&'); r = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]; }
    else if ((m = /rgba?\(([^)]+)\)/.exec(col))) r = m[1].split(/[ ,\/]+/).filter(Boolean).slice(0, 3).map(parseFloat);
    return (RGB[col] = r);
  }
  function shade(col, k) { var t = k < 0 ? 0 : 255, a = Math.min(Math.abs(k), 1); return 'rgb(' + rgb(col).map(function (v) { return Math.round(v + (t - v) * a); }).join(',') + ')'; } /* k>0 提亮，k<0 压暗 */
  function alpha(col, a) { return 'rgba(' + rgb(col).join(',') + ',' + a + ')'; }
  function rrect(c, x, y, w, hgt, r) { r = Math.min(r, w / 2, hgt / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + hgt, r); c.arcTo(x + w, y + hgt, x, y + hgt, r); c.arcTo(x, y + hgt, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  /* 柔和接触阴影（椭圆径向渐变） */
  function shadow(c, x, y, rx, ry, a) {
    if (!(rx > 0.5)) return; c.save(); c.translate(x, y); c.scale(1, Math.max(ry, 0.5) / rx);
    var g = c.createRadialGradient(0, 0, 0, 0, 0, rx), k = Math.min(0.6, (a == null ? 0.28 : a) * (COL.dark ? 1.6 : 1));
    g.addColorStop(0, 'rgba(0,0,0,' + k + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, 7); c.fill(); c.restore();
  }
  /* 立体小球：o = { spin 滚动角(rad) 画一道标记, label, alpha, flat 残影用的平面圆, shadowY 地面 y（画投影）, shadowS 投影缩放 } */
  function drawBall(c, x, y, r, col, o) {
    o = o || {}; c.save(); if (o.alpha != null) c.globalAlpha *= o.alpha;
    if (o.shadowY != null) { var ss = o.shadowS == null ? 1 : o.shadowS; shadow(c, x, o.shadowY, r * 1.05 * ss, r * 0.3 * ss, 0.32 * ss); }
    c.beginPath(); c.arc(x, y, r, 0, 7);
    if (o.flat) { c.fillStyle = col; c.fill(); c.restore(); return; }
    var g = c.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.08, x, y, r * 1.02);
    g.addColorStop(0, shade(col, 0.6)); g.addColorStop(0.4, col); g.addColorStop(1, shade(col, -0.5)); c.fillStyle = g; c.fill();
    if (o.spin != null) { c.save(); c.clip(); c.strokeStyle = 'rgba(255,255,255,.38)'; c.lineWidth = Math.max(1.5, r * 0.16); var ca = Math.cos(o.spin) * r, sa = Math.sin(o.spin) * r; c.beginPath(); c.moveTo(x - ca, y - sa); c.lineTo(x + ca, y + sa); c.stroke(); c.restore(); }
    c.beginPath(); c.arc(x, y, r - 0.5, 0, 7); c.lineWidth = 1; c.strokeStyle = shade(col, -0.6); c.stroke();
    c.beginPath(); c.ellipse(x - r * 0.36, y - r * 0.44, r * 0.26, r * 0.16, -0.6, 0, 7); c.fillStyle = 'rgba(255,255,255,.55)'; c.fill();
    if (o.label) label(c, o.label, x, y + 0.5, r);
    c.restore();
  }
  function label(c, s, x, y, r) { c.font = '600 ' + Math.round(clamp(r * 0.8, 10, 14)) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = 2.5; c.strokeStyle = 'rgba(0,0,0,.45)'; c.strokeText(s, x, y); c.fillStyle = '#fff'; c.fillText(s, x, y); }
  /* 实验小车（力学台车）：x 中心，y 轨道面（车轮着地处）；o = { wheel 车轮转角(rad), label, alpha, flat } */
  function drawCart(c, x, y, w, hgt, col, o) {
    o = o || {}; var wr = Math.max(4, hgt * 0.34), top = y - 2 * wr * 0.9 - hgt, bot = top + hgt;
    c.save(); if (o.alpha != null) c.globalAlpha *= o.alpha;
    if (o.flat) { rrect(c, x - w / 2, top, w, hgt + wr, 3); c.fillStyle = col; c.fill(); c.restore(); return; }
    shadow(c, x, y + 1, w * 0.58, 3.5, 0.35);
    var g = c.createLinearGradient(0, top, 0, bot); g.addColorStop(0, shade(col, 0.35)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.35));
    rrect(c, x - w / 2, top, w, hgt, 3); c.fillStyle = g; c.fill(); c.lineWidth = 1; c.strokeStyle = shade(col, -0.55); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x - w / 2 + 3, top + 1.5, w - 6, 1.5);                       /* 顶面高光 */
    c.fillStyle = COL.dark ? '#9aa0ab' : '#5d636e'; c.fillRect(x - w / 2 - 2, top + hgt * 0.3, 2.5, hgt * 0.45); c.fillRect(x + w / 2 - 0.5, top + hgt * 0.3, 2.5, hgt * 0.45); /* 两端缓冲器 */
    [-0.3, 0.3].forEach(function (k) { wheel(c, x + k * w, y - wr, wr, o.wheel || 0); });
    if (o.label) label(c, o.label, x, top + hgt / 2, hgt);
    c.restore();
  }
  function wheel(c, x, y, r, ang) {
    c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = '#2b2e35'; c.fill();
    var g = c.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r * 0.62); g.addColorStop(0, '#e9ecf1'); g.addColorStop(1, '#8d939e');
    c.beginPath(); c.arc(x, y, r * 0.6, 0, 7); c.fillStyle = g; c.fill();
    c.strokeStyle = '#4a4f59'; c.lineWidth = 1.2; c.beginPath();
    for (var i = 0; i < 3; i++) { var a = ang + i * 2.0944; c.moveTo(x, y); c.lineTo(x + Math.cos(a) * r * 0.58, y + Math.sin(a) * r * 0.58); }
    c.stroke(); c.beginPath(); c.arc(x, y, r * 0.16, 0, 7); c.fillStyle = '#3a3e46'; c.fill();
  }
  /* 木纹：离屏画一块可无缝平铺的纹理，按主题缓存，作为 pattern 使用（每帧零额外绘制成本） */
  var WOOD = {};
  function woodTile(tone) {
    var key = (COL.dark ? 'd' : 'l') + tone; if (WOOD[key]) return WOOD[key];
    var S = 2, w = 160, hh = 64, cv = document.createElement('canvas'); cv.width = w * S; cv.height = hh * S;
    var g = cv.getContext('2d'), base = COL.dark ? [112, 82, 54] : [216, 176, 124], seed = 11 + tone * 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    g.scale(S, S); g.fillStyle = 'rgb(' + base.map(function (v) { return Math.round(v * (1 - tone * 0.18)); }).join(',') + ')'; g.fillRect(0, 0, w, hh);
    for (var i = 0; i < 26; i++) {
      var y0 = rnd() * hh, amp = 0.6 + rnd() * 2.4, k = 1 + (i % 3), ph = rnd() * 6.283;
      g.strokeStyle = (COL.dark ? 'rgba(28,16,6,' : 'rgba(110,64,26,') + (0.07 + rnd() * 0.2).toFixed(3) + ')'; g.lineWidth = 0.5 + rnd() * 1.3;
      for (var dy = -hh; dy <= hh; dy += hh) { g.beginPath(); for (var x = 0; x <= w; x += 4) { var yy = y0 + dy + amp * Math.sin(x / w * 6.2832 * k + ph); x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }
    }
    return (WOOD[key] = { cv: cv, S: S, key: key });
  }
  function woodPattern(c, tone) { /* 返回可作 fillStyle 的木纹；tone 0 浅色木、1 深色木 */
    var t = woodTile(tone || 0), pc = c.__wood || (c.__wood = {}), p = pc[t.key];
    if (!p) { p = pc[t.key] = c.createPattern(t.cv, 'repeat'); if (p.setTransform && window.DOMMatrix) p.setTransform(new DOMMatrix().scale(1 / t.S)); }
    return p;
  }
  function wood(c, x, y, w, hgt, o) { /* 木纹矩形（带明暗与描边）；o = { tone, stroke: false } */
    o = o || {}; c.save(); c.fillStyle = woodPattern(c, o.tone); c.fillRect(x, y, w, hgt);
    var g = c.createLinearGradient(0, y, 0, y + hgt); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(0,0,0,.16)'); c.fillStyle = g; c.fillRect(x, y, w, hgt);
    if (o.stroke !== false) { c.lineWidth = 1; c.strokeStyle = COL.dark ? 'rgba(0,0,0,.6)' : 'rgba(80,50,20,.55)'; c.strokeRect(x + 0.5, y + 0.5, w - 1, hgt - 1); }
    c.restore();
  }
  /* 物块：中心 (x,y)，o = { angle 旋转(rad，画布方向), label, wood: true 木块 / false 金属色块, alpha } */
  function drawBlock(c, x, y, w, hgt, col, o) {
    o = o || {}; c.save(); c.translate(x, y); if (o.angle) c.rotate(o.angle); if (o.alpha != null) c.globalAlpha *= o.alpha;
    shadow(c, 0, hgt / 2 + 1, w * 0.6, 3, 0.4);
    if (o.wood !== false) wood(c, -w / 2, -hgt / 2, w, hgt, { tone: o.tone == null ? 1 : o.tone });
    else { var g = c.createLinearGradient(0, -hgt / 2, 0, hgt / 2); g.addColorStop(0, shade(col, 0.35)); g.addColorStop(1, shade(col, -0.35)); c.fillStyle = g; c.fillRect(-w / 2, -hgt / 2, w, hgt); c.strokeStyle = shade(col, -0.55); c.strokeRect(-w / 2 + 0.5, -hgt / 2 + 0.5, w - 1, hgt - 1); }
    if (col && o.wood !== false) { c.fillStyle = col; c.fillRect(-w / 2 + 1, -hgt / 2 + 1, w - 2, 3); } /* 色条：区分是哪一个物体 */
    if (o.label) label(c, o.label, 0, 1, Math.min(w, hgt) * 0.55);
    c.restore();
  }
  /* 挂钩砝码（槽码）：x 中心，y 顶端（挂钩处） */
  function drawWeight(c, x, y, w, hgt, col, o) {
    o = o || {}; c.save(); var n = Math.max(1, Math.min(4, Math.round(hgt / 9))), dh = (hgt - 4) / n;
    c.strokeStyle = COL.dark ? '#c9cdd5' : '#4a4f59'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y + 2, 2.2, 0, 7); c.stroke();
    for (var i = 0; i < n; i++) {
      var yy = y + 4 + i * dh, g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      g.addColorStop(0, shade(col, -0.45)); g.addColorStop(0.3, shade(col, 0.45)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.55));
      rrect(c, x - w / 2, yy, w, dh - 1, 2); c.fillStyle = g; c.fill(); c.lineWidth = 0.8; c.strokeStyle = shade(col, -0.6); c.stroke();
    }
    if (o.label) label(c, o.label, x, y + 4 + (hgt - 4) / 2, Math.min(w, hgt) * 0.55);
    c.restore();
  }
  /* 滑轮：带辐条随绳转动，ang = 绳走过的弧长 / r */
  function drawPulley(c, x, y, r, ang) {
    c.save(); var g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, '#f2f4f7'); g.addColorStop(0.7, '#a7adb7'); g.addColorStop(1, '#6b717c');
    c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = g; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#4a4f59'; c.stroke();
    c.beginPath(); c.arc(x, y, r * 0.78, 0, 7); c.lineWidth = 1; c.strokeStyle = 'rgba(60,64,72,.6)'; c.stroke();
    c.beginPath(); for (var i = 0; i < 4; i++) { var a = ang + i * Math.PI / 2; c.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2); c.lineTo(x + Math.cos(a) * r * 0.74, y + Math.sin(a) * r * 0.74); }
    c.lineWidth = 1.6; c.strokeStyle = '#555b66'; c.stroke();
    c.beginPath(); c.arc(x, y, r * 0.2, 0, 7); c.fillStyle = '#3a3e46'; c.fill(); c.restore();
  }
  /* 地面/轨道：o.kind = 'floor'（实验台面 + 剖面线）| 'rail'（铝轨）| 'soil'（室外地面）；o.depth 厚度 px */
  function ground(c, x0, x1, y, o) {
    o = o || {}; var k = o.kind || 'floor', dp = o.depth || (k === 'rail' ? 7 : 8), g; c.save();
    if (k === 'rail') {
      g = c.createLinearGradient(0, y, 0, y + dp); g.addColorStop(0, COL.dark ? '#c4c9d2' : '#eef0f3'); g.addColorStop(0.5, COL.dark ? '#7e8590' : '#b7bcc5'); g.addColorStop(1, COL.dark ? '#4c525c' : '#8c929c');
      c.fillStyle = g; c.fillRect(x0, y, x1 - x0, dp); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x0, y + dp * 0.55, x1 - x0, 1);
      c.fillStyle = COL.dark ? '#2d3139' : '#5d636e'; c.fillRect(x0 - 3, y - 6, 4, dp + 6); c.fillRect(x1 - 1, y - 6, 4, dp + 6); /* 端挡板 */
    } else if (k === 'soil') {
      g = c.createLinearGradient(0, y, 0, y + dp); g.addColorStop(0, COL.dark ? 'rgba(120,150,90,.55)' : 'rgba(110,150,70,.55)'); g.addColorStop(0.35, COL.dark ? 'rgba(110,90,60,.35)' : 'rgba(150,115,70,.30)'); g.addColorStop(1, 'rgba(150,115,70,0)');
      c.fillStyle = g; c.fillRect(x0, y, x1 - x0, dp);
    } else {
      g = c.createLinearGradient(0, y, 0, y + dp); g.addColorStop(0, alpha(COL['ink-3'], 0.28)); g.addColorStop(1, alpha(COL['ink-3'], 0)); c.fillStyle = g; c.fillRect(x0, y, x1 - x0, dp);
      c.strokeStyle = alpha(COL['ink-3'], 0.45); c.lineWidth = 1; c.beginPath(); for (var x = x0 + 4; x < x1; x += 8) { c.moveTo(x, y + 1); c.lineTo(x - 5, y + Math.min(dp, 7)); } c.stroke();
    }
    c.strokeStyle = COL['ink-3']; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); c.restore();
  }
  /* 刻度尺：X(u) 世界→屏幕x；在 [u0,u1] 画尺身（顶边 y，高 o.h）。o = { minor, major, every 标数字间隔, fmt(u), unit } */
  function ruler(c, X, u0, u1, y, o) {
    o = o || {}; var hh = o.h || 16, mi = o.minor, ma = o.major || mi * 5, ev = o.every || ma, fmt = o.fmt || function (u) { return String(+u.toFixed(6)).replace('-', '−'); };
    var xa = X(u0), xb = X(u1), ink = COL.dark ? '#efe6c8' : '#3b3020'; c.save();
    var g = c.createLinearGradient(0, y, 0, y + hh); g.addColorStop(0, COL.dark ? '#6a5f3e' : '#f6e7a8'); g.addColorStop(1, COL.dark ? '#4e4630' : '#e3cf7e');
    rrect(c, Math.min(xa, xb) - 6, y, Math.abs(xb - xa) + 12, hh, 2); c.fillStyle = g; c.fill(); c.lineWidth = 1; c.strokeStyle = COL.dark ? '#2e2a1d' : '#b49a45'; c.stroke();
    var px = Math.abs(X(u0 + mi) - xa), n0 = Math.ceil(u0 / mi - 1e-9), n1 = Math.floor(u1 / mi + 1e-9);
    c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = 1; c.font = '10px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'bottom'; c.beginPath();
    for (var n = n0; n <= n1; n++) {
      var u = n * mi, isM = Math.abs(u / ma - Math.round(u / ma)) < 1e-6; if (!isM && px < 3) continue;
      var xx = Math.round(X(u)) + 0.5; c.moveTo(xx, y); c.lineTo(xx, y + hh * (isM ? 0.5 : 0.28));
      if (Math.abs(u / ev - Math.round(u / ev)) < 1e-6) c.fillText(fmt(u), xx, y + hh - 0.5);
    }
    c.stroke(); if (o.unit) { c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillStyle = COL['ink-3']; c.font = '10px ' + FONT; c.fillText(o.unit, Math.min(xa, xb) - c.measureText(fmt(xa < xb ? u0 : u1)).width / 2 - 5, y + hh / 2); } /* 单位写在尺左侧外 */
    c.restore();
  }
  /* 轨迹残影缓冲：push(时间, a, b) 至少间隔 gap 记一个点，最多 n 个；时间倒退（循环重播）自动清空。
     each(fn(a, b, f 新旧程度 0→1, t)) 由 demo 决定怎么画（如半透明小球）。prefers-reduced-motion 下仍保留：它是静态信息 */
  function Trail(n, gap) {
    var t = { pts: [], n: n || 12, gap: gap || 0, last: -Infinity };
    t.push = function (time, a, b) { if (time < t.last - 1e-9) t.clear(); if (time - t.last < t.gap) return; t.last = time; t.pts.push([a, b, time]); if (t.pts.length > t.n) t.pts.shift(); };
    t.clear = function () { t.pts.length = 0; t.last = -Infinity; };
    t.each = function (fn) { var k = t.pts.length; t.pts.forEach(function (p, i) { fn(p[0], p[1], (i + 1) / (k + 1), p[2]); }); };
    return t;
  }
  /* 平滑过渡：指数逼近目标（时间常数 tau 秒）；减少动态效果时直接跳到目标 */
  function approach(cur, tgt, dt, tau) { return RM.matches || !(tau > 0) ? tgt : tgt + (cur - tgt) * Math.exp(-dt / tau); }
  function hint(c, s, x, y, align) { txt(c, s, x, y, COL['ink-3'], '12px ' + FONT, align || 'left'); }
  var DM = window.EJUDemo = { reg: function (n, f) { REG[n] = f; }, P: P, COL: COL, fx: fx, sci: sci, arrow: arrow, txt: txt, line: line, dot: dot, Map: Map, axes: axes, bars: bars,
    FONT: FONT, clamp: clamp, shade: shade, alpha: alpha, rrect: rrect, shadow: shadow, drawBall: drawBall, drawCart: drawCart, drawBlock: drawBlock, drawWeight: drawWeight, drawPulley: drawPulley,
    wood: wood, woodPattern: woodPattern, ground: ground, ruler: ruler, trail: Trail, approach: approach, hint: hint, reduced: function () { return RM.matches; } };
  function boot() {
    readCols();
    var els = [].slice.call(document.querySelectorAll('.demo[data-demo]'));
    function init(el) { if (el._demo || !REG[el.getAttribute('data-demo')]) return; try { el._demo = new Demo(el, REG[el.getAttribute('data-demo')]()); ALL.push(el._demo); } catch (err) { el.textContent = '演示加载失败'; throw err; } }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) init(e.target); if (e.target._demo) e.target._demo.setVisible(e.isIntersecting); }); }, { rootMargin: '150px 0px' });
      els.forEach(function (el) { io.observe(el); });
    } else els.forEach(function (el) { init(el); el._demo.setVisible(true); });
    new MutationObserver(function () { readCols(); ALL.forEach(function (d) { d.redraw(); }); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (RM.addEventListener) RM.addEventListener('change', function () { if (RM.matches) ALL.forEach(function (d) { if (d.playBtn) d.play(false); }); });
  }
  DM.boot = boot;
})();
