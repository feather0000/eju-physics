import importlib.util, glob, os, json, html, sys
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
SITE = 'physics'; SITE_NAME = 'EJU 理科 物理'; SITE_PATH = '/eju-physics/'; SITE_URL = 'https://feather0000.github.io' + SITE_PATH
SITE_DESC = '按 JASSO《日本留学試験 理科シラバス（物理）》编排：力学・热・波动・电磁气・原子。每页含要点讲解（中文 + 日语术语）、关键公式、原创例题和带解答的 EJU 风格选择题。'
def headmeta(title, desc, path, root):
    t, d = html.escape(title), html.escape(html.unescape(desc))
    return (f'<meta name="description" content="{d}">'
            f'<link rel="icon" href="{root}assets/favicon.svg" type="image/svg+xml"><link rel="icon" href="{root}assets/favicon-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="{root}assets/apple-touch-icon.png">\n'
            f'<meta property="og:type" content="website"><meta property="og:site_name" content="{SITE_NAME}"><meta property="og:locale" content="zh_CN"><meta property="og:title" content="{t}"><meta property="og:description" content="{d}"><meta property="og:url" content="{SITE_URL}{path}">'
            f'<meta property="og:image" content="{SITE_URL}assets/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="{SITE_NAME} · 全专题中文讲义">'
            f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{t}"><meta name="twitter:description" content="{d}"><meta name="twitter:image" content="{SITE_URL}assets/og.png">\n')
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
    hero=''.join(f'$${h}$$' for h in t['hero'])
    EX=f'''<section id="examples"><h2>例题</h2><p class="jp-sub">例題</p>{ex}</section>''' if t['examples'] else ''
    PR=f'''<section id="practice"><h2>练习题</h2><p class="jp-sub">練習問題（{len(t["problems"])} 题，选择题；取 $g=9.8\\,\\mathrm{{m/s^2}}$，另有说明除外）</p>{pr}</section>''' if t['problems'] else ''
    TE=f'''<section id="terms"><h2>术语对照</h2><p class="jp-sub">用語</p><div class="tw"><table><tr><th>中文</th><th>日本語</th><th>读法</th></tr>{terms}</table></div></section>''' if t['terms'] else ''
    return f'''<!DOCTYPE html><html lang="zh-CN" data-site="{SITE}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="color-scheme" content="light dark">
{HEADJS}<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<title>EJU 理科 物理 · {t["n"]} {t["zh"]}</title>{meta}<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" integrity="sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66uf4l5+" crossorigin="anonymous" referrerpolicy="no-referrer">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js" integrity="sha384-7zkQWkzuo3B5mTepMUcHkMB5jZaolc2xDwL6VFqjFALcbeS9Ggm/Yr2r3Dy4lfFg" crossorigin="anonymous" referrerpolicy="no-referrer"></script><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js" integrity="sha384-43gviWU0YVjaDtb/GhzOouOXtZMP/7XUzwPTstBeZFe/+rCMvRwr4yROQP43s0Xk" crossorigin="anonymous" referrerpolicy="no-referrer"></script><script defer src="../../assets/lazy-katex.js"></script><script defer src="../../assets/eju-ux.js"></script><script defer src="../../assets/demos.js?v=3"></script>
<link rel="stylesheet" href="../../assets/site.css"></head><body>
<a class="skip" href="#main">跳到正文</a><div id="cdn-note" hidden>公式库（KaTeX）未能加载，公式将显示为源码。请联网后刷新页面。</div>
<header class="hero"><div class="hero-in"><div class="hero-text"><p class="back"><a href="../../">← 目录</a></p><p class="eyebrow">EJU 理科 物理 · {t["area"]} · {t["ja"]}</p><h1>{t["n"]} {t["zh"]}</h1><p class="lead">{t["lead"]}</p></div><div class="hero-formula" aria-hidden="true">{hero}</div></div></header>
<div class="layout"><nav class="toc" aria-label="目录"><div style="flex:1;min-width:0"><p class="toc-title">目录</p><ol>{tochtml}</ol></div><button class="chip theme-btn" id="theme" type="button">深色</button></nav>
<main id="main">{secs}{demosec(t)}{EX}{PR}{TE}
<footer>原创讲义与题目，非 JASSO 官方内容。按《日本留学試験 理科シラバス（物理）》编排。</footer></main></div>
{TOGGLEJS}<script>(function(){{
var L=[].slice.call(document.querySelectorAll('nav.toc a'));if('IntersectionObserver'in window){{var io=new IntersectionObserver(function(es){{es.forEach(function(e){{if(e.isIntersecting)L.forEach(function(a){{a.classList.toggle('on',a.getAttribute('href')==='#'+e.target.id)}})}})}},{{rootMargin:'-20% 0px -70% 0px'}});document.querySelectorAll('main section').forEach(function(x){{io.observe(x)}})}}
window.addEventListener('load',function(){{if(!window.renderMathInElement){{document.getElementById('cdn-note').hidden=false;return}}renderMathInElement(document.body,{{delimiters:[{{left:'$$',right:'$$',display:true}},{{left:'$',right:'$',display:false}}],throwOnError:false}})}})}})();</script>
<script src="../../assets/nav.js"></script></body></html>'''
for t in TOPICS:
    os.makedirs(f'topics/{t["slug"]}',exist_ok=True); open(f'topics/{t["slug"]}/index.html','w').write(page(t))
# HOME：首页目次（像书的目录：左侧章号，右侧章名与专题，点线引到右侧的题数・过去问・星级；附录列资料与工具；最后是过去问频度表）。样式在 site.css 末尾「首页目次」块，无脚本
CHAPTERS = [  # area：日文名、一句章节提要
 ('力学', '力学', '从运动学到万有引力：受力分析、能量与动量守恒、圆周运动与简谐振动。'),
 ('热', '熱', '比热与热平衡、理想气体状态方程、热力学第一定律与热机效率。'),
 ('波动', '波動', '波的叠加与驻波，弦与气柱、多普勒效应，光的折射、透镜与干涉。'),
 ('电磁气', '電磁気', '电场与电容器、直流电路、电流的磁场与洛伦兹力、电磁感应与交流。'),
 ('原子', '原子', '光电效应与物质波、玻尔模型与能级、放射线、半衰期与核反应。'),
]
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
RANKTBL=''.join(f'<tr><td><a href="topics/{t["slug"]}/">{t["n"]} {t["zh"]}</a></td><td>{" ".join(t["bank"]["codes"])}</td><td class="num">{t["bank"]["n"]}</td><td class="stars">{t["bank"]["stars"]}</td></tr>' for t in sorted([t for t in TOPICS if t.get('bank')],key=lambda t:-t['bank']['n']))
_np = sum(len(t['problems']) for t in TOPICS); _nb = sum(t['bank']['n'] for t in TOPICS if t.get('bank')); _nt = sum(1 for t in TOPICS if t['problems'])
_SITES = [('https://feather0000.github.io/eju-calculus/', 'EJU 数学コース2 网站'), ('https://feather0000.github.io/eju-chemistry/', 'EJU 理科 化学 网站'), ('https://feather0000.github.io/eju-biology/', 'EJU 理科 生物 网站')]
PREFACE = ('这是按 EJU 理科（物理）大纲整理的中文讲义。建议先按章节读讲解和例题，再做练习；公式速查、易错点和术语对照可以随时翻。'
           '各页开头的出题频度来自 2005–2025 年试卷的统计，拿不准先看哪一章时，可以参考它，也可以直接看本页最后的频度表。')
open('index.html','w').write(f'''<!doctype html><html lang="zh-Hans" data-site="{SITE}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light dark">
{HEADJS}
<title>EJU 理科 物理 全专题讲解</title>{headmeta(SITE_NAME + " 全专题讲解", SITE_DESC, "", "")}
<link rel="stylesheet" href="assets/site.css"></head><body class="home contents">
<a class="skip" href="#chapters">跳到目次</a>
<div class="ct-wrap">
<header class="ct-head">
<div class="ct-top"><p class="ct-kicker">EJU 理科 · 物理</p><button class="chip theme-btn" id="theme" type="button">深色</button></div>
<h1>物理<br>全专题讲解</h1>
<div class="ct-preface"><p>{PREFACE}</p>
<p class="ct-facts">共 {_nt} 个讲解专题、{_np} 道原创练习题、{_D["demo_count"]} 个互动演示；过去问 {_nb} 题已按专题归类。</p></div>
</header>
<main id="main">
<section id="chapters" aria-labelledby="h-chapters"><h2 id="h-chapters" class="ct-label">目次<span lang="ja">もくじ</span></h2>
<ol class="ct-parts">{"".join(_parts)}</ol></section>
<section id="appendix" aria-labelledby="h-appendix"><div class="ct-part"><p class="ct-no ct-no-a" aria-hidden="true">附</p><div class="ct-body">
<h2 id="h-appendix">资料・速查・工具<span class="ct-chja" lang="ja">資料・ツール</span></h2>
<p class="ct-intro">考前查公式、对术语、找易错点；站内搜索覆盖题目、讲解、公式与数据。</p>
<ol class="ct-list">{_appx}</ol></div></div></section>
<section id="ranking" aria-labelledby="h-rank"><div class="ct-part"><p class="ct-no ct-no-a" aria-hidden="true">表</p><div class="ct-body">
<h2 id="h-rank">过去问出题频度<span class="ct-chja" lang="ja">出題頻度</span></h2>
<p class="ct-intro">依据 2005–2025 年 38 份 EJU 试卷的按知识点分类原题册统计，按题数从多到少排列（各页开头另有详细的「出题频度」表）。</p>
<div class="tw"><table><thead><tr><th scope="col">专题页</th><th scope="col">原题册专题</th><th scope="col" class="num">题数</th><th scope="col">重要度</th></tr></thead><tbody>{RANKTBL}</tbody></table></div></div></div></section>
</main>
<footer class="ct-foot"><p class="ct-sites">姊妹站：{"".join(f'<a href="{u}">{a}</a>' for u, a in _SITES)}</p><p>原创讲义与题目，非 JASSO 官方内容。按《日本留学試験 理科シラバス（物理）》编排。</p></footer>
</div>
{TOGGLEJS}<script src="assets/nav.js"></script></body></html>''')
# 404：GitHub Pages 对任意深度的不存在路径都返回它，所以资源用站点绝对路径
open('404.html','w').write(f'''<!doctype html><html lang="zh-Hans" data-site="{SITE}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light dark">
{HEADJS}<title>页面不存在 · {SITE_NAME}</title><meta name="robots" content="noindex"><link rel="icon" href="{SITE_PATH}assets/favicon.svg" type="image/svg+xml"><link rel="icon" href="{SITE_PATH}assets/favicon-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="{SITE_PATH}assets/apple-touch-icon.png">
<link rel="stylesheet" href="{SITE_PATH}assets/site.css"></head><body class="home nf"><main>
<div class="home-top"><p class="eyebrow">{SITE_NAME}</p><button class="chip theme-btn" id="theme" type="button">深色</button></div>
<p class="nf-code" aria-hidden="true">404</p><h1>页面不存在</h1><p>这个地址没有对应的页面：可能是链接写错了，或者页面已经移动。可以回到首页按专题查找，或用站内搜索。</p>
<p class="home-links"><a href="{SITE_PATH}">← 回到 {SITE_NAME} 首页</a><a href="{SITE_PATH}topics/search/">站内搜索</a></p></main>
{TOGGLEJS}</body></html>''')
nav=open('/workspace/eju-pages/assets/nav.js').read().split('\n')
T=[dict(n=t['n'],slug=t['slug'],zh=t['zh'],ja=t['ja'],ready=True) for t in TOPICS]
nav[0]='(function(){var T='+json.dumps(T,ensure_ascii=False)+';'
nav='\n'.join(nav).replace('EJU コース2 全部专题','EJU 物理 全部专题').replace("(t.n==19?'19–20':t.n)","t.n")
open('assets/nav.js','w').write(nav)
print(len(TOPICS),'topics',sum(len(t['problems']) for t in TOPICS),'problems')

from _x import build_index
print('search index entries:',build_index(TOPICS))
