import importlib.util, glob, os, json, html, sys, math
import mapkids
open('assets/demos.js','w').write(''.join(open(f).read() for f in ['assets/physics.js']+sorted(glob.glob('demos_src/*.js'))))
sys.path.insert(0,"content")
TOPICS=[]
for f in sorted(glob.glob('content/[0-9]*.py')):
    s=importlib.util.spec_from_file_location(os.path.basename(f)[:-3],f); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); TOPICS.append(m.TOPIC)
MARK='①②③④⑤⑥'
DEMOS={
'motion':[('vt','v–t 图构建器','v-tグラフ','拖动 v–t 图的折点，小车、x–t 图和位移面积同步变化；也可直接抓住小车推出去，实测 v–t / x–t。'),('proj','抛体运动','放物運動','拖动初速度箭头（或用滑块）改变初速与仰角，比较射程与最高点；也可直接抓住小球甩出去。')],
'force':[('incline','斜面上的连接体','斜面と滑車でつながれた物体','改变质量、倾角和摩擦系数，看受力图、加速度与张力；可抓住物块或砝码推一下，看动摩擦下的运动。')],
'energy':[('energy','曲面上的力学能','力学的エネルギー保存','可直接抓住小球放到释放点，或沿轨道推出去；打开摩擦看力学能如何变成热。')],
'momentum':[('collide','一维碰撞','1次元の衝突','调质量、速度和恢复系数 e，比较碰撞前后的动量与动能；可直接抓住小球推出去碰撞。')],
'circular-shm':[('shm','简谐振动与参考圆','単振動と等速円運動','弹簧振子与参考圆同步运动，下方画出 x–t 图；可直接抓住木块拉开或推一下再松手。')],
'gravitation':[('orbit','卫星轨道与宇宙速度','人工衛星の軌道','改变发射速度：圆、椭圆、抛物线、双曲线；也可直接抓住卫星甩出去。')],
'thermal':[('pv','p–V 循环绘制器','p-V図と熱サイクル','拖动状态点 A–D，逐段计算 W、ΔU、Q 与热效率；气缸示意随状态点同步。')],
'waves':[('wave','叠加・驻波・纵波','重ね合わせ・定常波・縦波','切换模式观察脉冲叠加、驻波的节与腹、纵波的疏密；可直接抓住绳端甩出波。')],
'sound':[('doppler','多普勒效应','ドップラー効果','移动声源，看前后波长与观察者听到的频率；可直接抓住声源小车拖动或甩出。'),('wave','驻波（弦・气柱的基础）','定常波','节间距 λ/2：弦振动与气柱共鸣都由驻波决定。')],
'light':[('lens','透镜成像（光线作图）','レンズの作図','可直接抓住光具座上的物体拖动，看三条特征光线与像的位置、倍率。'),('slit','双缝干涉（杨氏实验）','ヤングの実験','改变波长、缝间距与屏距，看条纹间隔 Δx = Lλ/d；可直接抓住光屏改变 L。')],
'electric-field':[('field','电场线与等势线','電気力線と等電位線','可直接抓住电荷与绿色探针拖动，读出电势与电场强度。'),('cap','平行板电容器的操作','コンデンサーの操作','比较“接着电池”和“断开后”改变板间距或插入介质的结果；可直接抓住上极板拖动。')],
'current':[('dc','电源内阻与输出功率','内部抵抗と最大電力','调 E、r、R，看电流、端电压、P–R 曲线与电源伏安图；可直接拖动滑动变阻器的滑片。')],
'magnetism':[('lorentz','磁场中带电粒子的圆运动','ローレンツ力と円運動','改变电荷符号、速率、B 与质量，看半径与周期；也可直接抓住粒子射出。')],
'induction-ac':[('rod','导轨上的导体棒与终端速度','導体棒と終端速度','恒力拉动导体棒，看感应电流、电磁力与 v–t 图；可直接抓住导体棒推出去。')],
'atomic':[('photo','光电效应','光電効果','选择金属、改变频率，看最大动能与极限频率；光电管实验可调逆向电压。'),('decay','半衰期','半減期','400 个原子核随机衰变，与理论曲线比较；可拖动时间点前后查看。')],
}
def demosec(t):
    ds=DEMOS.get(t['slug'],[])
    if not ds: return ''
    body=''.join(f'<div class="demo" data-demo="{k}" data-title="{zh}"><h3>{zh}</h3><p class="demo-desc">{jp}　{desc}</p></div>' for k,zh,jp,desc in ds)
    return f'<section id="demo"><h2>互动演示</h2><p class="jp-sub">インタラクティブ・デモ（可拖动・调参数；离开画面自动暂停）</p>{body}</section>'
# DEMO-HOOK
from _x import demo_hub
TOPICS = [t for t in TOPICS if t['slug'] != 'demos']
_k = next((i for i, t in enumerate(TOPICS) if not (t.get('bank') or t['problems'])), len(TOPICS))
TOPICS.insert(_k, demo_hub(TOPICS, DEMOS))
# TIPS-HOOK
_TIPS = next((t.get('tips_data') for t in TOPICS if t.get('tips_data')), None)
if _TIPS:
    from _x import tip_backsec
    for t in TOPICS:
        if t.get('bank') or t['problems']:
            t['sections'] = [s for s in t['sections'] if s[0] != 'tips']
            _s = tip_backsec(t['slug'], _TIPS)
            if _s: t['sections'].append(_s)
# THEME-JS：头脚本（首次绘制前定主题并同步 <meta name="color-scheme">）与主题切换（四站同一份）
HEADJS = """<script>(function(){var d=document.documentElement,m=document.querySelector('meta[name="color-scheme"]'),t=null;try{t=localStorage.getItem('eju-theme')}catch(e){}if(t!=='light'&&t!=='dark')t=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.setAttribute('data-theme',t);if(m)m.content=t})()</script>"""
TOGGLEJS = """<script>(function(){var d=document.documentElement,b=document.getElementById('theme');if(!b)return;function s(t){d.setAttribute('data-theme',t);var m=document.querySelector('meta[name="color-scheme"]');if(m)m.content=t;b.textContent=t==='dark'?'浅色':'深色';b.setAttribute('aria-label',t==='dark'?'切换到浅色主题':'切换到深色主题')}s(d.getAttribute('data-theme')==='dark'?'dark':'light');b.onclick=function(){var t=d.getAttribute('data-theme')==='dark'?'light':'dark';s(t);try{localStorage.setItem('eju-theme',t)}catch(e){}};addEventListener('storage',function(e){if(e.key==='eju-theme'&&(e.newValue==='light'||e.newValue==='dark'))s(e.newValue)});var q=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)');if(q&&q.addEventListener)q.addEventListener('change',function(e){var v=null;try{v=localStorage.getItem('eju-theme')}catch(_){}if(v!=='light'&&v!=='dark')s(e.matches?'dark':'light')})})();</script>"""
# SITE-META：每站主色（<html data-site>）、favicon、OG / Twitter 分享卡片（og:image 用绝对 URL）、共用交互脚本
import siteenv
CFG = siteenv.load('physics')
SITE = 'physics'; SITE_NAME = 'EJU 理科 物理'; SITE_PATH = CFG.site_path; SITE_URL = CFG.site_url

SITE_DESC = '按 JASSO《日本留学試験 理科シラバス（物理）》编排：力学・热・波动・电磁气・原子。每页含要点讲解（中文 + 日语术语）、关键公式、原创例题和带解答的 EJU 风格选择题。'
def headmeta(title, desc, path, root):
    t, d = html.escape(title), html.escape(html.unescape(desc))
    return (f'<meta name="description" content="{d}">'
            f'<link rel="icon" href="{root}assets/favicon.svg" type="image/svg+xml"><link rel="icon" href="{root}assets/favicon-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="{root}assets/apple-touch-icon.png">\n'
            f'<meta property="og:type" content="website"><meta property="og:site_name" content="{SITE_NAME}"><meta property="og:locale" content="zh_CN"><meta property="og:title" content="{t}"><meta property="og:description" content="{d}"><meta property="og:url" content="{SITE_URL}{path}">'
            f'<meta property="og:image" content="{SITE_URL}assets/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="{SITE_NAME} · 全专题中文讲义">'
            f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{t}"><meta name="twitter:description" content="{d}"><meta name="twitter:image" content="{SITE_URL}assets/og.png">\n' + siteenv.extra_meta(CFG, path))
CHAPTERS = [  # area：日文名、一句章节提要
 ('力学', '力学', '从运动学到万有引力：受力分析、能量与动量守恒、圆周运动与简谐振动。'),
 ('热', '熱', '比热与热平衡、理想气体状态方程、热力学第一定律与热机效率。'),
 ('波动', '波動', '波的叠加与驻波，弦与气柱、多普勒效应，光的折射、透镜与干涉。'),
 ('电磁气', '電磁気', '电场与电容器、直流电路、电流的磁场与洛伦兹力、电磁感应与交流。'),
 ('原子', '原子', '光电效应与物质波、玻尔模型与能级、放射线、半衰期与核反应。'),
]
AREA_CH = {a: i for i, (a, _, _) in enumerate(CHAPTERS, 1)}

def _map_layout():
    """与 _map() 同一套角度：中心、五章环、专题环。缩略图和全图共用，免得对不齐。"""
    W, H, CX, CY = 1160, 1240, 580, 598
    R0, R1, R2, LIM = 58, 208, 348, 546
    cols = [[t for t in TOPICS if t['area'] == a and t['problems']] for a, _, _ in CHAPTERS]
    wt = [max(len(ts), 1.5) + .4 for ts in cols]; unit = 360 / sum(wt)
    a0 = 90 - wt[0] * unit / 2; sec = []
    for w in wt:
        sec.append((a0, a0 + w * unit)); a0 += w * unit
    chA = [(s + e) / 2 for s, e in sec]
    tA, tC = {}, {}
    for c, ts in enumerate(cols):
        for i, t in enumerate(ts):
            tA[t['slug']] = chA[c] + (i - (len(ts) - 1) / 2) * unit
            tC[t['slug']] = c
    return dict(W=W, H=H, CX=CX, CY=CY, R0=R0, R1=R1, R2=R2, LIM=LIM, chA=chA, sec=sec, tA=tA, tC=tC, cols=cols)

def _map_thumb(slug=None):
    """专题页抬头用的星图缩略：同一套坐标，标出本章和本专题；不含文字。"""
    L = _map_layout()
    CX, CY, R0, R1, R2, LIM, W, H = L['CX'], L['CY'], L['R0'], L['R1'], L['R2'], L['LIM'], L['W'], L['H']
    def pol(r, a):
        x = math.radians(a)
        return (CX + r * math.sin(x), CY - r * math.cos(x))
    def f(p):
        return f'{p[0]:.1f} {p[1]:.1f}'
    ch = L['tC'].get(slug)  # 0-based or None
    parts = [f'<svg class="hero-map" viewBox="0 0 {W} {H}" aria-hidden="true">']
    for r in (R0, R1, R2, LIM):
        parts.append(f'<circle class="hm-grid" cx="{CX}" cy="{CY}" r="{r}"/>')
    if ch is not None:
        a0, a1 = L['sec'][ch]
        p0, p1 = pol(R2, a0), pol(R2, a1)
        large = 1 if (a1 - a0) % 360 > 180 else 0
        parts.append(f'<path class="hm-sec hm-c{ch + 1}" d="M{f(p0)}A{R2} {R2} 0 {large} 1 {f(p1)}"/>')
        q0, q1 = pol(R1, a0), pol(R1, a1)
        parts.append(f'<path class="hm-sec hm-sec-in hm-c{ch + 1}" d="M{f(q0)}A{R1} {R1} 0 {large} 1 {f(q1)}"/>')
    for c, a in enumerate(L['chA']):
        p0, p1 = pol(R0 + 6, a), pol(R1, a)
        on = ' hm-on' if c == ch else ''
        parts.append(f'<line class="hm-tr hm-c{c + 1}{on}" x1="{p0[0]:.1f}" y1="{p0[1]:.1f}" x2="{p1[0]:.1f}" y2="{p1[1]:.1f}"/>')
    for sl, a in L['tA'].items():
        c = L['tC'][sl]
        p0, p1 = pol(R1, L['chA'][c]), pol(R2, a)
        on = ' hm-on' if sl == slug else ''
        parts.append(f'<line class="hm-tw hm-c{c + 1}{on}" x1="{p0[0]:.1f}" y1="{p0[1]:.1f}" x2="{p1[0]:.1f}" y2="{p1[1]:.1f}"/>')
    for sl, a in L['tA'].items():
        p = pol(R2, a); c = L['tC'][sl]
        now = ' hm-now' if sl == slug else ''
        r = 16 if sl == slug else 9
        parts.append(f'<circle class="hm-t hm-c{c + 1}{now}" cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="{r}"/>')
    for c, a in enumerate(L['chA']):
        p = pol(R1, a)
        on = ' hm-on' if c == ch else ''
        parts.append(f'<circle class="hm-ch hm-c{c + 1}{on}" cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="' + ('28' if c == ch else '18') + '"/>')
    parts.append(f'<circle class="hm-root" cx="{CX}" cy="{CY}" r="{R0}"/>')
    parts.append('</svg>')
    return ''.join(parts)

def page(t):
    meta = headmeta(f'{SITE_NAME} · {t["n"]} {t["zh"]}', t["lead"], f'topics/{t["slug"]}/', '../../')
    toc=[(sid,tt) for sid,tt,_,_ in t['sections']]+([('demo','互动演示')] if DEMOS.get(t['slug']) else [])+([('examples','例题')] if t['examples'] else [])+([('practice','练习题')] if t['problems'] else [])+([('terms','术语对照')] if t['terms'] else [])
    tochtml=''.join(f'<li><a href="#{i}">{k+1} {tt}</a></li>' for k,(i,tt) in enumerate(toc))
    secs=''.join(f'<section id="{sid}"><h2>{tt}</h2><p class="jp-sub">{jp}</p>{body}</section>' for sid,tt,jp,body in t['sections'])
    ex=''.join(f'<article class="q"><div class="q-head"><b>例题 {k+1}　{e[0]}</b></div>{e[1]}<details><summary>解答</summary><div class="ans">{e[2]}</div></details></article>' for k,e in enumerate(t['examples']))
    pr=''
    for k,p in enumerate(t['problems']):
        opts=''.join(f'<li>{MARK[j]} {o}</li>' for j,o in enumerate(p['opts']))
        pr+=(f'<article class="q" id="p{k+1}"><div class="q-head"><b>问 {k+1}</b>{'<span class="origin hf">原创 · 过去问高频题型</span>' if p.get("new") else '<span class="origin">原创 · EJU 风格</span>'}</div><p>{p["q"]}</p><ol class="opts">{opts}</ol>'
             f'<details><summary>解答</summary><div class="ans"><p><strong>正解：{MARK[p["ans"]]}</strong></p>{p["sol"]}</div></details></article>')
    terms=''.join(f'<tr><td>{a}</td><td lang="ja">{b}</td><td class="kana" lang="ja">{c}</td></tr>' for a,b,c in t['terms'])
    ch = AREA_CH.get(t['area'])
    if ch:
        kicker = f'EJU 物理 · 第 {ch} 章'
        map_href = f'{SITE_PATH}physics/?ch={ch}#map'
        map_lab = f'在知识导图中查看第 {ch} 章'
        map_cap = f'知识导图<span class="hero-map-dot"> · </span><span class="hero-map-ch">第 {ch} 章</span>'
        thumb = _map_thumb(t['slug'])
    else:
        kicker = f'EJU 物理 · {t["area"]}'
        map_href = f'{SITE_PATH}physics/#map'
        map_lab = '回到知识导图'
        map_cap = '知识导图'
        thumb = _map_thumb(None)
    map_link = f'<a class="hero-map-a" href="{map_href}" aria-label="{map_lab}">{thumb}<span class="hero-map-cap">{map_cap}</span></a>'
    if t.get('hero'):
        formulas = ''.join(f'$${h}$$' for h in t['hero'])
        hero_f = f'<div class="hero-formula"><p class="hero-fk">代表式</p>{formulas}</div>'
    else:
        hero_f = ''
    hero_aside = f'<div class="hero-aside">{map_link}{hero_f}</div>'
    EX=f'''<section id="examples"><h2>例题</h2><p class="jp-sub">例題</p>{ex}</section>''' if t['examples'] else ''
    PR=f'''<section id="practice"><h2>练习题</h2><p class="jp-sub">練習問題（{len(t["problems"])} 题，选择题；取 $g=9.8\\,\\mathrm{{m/s^2}}$，另有说明除外）</p>{pr}</section>''' if t['problems'] else ''
    TE=f'''<section id="terms"><h2>术语对照</h2><p class="jp-sub">用語</p><div class="tw"><table><tr><th>中文</th><th>日本語</th><th>读法</th></tr>{terms}</table></div></section>''' if t['terms'] else ''
    return f'''<!DOCTYPE html><html lang="zh-CN" data-site="{SITE}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="color-scheme" content="light dark">
{HEADJS}<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<title>EJU 理科 物理 · {t["n"]} {t["zh"]}</title>{meta}<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" integrity="sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66uf4l5+" crossorigin="anonymous" referrerpolicy="no-referrer">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js" integrity="sha384-7zkQWkzuo3B5mTepMUcHkMB5jZaolc2xDwL6VFqjFALcbeS9Ggm/Yr2r3Dy4lfFg" crossorigin="anonymous" referrerpolicy="no-referrer"></script><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js" integrity="sha384-43gviWU0YVjaDtb/GhzOouOXtZMP/7XUzwPTstBeZFe/+rCMvRwr4yROQP43s0Xk" crossorigin="anonymous" referrerpolicy="no-referrer"></script><script defer src="../../assets/lazy-katex.js"></script><script defer src="../../assets/eju-ux.js"></script><script defer src="../../assets/demos.js?v=3"></script>
<link rel="stylesheet" href="../../assets/site.css"></head><body>
<a class="skip" href="#main">跳到正文</a><div id="cdn-note" hidden>公式库（KaTeX）未能加载，公式将显示为源码。请联网后刷新页面。</div>
<header class="hero"><div class="hero-in"><div class="hero-text"><p class="back"><a href="{SITE_PATH}physics/">← 物理目录</a></p><p class="eyebrow">{kicker}</p><h1>{t["zh"]}</h1><p class="hero-ja" lang="ja">{t["ja"]}</p><hr class="hero-rule" /><p class="lead">{t["lead"]}</p></div>{hero_aside}</div></header>
<div class="layout"><nav class="toc" aria-label="目录"><div style="flex:1;min-width:0"><p class="toc-title">目录</p><ol>{tochtml}</ol></div><button class="chip theme-btn" id="theme" type="button">深色</button></nav>
<main id="main">{secs}{demosec(t)}{EX}{PR}{TE}
<footer>原创讲义与题目，非 JASSO 官方内容。按《日本留学試験 理科シラバス（物理）》编排。</footer></main></div>
{TOGGLEJS}<script>(function(){{
var L=[].slice.call(document.querySelectorAll('nav.toc a'));if('IntersectionObserver'in window){{var io=new IntersectionObserver(function(es){{es.forEach(function(e){{if(e.isIntersecting)L.forEach(function(a){{a.classList.toggle('on',a.getAttribute('href')==='#'+e.target.id)}})}})}},{{rootMargin:'-20% 0px -70% 0px'}});document.querySelectorAll('main section').forEach(function(x){{io.observe(x)}})}}
window.addEventListener('load',function(){{if(!window.renderMathInElement){{document.getElementById('cdn-note').hidden=false;return}}renderMathInElement(document.body,{{delimiters:[{{left:'$$',right:'$$',display:true}},{{left:'$',right:'$',display:false}}],throwOnError:false}})}})}})();</script>
<script src="../../assets/nav.js"></script></body></html>'''
for t in TOPICS:
    os.makedirs(f'topics/{t["slug"]}',exist_ok=True); open(f'topics/{t["slug"]}/index.html','w').write(siteenv.with_banner(CFG, page(t), f'topics/{t["slug"]}/'))
# HOME：首页目次（像书的目录：左侧章号，右侧章名与专题，点线引到右侧的题数・过去问・星级；附录列资料与工具；最后是过去问频度表）。样式在 site.css 末尾「首页目次」块，无脚本
def _stars(s): return f'<span class="stars" aria-label="重要度 {len(s)}/3">{s}</span>'
def _entry(t, label=None, meta=None):
    if meta is None:
        meta = (f'{len(t["problems"])} 题' if t['problems'] else t.get('sub', '常用数据速查')) + (f'<span class="ct-sep"> · </span>过去问 {t["bank"]["n"]} {_stars(t["bank"]["stars"])}' if t.get('bank') else '')
    return (f'<li><a href="topics/{t["slug"]}/"><span class="ct-n">{t["n"]:02d}</span><span class="ct-t"><span class="ct-zh">{label or t["zh"]}</span>'
            f'<span class="ct-ja" lang="ja">{t["ja"]}</span></span><span class="ct-dots" aria-hidden="true"></span><span class="ct-m">{meta}</span></a></li>')
_parts = []
for k, (area, ja, intro) in enumerate(CHAPTERS, 1):
    ts = [t for t in TOPICS if t['area'] == area]
    nb = sum(t['bank']['n'] for t in ts if t.get('bank'))
    _parts.append(f'<li class="ct-part"><p class="ct-no" aria-hidden="true">{k}</p><div class="ct-body">'
                  f'<h3 id="ch-{k}"><span class="ct-vh">第 {k} 章　</span>{area}<span class="ct-chja" lang="ja">{ja}</span></h3>'
                  f'<p class="ct-intro">{intro}<span class="ct-sum">{len(ts)} 个专题 · 过去问 {nb} 题</span></p>'
                  f'<ol class="ct-list">{"".join(_entry(t) for t in ts)}</ol></div></li>')
_D = next(t for t in TOPICS if t['slug'] == 'demos')
_CH_AREAS = {c[0] for c in CHAPTERS}
_appx = ''.join(_entry(t, f'互动演示总览（{t["demo_count"]} 个）', '全部演示一览') if t['slug'] == 'demos' else _entry(t)
                for t in TOPICS if t['area'] not in _CH_AREAS)
# MAP：知识导图 v4（内联 SVG，像古典星图）。中心「物理」，内圈五章（扇区角按专题数分配，单专题章有最小扇区），外圈各章讲解专题；
# 树枝是填充的锥形三次贝塞尔，虚线联系走中心同心的「轨道」弧。坐标全从 CHAPTERS / TOPICS / XLINKS / MAPF 算，
# 末尾做几何检查（框、插图、标签、树枝、弧互不压），不过就报错退出，免得画出压字的图。颜色全用 CSS 变量（site.css 首页目次块）
XLINKS = [  # (slug, slug, 标签)
 ('energy', 'thermal', '能量守恒'), ('circular-shm', 'waves', '简谐振动与波'), ('waves', 'sound', '机械波'), ('waves', 'light', '波动光学'),
 ('current', 'magnetism', '电流的磁场'), ('magnetism', 'induction-ac', '电磁感应'), ('light', 'atomic', '光电效应'), ('gravitation', 'circular-shm', '圆周运动'),
]
MAPF = {  # 各专题代表式（均见 17_formulas）：_x 下标、^x 上标；拉丁与希腊变量斜体，数字、算符、Δ、½ 直立
 'motion': 'v = v_0 + at', 'force': 'F = ma', 'energy': 'K = ½mv^2', 'momentum': 'p = mv', 'circular-shm': 'a = v^2/r',
 'gravitation': 'F = GMm/r^2', 'thermal': 'pV = nRT', 'waves': 'v = fλ', 'sound': 'f = mv/(2L)', 'light': '1/a + 1/b = 1/f',
 'electric-field': 'E = kQ/r^2', 'current': 'V = RI', 'magnetism': 'F = IBℓ', 'induction-ac': 'V = −N ΔΦ/Δt', 'atomic': 'E = hν',
}
_IT = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZλνΦℓ')
def _tw(s, fs): return sum(fs if ord(ch) > 0x2E7F else fs * .58 for ch in s)
def _fml(s, x, y):  # 公式 → <text>/<tspan>；上下标用 dy 升降（Firefox 不认 tspan 的 baseline-shift），之后归位
    runs, i = [], 0
    while i < len(s):
        c = s[i]
        if c in '_^': runs.append((c, s[i + 1])); i += 2; continue
        k = 'i' if c in _IT else 'r'
        if runs and runs[-1][0] == k: runs[-1] = (k, runs[-1][1] + c)
        else: runs.append((k, c))
        i += 1
    out, cur, w = [], 0, 0
    for k, t in runs:
        want = {'_': 4, '^': -6.5}.get(k, 0); cls = {'i': 'mp-fi', '_': 'mp-fs', '^': 'mp-fs'}.get(k)
        out.append('<tspan' + (f' class="{cls}"' if cls else '') + (f' dy="{want - cur:g}"' if want != cur else '') + f'>{html.escape(t)}</tspan>')
        cur = want; w += len(t) * (.4 if k in '_^' else .56)
    return f'<text class="mp-f" x="{x:.1f}" y="{y:.1f}" text-anchor="middle">{"".join(out)}</text>', w
# 线描插图：(x, y) 是左上角，s 是边长；只有细线，个别小点实心
def _ico(x, y, s, cls, body): return f'<g class="mp-ic {cls}" aria-hidden="true">{body(lambda u, v: f"{x + u * s:.1f} {y + v * s:.1f}")}</g>'
def _icon_incline(x, y, s, cls):  # 斜面 + 滑块 + 地面剖线 + 倾角弧
    def b(P):
        a = math.atan2(.54, .88); d, n = (math.cos(a), math.sin(a)), (math.sin(a), -math.cos(a)); m, k = (.06 + .88 * .42, .3 + .54 * .42), .24
        q = [(m[0] - d[0] * k / 2, m[1] - d[1] * k / 2), (m[0] + d[0] * k / 2, m[1] + d[1] * k / 2)]; q += [(q[1][0] + n[0] * k, q[1][1] + n[1] * k), (q[0][0] + n[0] * k, q[0][1] + n[1] * k)]
        r = .17; e = (.94 - r * math.cos(a), .84 - r * math.sin(a))
        return (f'<path d="M{P(.06, .84)}L{P(.94, .84)}L{P(.06, .3)}Z"/><path d="M{P(*q[0])}' + ''.join(f'L{P(*p)}' for p in q[1:]) + 'Z"/>'
                f'<path class="mp-thin" d="' + ''.join(f'M{P(u, .84)}L{P(u - .07, .95)}' for u in (.16, .3, .44, .58, .72, .86)) + f'"/>'
                f'<path class="mp-thin" d="M{P(.94 - r, .84)}A{r * s:.1f} {r * s:.1f} 0 0 1 {P(*e)}"/>')
    return _ico(x, y, s, cls, b)
def _icon_piston(x, y, s, cls):  # 气缸（右端开口）+ 活塞 + 活塞杆 + 把手，缸内几粒气体分子
    return _ico(x, y, s, cls, lambda P: f'<path d="M{P(.68, .28)}H{x + .08 * s:.1f}V{y + .76 * s:.1f}H{x + .68 * s:.1f}"/>'
                f'<path d="M{P(.46, .3)}H{x + .53 * s:.1f}V{y + .74 * s:.1f}H{x + .46 * s:.1f}Z"/><path d="M{P(.53, .52)}H{x + .9 * s:.1f}M{P(.9, .4)}V{y + .64 * s:.1f}"/>'
                + ''.join(f'<circle class="mp-dot" cx="{x + u * s:.1f}" cy="{y + v * s:.1f}" r="{.022 * s:.2f}"/>' for u, v in ((.17, .4), (.32, .45), (.22, .6), (.37, .65), (.28, .36), (.14, .68))))
def _icon_wave(x, y, s, cls):  # 两个波长的正弦波 + 基线 + 波长标尺 λ
    L, A, c = .42, .19, .58
    return _ico(x, y, s, cls, lambda P: f'<path class="mp-thin" d="M{P(.04, c)}H{x + .96 * s:.1f}"/><path d="M{P(.08, c)}'
                + ''.join(f'L{P(.08 + .84 * i / 64, c - A * math.sin(2 * math.pi * .84 * i / 64 / L))}' for i in range(1, 65)) + '"/>'
                f'<path class="mp-thin" d="M{P(.185, .3)}H{x + .605 * s:.1f}M{P(.185, .26)}V{y + .34 * s:.1f}M{P(.605, .26)}V{y + .34 * s:.1f}"/>'
                f'<text class="mp-it" x="{x + .395 * s:.1f}" y="{y + .25 * s:.1f}" text-anchor="middle">λ</text>')
def _icon_magnet(x, y, s, cls):  # 条形磁铁（N | S）+ 上下各两条磁力线、两侧轴线，箭头 N→S
    def chev(u, v, dx): return f'M{P_(u - dx, v - .035)}L{P_(u, v)}L{P_(u - dx, v + .035)}'
    P_ = lambda u, v: f'{x + u * s:.1f} {y + v * s:.1f}'
    return _ico(x, y, s, cls, lambda P: f'<path d="M{P(.22, .41)}H{x + .78 * s:.1f}V{y + .59 * s:.1f}H{x + .22 * s:.1f}Z M{P(.5, .41)}V{y + .59 * s:.1f}"/>'
                f'<path class="mp-thin" d="M{P(.22, .45)}C{P(.02, .05)} {P(.98, .05)} {P(.78, .45)}M{P(.26, .41)}C{P(.22, .2)} {P(.78, .2)} {P(.74, .41)}'
                f'M{P(.22, .55)}C{P(.02, .95)} {P(.98, .95)} {P(.78, .55)}M{P(.26, .59)}C{P(.22, .8)} {P(.78, .8)} {P(.74, .59)}'
                f'M{P(.22, .5)}H{x + .03 * s:.1f}M{P(.78, .5)}H{x + .97 * s:.1f}{chev(.53, .15, .04)}{chev(.53, .85, .04)}{chev(.08, .5, -.04)}{chev(.89, .5, -.04)}"/>'
                f'<text class="mp-pole" x="{x + .36 * s:.1f}" y="{y + .535 * s:.1f}" text-anchor="middle">N</text><text class="mp-pole" x="{x + .64 * s:.1f}" y="{y + .535 * s:.1f}" text-anchor="middle">S</text>')
def _icon_atom(x, y, s, cls):  # 玻尔模型：原子核 + 两圈轨道 + 电子
    c = (x + s / 2, y + s / 2); e = lambda r, a: (c[0] + r * s * math.cos(math.radians(a)), c[1] + r * s * math.sin(math.radians(a)))
    return _ico(x, y, s, cls, lambda P: f'<circle cx="{c[0]:.1f}" cy="{c[1]:.1f}" r="{.07 * s:.1f}"/><circle class="mp-thin" cx="{c[0]:.1f}" cy="{c[1]:.1f}" r="{.24 * s:.1f}"/>'
                f'<circle class="mp-thin" cx="{c[0]:.1f}" cy="{c[1]:.1f}" r="{.44 * s:.1f}"/>'
                + ''.join(f'<circle class="mp-dot" cx="{px:.1f}" cy="{py:.1f}" r="{.04 * s:.1f}"/>' for px, py in (e(.24, -50), e(.44, 160), e(.44, 30))))
_ICONS = [_icon_incline, _icon_piston, _icon_wave, _icon_magnet, _icon_atom]
def _map():
    _L = _map_layout()
    W, H, CX, CY = _L['W'], _L['H'], _L['CX'], _L['CY']
    R0, R1, R2, LIM = _L['R0'], _L['R1'], _L['R2'], _L['LIM']
    NR, IS = 42, 58  # 章节点半径、插图边长
    FN, FF, FL, BH, GAP = 18, 16, 15.5, 58, 11  # 专题名字号、公式字号、联系标签字号、专题框高、框离星点
    LANES = [324, 305, 286]  # 联系弧走的同心轨道（外→内），都在章节点外缘 R1+NR 与专题环之间
    E = html.escape
    rad = math.radians
    def pol(r, a): return (CX + r * math.sin(rad(a)), CY - r * math.cos(rad(a)))
    def ang(p): return math.degrees(math.atan2(p[0] - CX, CY - p[1])) % 360
    def f(p): return f'{p[0]:.1f} {p[1]:.1f}'
    def bez(p, t): return tuple((1 - t) ** 3 * p[0][i] + 3 * (1 - t) ** 2 * t * p[1][i] + 3 * (1 - t) * t * t * p[2][i] + t ** 3 * p[3][i] for i in (0, 1))
    def samp(p, n=80): return [bez(p, i / n) for i in range(n + 1)]
    def taper(p, h0, h1):  # 锥形树枝：两条近似偏移的三次曲线在尖端收拢成填充路径（Tiller–Hanson 近似）
        def nrm(a, b):
            dx, dy = b[0] - a[0], b[1] - a[1]; l = math.hypot(dx, dy) or 1; return (-dy / l, dx / l)
        n0, n3 = nrm(p[0], p[1] if p[1] != p[0] else p[3]), nrm(p[2], p[3]); hs = [h0, h0 + (h1 - h0) / 3, h0 + 2 * (h1 - h0) / 3, h1]; ns = [n0, n0, n3, n3]
        L = [(q[0] + n[0] * h, q[1] + n[1] * h) for q, n, h in zip(p, ns, hs)]; R = [(q[0] - n[0] * h, q[1] - n[1] * h) for q, n, h in zip(p, ns, hs)]
        return f'M{f(L[0])}C{f(L[1])} {f(L[2])} {f(L[3])}L{f(R[3])}C{f(R[2])} {f(R[1])} {f(R[0])}Z'
    # 扇区、专题角与 _map_layout() 同一套
    cols, chA, sec, tA, tC = _L['cols'], _L['chA'], _L['sec'], dict(_L['tA']), dict(_L['tC'])
    box, star, twig = {}, {}, {}
    for sl, a in tA.items():  # 专题框：沿径向放在星点外侧（矩形支撑函数），框宽按题名和公式宽度
        t = next(t for t in TOPICS if t['slug'] == sl); P = pol(R2, a); star[sl] = P
        w = max(_tw(t['zh'], FN), _fml(MAPF[sl], 0, 0)[1] * FF) + 30
        u = (math.sin(rad(a)), -math.cos(rad(a))); d = GAP + abs(u[0]) * w / 2 + abs(u[1]) * BH / 2
        box[sl] = (P[0] + u[0] * d - w / 2, P[1] + u[1] * d - BH / 2, w, BH)
        c = tC[sl]; Q = pol(R1, chA[c]); da = a - chA[c]
        twig[sl] = (Q, pol(R1 + .32 * (R2 - R1), chA[c] + .55 * da), pol(R2 - .5 * (R2 - R1), a), P)
    chP = [pol(R1, a) for a in chA]
    trunk = [(pol(0, a), pol(.4 * R1, a - 7), pol(.72 * R1, a - 2), pol(R1, a)) for a in chA]
    # 几何对象：每样东西 = (种类, 归属, 形状)；形状是矩形或采样点
    def rhit(a, b, m=0): return a[0] - m < b[0] + b[2] and b[0] - m < a[0] + a[2] and a[1] - m < b[1] + b[3] and b[1] - m < a[1] + a[3]
    def pin(p, r, m=0): return r[0] - m < p[0] < r[0] + r[2] + m and r[1] - m < p[1] < r[1] + r[3] + m
    curves = [('trunk', c, samp(p)) for c, p in enumerate(trunk)] + [('twig', sl, samp(p)) for sl, p in twig.items()]
    rects = [('box', sl, b) for sl, b in box.items()] + [('node', c, (p[0] - NR, p[1] - NR, 2 * NR, 2 * NR)) for c, p in enumerate(chP)] + [('root', None, (CX - R0, CY - R0, 2 * R0, 2 * R0))]
    # 插图：放在内圈（中心圆与章环之间），本章树干旁；从候选位置里挑第一个不压任何东西的
    icon = []
    for c, a in enumerate(chA):
        for r, da in [(r, s * da) for da in (24, 28, 20, 32) for s in (1, -1) for r in (132, 122, 142)]:
            p = pol(r, a + da); rc = (p[0] - IS / 2, p[1] - IS / 2, IS, IS)
            if any(rhit(rc, o[2], 8) for o in rects + icon): continue
            if any(pin(q, rc, 7) for _, _, pts in curves for q in pts): continue
            icon.append(('icon', c, rc)); break
        else: raise SystemExit(f'导图：第 {c + 1} 章的插图放不下')
    rects += icon
    # 联系弧：两端星点 → 平滑转入某条同心轨道 → 沿圆弧走 → 转出到另一端。短的先挑外轨道；标签沿弧写（textPath），挑没有树枝穿过的一段
    nm = {t['slug']: t['zh'] for t in TOPICS}
    xl, lanes_used, labels = [], {r: [] for r in LANES}, []
    def lab_hits(rl, lo, hi, pts):  # 标签所占的环形扇区里有没有点
        for q in pts:
            r = math.hypot(q[0] - CX, q[1] - CY)
            if rl - 11 < r < rl + 11 and (ang(q) - lo) % 360 < (hi - lo) % 360: return True
        return False
    order = sorted([x for x in XLINKS if x[0] in tA and x[1] in tA], key=lambda x: min((tA[x[1]] - tA[x[0]]) % 360, (tA[x[0]] - tA[x[1]]) % 360))
    for a, b, s in XLINKS:
        if a not in tA or b not in tA: print('map: skip link', a, b)
    tree = [q for _, _, ps in curves for q in ps]
    def windows(x, others):  # 某条弧上可放标签的起始角，按离弧中点的远近排（尽量避开左右两侧，那里字会竖起来）
        a, b, s, ta, span, rl, dl, lw = x[:8]
        lo_, hi_ = ta + dl / 2 + .5, ta + span - dl / 2 - .5 - lw; mid = ta + span / 2 - lw / 2
        for lo in sorted([lo_ + (hi_ - lo_) * i / 40 for i in range(41)], key=lambda v: abs(v - mid) + 25 * (abs(math.sin(rad(v + lw / 2))) > .8)):
            if not lab_hits(rl, lo % 360, (lo + lw) % 360, others): yield lo
    for a, b, s in order:  # 第一步：分轨道（短弧优先占外轨；同一轨道只许首尾相接；要留得下标签且那段没有树枝）
        if (tA[b] - tA[a]) % 360 > 180: a, b = b, a
        ta, span = tA[a], (tA[b] - tA[a]) % 360
        for rl in LANES:
            if any(((s2 - ta) % 360 < span - .5) or ((ta - s2) % 360 < (e2 - s2) % 360 - .5) for s2, e2 in lanes_used[rl]): continue
            dl = math.degrees((R2 - rl) * .75 / rl); lw = math.degrees((_tw(s, FL) + 8) / rl)
            if span - dl < lw + 1: continue
            A, B = star[a], star[b]; Qa, Qb = pol(rl, ta + dl), pol(rl, ta + span - dl)
            ca = (A, pol(R2 - .55 * (R2 - rl), ta), pol(rl, ta + .5 * dl), Qa); cb = (Qb, pol(rl, ta + span - .5 * dl), pol(R2 - .55 * (R2 - rl), ta + span), B)
            pts = samp(ca, 40) + [pol(rl, ta + dl + (span - 2 * dl) * i / 120) for i in range(121)] + samp(cb, 40)
            x = [a, b, s, ta, span, rl, dl, lw, f'M{f(A)}C{f(ca[1])} {f(ca[2])} {f(Qa)}A{rl} {rl} 0 0 1 {f(Qb)}C{f(cb[1])} {f(cb[2])} {f(B)}', pts]
            if next(windows(x, tree), None) is None: continue
            lanes_used[rl].append((ta % 360, (ta + span) % 360)); xl.append(x); break
        else: raise SystemExit(f'导图：{a}–{b} 的联系弧找不到轨道')
    for x in sorted(xl, key=lambda x: x[4] - x[6]):  # 第二步：所有弧定下后再放标签（避开树枝、别的弧、已放的标签）
        others = tree + [q for y in xl if y is not x for q in y[9]]
        for lo in windows(x, others):
            if any(abs(L[0] - x[5]) < 25 and ((lo - L[1]) % 360 < (L[2] - L[1]) % 360 + 2 or (L[1] - lo) % 360 < x[7] + 2) for L in labels): continue  # 相邻轨道的标签不上下叠
            labels.append((x[5], lo % 360, (lo + x[7]) % 360, x[2], x[0], x[1])); break
        else: raise SystemExit(f'导图：放不下联系标签「{x[2]}」')
    xl = [(x[0], x[1], x[2], x[8], x[5], x[9]) for x in xl]
    if not (R1 + NR + 2 < LANES[-1] - 11 and LANES[0] + 11 < R2 - 5): raise SystemExit('导图：联系标签的环带会压到章节点或星点')  # 框在 R2+GAP 之外、插图在 R1 之内，与标签环带天然分开
    # 总检查：框与框、框/节点/插图与所有曲线、框不出图框
    allpts = [(k, o, q) for k, o, ps in curves for q in ps] + [('xl', (x[0], x[1]), q) for x in xl for q in x[5]]
    for i, (k1, o1, r1) in enumerate(rects):
        if not pin((r1[0], r1[1]), (40, 40, W - 80, H - 130)) or not pin((r1[0] + r1[2], r1[1] + r1[3]), (40, 40, W - 80, H - 130)): raise SystemExit(f'导图：{k1} {o1} 超出图框')
        for k2, o2, r2 in rects[i + 1:]:
            if rhit(r1, r2, 6): raise SystemExit(f'导图：{k1} {o1} 与 {k2} {o2} 重叠')
        for k, o, q in allpts:
            own = (k1 == 'box' and o == o1) or (k1 == 'node' and k in ('trunk', 'twig') and (o == o1 or (k == 'twig' and tC[o] == o1))) or (k1 == 'root' and k == 'trunk')
            if not own and pin(q, r1, 2 if k == 'xl' else 3): raise SystemExit(f'导图：{k} {o} 穿过 {k1} {o1}')
    far = [(k, o, [q for q in ps if all(math.hypot(q[0] - p[0], q[1] - p[1]) > NR + 2 for p in chP + [(CX, CY)])]) for k, o, ps in curves]
    for i, (k1, o1, p1) in enumerate(far):  # 节点之外，树干、树枝互不相碰
        for k2, o2, p2 in far[i + 1:]:
            if any(abs(q[0] - p[0]) < 3 and abs(q[1] - p[1]) < 3 for q in p1 for p in p2): raise SystemExit(f'导图：{k1} {o1} 与 {k2} {o2} 相碰')
    for i, (_, sl, ps) in enumerate(c for c in curves if c[0] == 'twig'):  # 联系弧不得长段贴着树枝走
        for x in xl:
            if sl in x[:2]: continue
            run, prev = 0, None
            for q in x[5]:  # 弧与树枝相距 < 3 的连续长度；正交穿过约 6–8，顺着走会远超 16
                close = any(math.hypot(q[0] - p[0], q[1] - p[1]) < 3 for p in ps)
                run = run + math.hypot(q[0] - prev[0], q[1] - prev[1]) if close and prev else 0
                prev = q if close else None
                if run > 16: raise SystemExit(f'导图：{x[0]}–{x[1]} 的弧贴着 {sl} 的树枝走')
    # 输出
    out = [f'<svg class="mp-svg" viewBox="0 0 {W} {H}" aria-labelledby="mp-svgt"><title id="mp-svgt">物理知识导图</title>', '<g class="mp-grid" aria-hidden="true">']
    out.append(''.join(f'<circle cx="{CX}" cy="{CY}" r="{r}"/>' for r in (R0 + 30, 160, R1, 280, R2, 420, 490)) + f'<circle class="mp-lim" cx="{CX}" cy="{CY}" r="{LIM}"/><circle class="mp-lim" cx="{CX}" cy="{CY}" r="{LIM - 9}"/>')
    out.append('<path d="' + ''.join(f'M{f(pol(R0 + 8, a))}L{f(pol(LIM - 9, a))}' for a in range(0, 360, 30)) + ''.join(f'M{f(pol(LIM - 9, a))}L{f(pol(LIM - (0 if a % 30 == 0 else 4 if a % 10 else 1.5), a))}' for a in range(0, 360, 5)) + '"/></g>')
    m1, m2 = 14, 21
    out.append(f'<g class="mp-frame" aria-hidden="true"><rect x="{m1}" y="{m1}" width="{W - 2 * m1}" height="{H - 2 * m1}"/><rect class="mp-thin" x="{m2}" y="{m2}" width="{W - 2 * m2}" height="{H - 2 * m2}"/><path class="mp-thin" d="'
               + ''.join(f'M{x0 + sx * 30} {y0 + sy * 54}V{y0 + sy * 30}H{x0 + sx * 54}' for x0, y0, sx, sy in ((0, 0, 1, 1), (W, 0, -1, 1), (0, H, 1, -1), (W, H, -1, -1))) + '"/>'
               + ''.join(f'<rect class="mp-cn" x="{x0 - 5}" y="{y0 - 5}" width="10" height="10"/><rect class="mp-cnd" x="{x0 - 2}" y="{y0 - 2}" width="4" height="4"/>' for x0 in ((m1 + m2) / 2, W - (m1 + m2) / 2) for y0 in ((m1 + m2) / 2, H - (m1 + m2) / 2)))
    cy2 = H - 64; ja, zh = '図　物理の体系', f'物理知识体系　{len(CHAPTERS)} 章 · {sum(len(c) for c in cols)} 个专题'; hw = _tw(ja, 19) * 1.2 / 2 + 22
    out.append(f'<path class="mp-thin" d="M{CX - hw - 70:.0f} {cy2 - 6}H{CX - hw:.0f}M{CX - hw - 70:.0f} {cy2 - 2}H{CX - hw:.0f}M{CX + hw:.0f} {cy2 - 6}H{CX + hw + 70:.0f}M{CX + hw:.0f} {cy2 - 2}H{CX + hw + 70:.0f}"/>'
               f'<text class="mp-cap" x="{CX}" y="{cy2}" text-anchor="middle" lang="ja">{ja}</text><text class="mp-cap2" x="{CX}" y="{cy2 + 26}" text-anchor="middle">{E(zh)}</text></g>')
    out.append('<defs>' + ''.join(  # 标签路径：上半圈顺时针、下半圈逆时针，文字始终正着读；半径错开半个字高让字居中压在弧上
        (lambda rl, lo, hi, m, flip: f'<path id="mp-lp{i}" d="M{f(pol(rl + (5 if flip else -5), hi if flip else lo))}A{rl + (5 if flip else -5)} {rl + (5 if flip else -5)} 0 0 {0 if flip else 1} {f(pol(rl + (5 if flip else -5), lo if flip else hi))}"/>')
        (L[0], L[1], L[2], 0, 90 < (L[1] + ((L[2] - L[1]) % 360) / 2) % 360 < 270) for i, L in enumerate(labels)) + '</defs>')
    lab_of = {(L[4], L[5]): i for i, L in enumerate(labels)}
    out.append('<g class="mp-xls" aria-hidden="true">' + ''.join(
        f'<g class="mp-d mp-xl" data-a="{a}" data-b="{b}"><path d="{d}"/><text><textPath href="#mp-lp{lab_of[(a, b)]}" startOffset="50%" text-anchor="middle">{E(s)}</textPath></text></g>' for a, b, s, d, rl, _ in xl) + '</g>')
    for c, ((area, ja_, _), ts) in enumerate(zip(CHAPTERS, cols)):
        k = c + 1; cls = f'mp-c{k}'; ix = icon[c][2]
        out.append(f'<g class="mp-br {cls}">')
        out.append(f'<path class="mp-d mp-tr" data-ch="{k}" aria-hidden="true" d="{taper(trunk[c], 3.2, 1.7)}"/>')
        out += [f'<path class="mp-d mp-tw" data-ch="{k}" data-slug="{t["slug"]}" aria-hidden="true" d="{taper(twig[t["slug"]], 1.6, .35)}"/>' for t in ts]
        out.append(_ICONS[c](ix[0], ix[1], IS, 'mp-d').replace('<g class="mp-ic mp-d"', f'<g class="mp-ic mp-d" data-ch="{k}"', 1))
        p = chP[c]
        out.append(f'<a class="mp-d mp-chn" data-ch="{k}" href="#ch-{k}" aria-label="第 {k} 章 {area}，{len(ts)} 个专题"><title lang="ja">第 {k} 章 · {ja_}</title>'
                   f'<circle class="mp-nb" cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="{NR}"/><circle class="mp-nr" cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="{NR - 4}"/>'
                   f'<text class="mp-chk" x="{p[0]:.1f}" y="{p[1] - 11:.1f}" text-anchor="middle">第 {k} 章</text><text class="mp-ch" x="{p[0]:.1f}" y="{p[1] + 16:.1f}" text-anchor="middle">{E(area)}</text></a>')
        for t in ts:
            sl = t['slug']; bx, by, bw, bh = box[sl]; P = star[sl]
            out.append(f'<a class="mp-d mp-tn" data-ch="{k}" data-slug="{sl}" href="topics/{sl}/" aria-label="{t["n"]:02d} {E(t["zh"])}：{E(MAPF[sl].replace("_0", "₀").replace("^2", "²"))}"><title lang="ja">{E(t["ja"])}</title>'
                       f'<circle class="mp-star" cx="{P[0]:.1f}" cy="{P[1]:.1f}" r="3.4"/><rect class="mp-box" x="{bx:.1f}" y="{by:.1f}" width="{bw:.1f}" height="{bh}"/>'
                       f'<text class="mp-t" x="{bx + bw / 2:.1f}" y="{by + 25:.1f}" text-anchor="middle">{E(t["zh"])}</text>{_fml(MAPF[sl], bx + bw / 2, by + 47)[0]}</a>')
        out.append('</g>')
    out.append(f'<a class="mp-root" href="#chapters" aria-label="物理：回到目次"><title lang="ja">物理</title><circle class="mp-rb" cx="{CX}" cy="{CY}" r="{R0}"/><circle class="mp-rr" cx="{CX}" cy="{CY}" r="{R0 - 5}"/>'
               f'<text class="mp-rt" x="{CX + 4}" y="{CY + 10}" text-anchor="middle">物理</text></a></svg>')
    legend = ''.join(f'<li><a href="topics/{a}/">{E(nm[a])}</a> — <a href="topics/{b}/">{E(nm[b])}</a>：{E(s)}</li>' for a, b, s in XLINKS if a in tA and b in tA)
    return ''.join(out), legend
MAPSVG, MAPLEGEND = _map()
def _mapdata():
    chs, tps = {}, {}
    for k, (area, ja, intro) in enumerate(CHAPTERS, 1):
        chs[str(k)] = {'zh': area, 'ja': ja, 'intro': intro, 'href': f'#ch-{k}'}
        for top in TOPICS:
            if top.get('area') == area and top.get('problems'):
                tps[top['slug']] = {'zh': top['zh'], 'ja': top['ja'], 'intro': top.get('lead') or '', 'href': f'topics/{top["slug"]}/', 'ch': str(k), 'children': mapkids.kids_from_sections(top.get('sections') or [], top['slug'])}
    s = json.dumps({'subject': '物理', 'chapters': chs, 'topics': tps}, ensure_ascii=False, separators=(',', ':'))
    return s.replace('<', '\\u003c')
MAPDATA = _mapdata()
_nk=sum(len(v.get('children') or []) for v in json.loads(MAPDATA.replace('\\u003c','<')).get('topics',{}).values())
print('map kids:', _nk)

RANKTBL=''.join(f'<tr><td><a href="topics/{t["slug"]}/">{t["n"]} {t["zh"]}</a></td><td>{" ".join(t["bank"]["codes"])}</td><td class="num">{t["bank"]["n"]}</td><td class="stars">{t["bank"]["stars"]}</td></tr>' for t in sorted([t for t in TOPICS if t.get('bank')],key=lambda t:-t['bank']['n']))
_np = sum(len(t['problems']) for t in TOPICS); _nb = sum(t['bank']['n'] for t in TOPICS if t.get('bank')); _nt = sum(1 for t in TOPICS if t['problems'])
_SITES = [('https://eju.feather0.com/', '四科总入口'), ('https://math.eju.feather0.com/', 'EJU 数学コース2 网站'), ('https://chemistry.eju.feather0.com/', 'EJU 理科 化学 网站'), ('https://biology.eju.feather0.com/', 'EJU 理科 生物 网站')]
PREFACE = ('这是按 EJU 理科（物理）大纲整理的中文讲义。建议先按章节读讲解和例题，再做练习；公式速查、易错点和术语对照可以随时翻。'
           '各页开头的出题频度来自 2005–2025 年试卷的统计，拿不准先看哪一章时，可以参考它，也可以直接看本页最后的频度表。')
os.makedirs('physics', exist_ok=True)
course_home = f'''<!doctype html><html lang="zh-Hans" data-site="{SITE}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light dark">
{HEADJS}
<title>EJU 理科 物理 全专题讲解</title>{headmeta(SITE_NAME + " 全专题讲解", SITE_DESC, "physics/", "")}
<link rel="stylesheet" href="assets/site.css"></head><body class="home contents">
<a class="skip" href="#chapters">跳到目次</a>
<div class="ct-wrap">
<header class="ct-head">
<div class="ct-top"><p class="ct-kicker"><a href="https://eju.feather0.com/">四科总入口</a> ／ EJU 理科 · 物理</p><button class="chip theme-btn" id="theme" type="button">深色</button></div>
<h1>物理<br>全专题讲解</h1>
<div class="ct-preface"><p>{PREFACE}</p>
<p class="ct-facts">共 {_nt} 个讲解专题、{_np} 道原创练习题、{_D["demo_count"]} 个互动演示；过去问 {_nb} 题已按专题归类。</p></div>
</header>
<main id="main">
<section id="chapters" aria-labelledby="h-chapters"><h2 id="h-chapters" class="ct-label">目次<span lang="ja">もくじ</span></h2>
<ol class="ct-parts">{"".join(_parts)}</ol></section>
<section id="map" aria-labelledby="h-map"><div class="ct-part"><p class="ct-no ct-no-a" aria-hidden="true">图</p><div class="ct-body">
<h2 id="h-map">知识导图<span class="ct-chja" lang="ja">知識マップ</span></h2>
<p class="ct-intro">中心「物理」分出五章，每章一色，外圈是各章的讲解专题和一条代表式；虚线弧标出专题之间的重要联系。点章节或专题可放大查看简介，再从说明卡进入对应页。</p></div>
<figure class="mp"><p class="mp-hint" id="mp-hint">点节点可放大查看简介。电脑上按住 Ctrl 或 ⌘ 滚动缩放；点进图中后可拖动。触屏用双指缩放。Esc 或「返回」还原。</p>
<div class="mp-scroll" role="region" aria-label="知识导图" aria-describedby="mp-hint">{MAPSVG}</div>
<figcaption id="mp-cap">物理知识导图：中心「物理」分出五章，各章外圈列讲解专题与代表式。虚线弧所示的联系：<ul class="mp-legend">{MAPLEGEND}</ul></figcaption></figure><script type="application/json" id="mp-data">{MAPDATA}</script></div></section>
<section id="appendix" aria-labelledby="h-appendix"><div class="ct-part"><p class="ct-no ct-no-a" aria-hidden="true">附</p><div class="ct-body">
<h2 id="h-appendix">资料・速查・工具<span class="ct-chja" lang="ja">資料・ツール</span></h2>
<p class="ct-intro">考前查公式、对术语、找易错点；站内搜索覆盖题目、讲解、公式与数据。</p>
<ol class="ct-list">{_appx}</ol></div></div></section>
<section id="ranking" aria-labelledby="h-rank"><div class="ct-part"><p class="ct-no ct-no-a" aria-hidden="true">表</p><div class="ct-body">
<h2 id="h-rank">过去问出题频度<span class="ct-chja" lang="ja">出題頻度</span></h2>
<p class="ct-intro">依据 2005–2025 年 38 份 EJU 试卷的按知识点分类原题册统计，按题数从多到少排列（各页开头另有详细的「出题频度」表）。</p>
<div class="tw"><table><thead><tr><th scope="col">专题页</th><th scope="col">原题册专题</th><th scope="col" class="num">题数</th><th scope="col">重要度</th></tr></thead><tbody>{RANKTBL}</tbody></table></div></div></div></section>
</main>
<footer class="ct-foot"><p class="ct-sites">相关课程：{"".join(f'<a href="{u}">{a}</a>' for u, a in _SITES)}</p><p>原创讲义与题目，非 JASSO 官方内容。按《日本留学試験 理科シラバス（物理）》编排。</p></footer>
</div>
{TOGGLEJS}<script src="assets/vendor/d3-eju.min.js"></script><script src="assets/map.js"></script><script src="assets/nav.js"></script></body></html>'''
# The existing lessons and shared assets are still served from the host root.
course_home = course_home.replace('"assets/', f'"{SITE_PATH}assets/').replace('"topics/', f'"{SITE_PATH}topics/')
open('physics/index.html','w').write(siteenv.with_banner(CFG, course_home, 'physics/'))
# 404：Cloudflare Pages 对任意深度的不存在路径都返回它，所以资源用站点绝对路径
open('404.html','w').write(siteenv.with_banner(CFG, f'''<!doctype html><html lang="zh-Hans" data-site="{SITE}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light dark">
{HEADJS}<title>页面不存在 · {SITE_NAME}</title><meta name="robots" content="noindex"><link rel="icon" href="{SITE_PATH}assets/favicon.svg" type="image/svg+xml"><link rel="icon" href="{SITE_PATH}assets/favicon-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="{SITE_PATH}assets/apple-touch-icon.png">
<link rel="stylesheet" href="{SITE_PATH}assets/site.css"></head><body class="home nf"><main>
<div class="home-top"><p class="eyebrow">{SITE_NAME}</p><button class="chip theme-btn" id="theme" type="button">深色</button></div>
<p class="nf-code" aria-hidden="true">404</p><h1>页面不存在</h1><p>这个地址没有对应的页面：可能是链接写错了，或者页面已经移动。可以回到首页按专题查找，或用站内搜索。</p>
<p class="home-links"><a href="{SITE_PATH}physics/">← 回到 {SITE_NAME} 首页</a><a href="{SITE_PATH}topics/search/">站内搜索</a></p></main>
{TOGGLEJS}</body></html>''', ''))
nav=open('assets/nav.js').read().split('\n')
T=[dict(n=t['n'],slug=t['slug'],zh=t['zh'],ja=t['ja'],ready=True) for t in TOPICS]
nav[0]='(function(){var T='+json.dumps(T,ensure_ascii=False)+';'
nav='\n'.join(nav).replace('EJU コース2 全部专题','EJU 物理 全部专题').replace("(t.n==19?'19–20':t.n)","t.n")
open('assets/nav.js','w').write(nav)
print(len(TOPICS),'topics',sum(len(t['problems']) for t in TOPICS),'problems')

from _x import build_index
print('search index entries:',build_index(TOPICS))

siteenv.write_robots(CFG)
siteenv.finalize_tree(CFG)
