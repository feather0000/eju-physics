/* 互动演示公式的数值检查：node tests/test_physics.js */
var P = require('../assets/physics.js'), n = 0, bad = 0;
function ok(name, got, exp, tol) { n++; tol = tol == null ? 1e-6 : tol; var e = Math.abs(got - exp) <= tol * Math.max(1, Math.abs(exp));
  if (!e) { bad++; console.log('FAIL', name, got, 'expected', exp); } }
var c;
/* 碰撞 */
c = P.collide(2, 1, 3, 0, 0); ok('完全非弹性 共同速度', c.u1, 2); ok('完全非弹性 u2', c.u2, 2);
ok('完全非弹性 ΔK', P.ke(2, 3) - P.ke(3, 2), 3);
c = P.collide(1, 1, 4, 0, 1); ok('等质量弹性 交换速度 u1', c.u1, 0); ok('等质量弹性 u2', c.u2, 4);
c = P.collide(3, 1, 2, -1, 0.5); ok('动量守恒', 3 * c.u1 + c.u2, 3 * 2 - 1); ok('恢复系数', -(c.u1 - c.u2) / (2 - -1), 0.5);
c = P.collide(1.7, 0.6, 2.2, -0.4, 1); ok('e=1 动能守恒', P.ke(1.7, c.u1) + P.ke(0.6, c.u2), P.ke(1.7, 2.2) + P.ke(0.6, -0.4));
/* 抛体 */
c = P.projectile(20, Math.PI / 4, 0, 9.8); ok('45° 射程 v²/g', c.R, 400 / 9.8); ok('最高点 v²sin²/2g', c.H, 400 * 0.5 / 19.6); ok('飞行时间', c.T, 2 * 20 * Math.SQRT1_2 / 9.8);
c = P.projectile(10, 0, 19.6, 9.8); ok('水平抛出 落地时间 √(2h/g)', c.T, 2); ok('水平抛出 射程', c.R, 20);
/* 斜面连接体 */
c = P.incline(2, 1, Math.PI / 6, 0, 9.8); ok('光滑 sin30 平衡 a=0', c.a, 0); ok('张力=m2 g', c.T, 9.8);
c = P.incline(1, 3, 0, 0, 10); ok('水平光滑 a=m2g/(m1+m2)', c.a, 7.5); ok('张力 m1 a', c.T, 7.5);
c = P.incline(2, 2, Math.PI / 6, 0.2, 9.8); ok('有摩擦 a', c.a, (2 * 9.8 - 2 * 9.8 * 0.5 - 0.2 * 2 * 9.8 * Math.cos(Math.PI / 6)) / 4);
c = P.incline(2, 0.9, Math.PI / 6, 0.2, 9.8); ok('静摩擦足够 a=0', c.a, 0);
c = P.incline(4, 0.5, Math.PI / 6, 0.1, 9.8); ok('m1 下滑 a', c.a, (0.5 * 9.8 - 4 * 9.8 * 0.5 + 0.1 * 4 * 9.8 * Math.cos(Math.PI / 6)) / 4.5);
/* 运动中的连接体与一维滑动（抓取/抛出后的续动） */
c = P.inclineAt(2, 2, Math.PI / 6, 0.2, 0, 9.8); ok('inclineAt v=0 同 incline', c.a, P.incline(2, 2, Math.PI / 6, 0.2, 9.8).a);
c = P.inclineAt(2, 0.5, Math.PI / 6, 0.2, 1, 9.8); ok('上滑中 摩擦沿斜面向下 a', c.a, (0.5 * 9.8 - 2 * 9.8 * 0.5 - 0.2 * 2 * 9.8 * Math.cos(Math.PI / 6)) / 2.5); ok('上滑中 张力 m2(g-a)', c.T, 0.5 * (9.8 - c.a));
c = P.inclineAt(2, 0.5, Math.PI / 6, 0.2, -1, 9.8); ok('下滑中 摩擦沿斜面向上 a', c.a, (0.5 * 9.8 - 2 * 9.8 * 0.5 + 0.2 * 2 * 9.8 * Math.cos(Math.PI / 6)) / 2.5);
s = { x: 0, v: 2 }; for (i = 0; i < 600; i++) { var r1 = P.slide1D(s.x, s.v, 0, 0.5, 0.01); s = { x: r1.x, v: r1.v }; }
ok('滑动 停止距离 v²/(2μg)', s.x, 4, 1e-9); ok('滑动 停住后 v=0', s.v, 0);
c = P.slide1D(0, 1, -2, 0.5, 1); ok('过零后反向 x', c.x, 0.2 - 0.5 * 1.5 * 0.36, 1e-12); ok('过零后反向 v', c.v, -0.9, 1e-12);
c = P.slide1D(0, 0, 1, 1.2, 0.5); ok('静摩擦足够 不动', c.x + c.v, 0);
var M = 4, aD = (2 * 9.8 - 2 * 9.8 * 0.5) / M, aF = 0.2 * 2 * 9.8 * Math.cos(Math.PI / 6) / M;
ok('滑动 从静止 a = incline().a', P.slide1D(0, 0, aD, aF, 0.1).a, P.incline(2, 2, Math.PI / 6, 0.2, 9.8).a);
/* v-t 面积 */
var nd = [[0, 0], [2, 4], [4, 4], [6, -2]];
ok('v-t 面积 位移', P.vtX(nd, 6), 4 + 8 + 1.5 * 4 / 2 * 0 + (4 + -2) / 2 * 2); ok('v-t 路程', P.vtDist(nd, 6), 4 + 8 + 4 * (4 / 6) * 2 / 2 + 2 * (2 / 6) * 2 / 2, 1e-3);
/* 轨道能量守恒（无摩擦） */
var f = function (x) { return 0.2 * x * x; }, df = function (x) { return 0.4 * x; }, d2 = function () { return 0.4; };
var s = { x: -4, v: 0 }, E0 = 9.8 * f(-4), maxdrift = 0;
for (var i = 0; i < 4000; i++) { s = P.trackStep(s, f, df, d2, 0, 0.002); maxdrift = Math.max(maxdrift, Math.abs(0.5 * s.v * s.v + 9.8 * f(s.x) - E0)); }
ok('曲面轨道 力学能守恒 (漂移/E0)', maxdrift / E0, 0, 1e-6);
s = { x: -4, v: 0 }; for (i = 0; i < 20000; i++) s = P.trackStep(s, f, df, d2, 0.1, 0.002);
ok('有摩擦 能量减少', (0.5 * s.v * s.v + 9.8 * f(s.x)) < E0 * 0.9 ? 1 : 0, 1);
/* 振动 */
ok('弹簧振子周期', P.springT(0.5, 2 * Math.PI * Math.PI), 1); ok('单摆周期', P.pendT(9.8, 9.8), 2 * Math.PI);
/* 万有引力 */
ok('第一宇宙速度 7.9 km/s', P.vCirc(3.986e14, 6.371e6) / 1000, 7.91, 2e-3); ok('第二宇宙速度 √2 倍', P.vEsc(1, 2) / P.vCirc(1, 2), Math.SQRT2);
c = P.orbitElems(1, 1, 1); ok('圆轨道 T=2π', c.T, 2 * Math.PI); c = P.orbitElems(1, 1, 1.2); ok('远地点 r=1/(2/v²-1)', c.rOther, 1 / (2 / 1.44 - 1));
s = { x: 1, y: 0, vx: 0, vy: 1.2 }; var E = 0.72 - 1, L0 = 1.2, de = 0, dL = 0, rmax = 0;
for (i = 0; i < 20000; i++) { s = P.orbitStep(s, 1, 0.001); var r = Math.hypot(s.x, s.y); rmax = Math.max(rmax, r);
  de = Math.max(de, Math.abs((s.vx * s.vx + s.vy * s.vy) / 2 - 1 / r - E)); dL = Math.max(dL, Math.abs(s.x * s.vy - s.y * s.vx - L0)); }
ok('轨道积分 能量守恒', de, 0, 1e-5); ok('轨道积分 角动量守恒(开普勒第二定律)', dL, 0, 1e-9); ok('轨道积分 远地点', rmax, 1 / (2 / 1.44 - 1), 1e-3);
/* 气体循环 */
c = P.gasSeg(2, 1, 2, 3); ok('等压 W=pΔV', c.W, 4); ok('等压 Q=5/2 pΔV', c.Q, 10);
c = P.gasSeg(1, 2, 3, 2); ok('等容 W=0', c.W, 0); ok('等容 Q=3/2 VΔp', c.Q, 6);
c = P.cycle([[1, 1], [1, 3], [3, 3], [3, 1]]); ok('矩形循环 净功=面积', c.W, 4); ok('循环 ΔU=0', c.dU, 0); ok('矩形循环 吸热', c.Qin, 1.5 * 2 + 2.5 * 6); ok('效率', c.eff, 4 / 18);
c = P.cycle([[1, 1], [3, 3], [3, 1]]); ok('三角循环 净功', c.W, 2);
ok('净热=净功', c.segs.reduce(function (a, s) { return a + s.Q; }, 0), c.W);
/* 多普勒 */
ok('声源接近', P.doppler(680, 340, 40, 0), 680 * 340 / 300); ok('观察者远离', P.doppler(500, 340, 0, -34), 450);
/* 透镜 */
c = P.lens(30, 20); ok('凸透镜 b', c.b, 60); ok('倍率', c.m, -2); c = P.lens(10, 20); ok('虚像 b<0', c.b, -20);
c = P.lens(20, -20); ok('凹透镜 b', c.b, -10); ok('凹透镜 倍率', c.m, 0.5);
/* 双缝 */
ok('双缝 Δx', P.slitDx(1, 0.5e-3, 500e-9), 1e-3); ok('亮纹位置 I=1', P.slitI(1e-3, 1, 0.5e-3, 500e-9), 1); ok('暗纹 I=0', P.slitI(0.5e-3, 1, 0.5e-3, 500e-9), 0, 1e-12);
/* 电场 */
var Q = [{ x: 0, y: 0, q: 1e-6 }]; ok('点电荷 V=kq/r', P.potential(Q, 3, 0), 3000); ok('点电荷 E', P.field(Q, 3, 0)[0], 1000);
Q = [{ x: -1, y: 0, q: 1e-6 }, { x: 1, y: 0, q: -1e-6 }]; ok('偶极子中点 V=0', P.potential(Q, 0, 0), 0); ok('偶极子中点 E=2kq/r²', P.field(Q, 0, 0)[0], 2 * 9e3);
Q = [{ x: -1, y: 0, q: 1e-6 }, { x: 1, y: 0, q: 1e-6 }]; ok('等量同号中点 E=0', Math.hypot.apply(null, P.field(Q, 0, 0)), 0);
/* 电容器 */
c = P.capacitor(0.01, 1e-3, 1, 1e-3, 10, true); ok('C=ε0S/d', c.C, 8.85e-11); ok('Q=CV', c.Q, 8.85e-10); ok('E=V/d', c.E, 1e4);
c = P.capacitor(0.01, 2e-3, 1, 1e-3, 10, false); ok('断开后 d 加倍 V 加倍', c.V, 20); ok('断开 E 不变', c.E, 1e4);
c = P.capacitor(0.01, 2e-3, 1, 1e-3, 10, true); ok('接电池 d 加倍 Q 减半', c.Q, 8.85e-10 / 2);
c = P.capacitor(0.01, 1e-3, 4, 1e-3, 10, false); ok('断开 插入介质 V/εr', c.V, 2.5); ok('能量 U=Q²/2C', c.U, Math.pow(8.85e-10, 2) / (2 * c.C));
/* 直流 */
c = P.circuit(6, 1, 2); ok('I=E/(R+r)', c.I, 2); ok('端电压', c.V, 4); ok('功率', c.P, 8);
c = P.circuit(6, 1.5, 1.5); ok('R=r 时最大功率', c.P, c.Pmax); ok('E²/4r', c.Pmax, 6);
/* 洛伦兹 */
c = P.cyclo(9.1e-31, 1.6e-19, 1e6, 1e-3); ok('r=mv/qB', c.r, 9.1e-31 * 1e6 / 1.6e-22); ok('T=2πm/qB', c.T, 2 * Math.PI * 9.1e-31 / 1.6e-22);
/* 导体棒 */
c = P.rod(0.1, 0.5, 0.4, 0.2, 0.2, 0, 1e9); ok('终端速度 FR/(BL)²', c.vt, 0.2 * 0.2 / 0.04); ok('趋近终端速度', c.v, 1);
s = { x: 0, v: 0 }; for (i = 0; i < 1000; i++) s = P.rodStep(s, 0.1, 0.5, 0.4, 0.2, 0.2, 0.001);
ok('数值积分 = 解析解', s.v, P.rod(0.1, 0.5, 0.4, 0.2, 0.2, 0, 1).v, 1e-6);
/* 原子 */
ok('半衰期 2 次', P.decayN(800, 5, 10), 200); ok('衰变概率组合', 1 - Math.pow(1 - P.decayP(5, 0.1), 50), 0.5);
c = P.photo(1e15, 2.3); ok('K=hf-W', c.K, 4.136 - 2.3); ok('截止频率', c.f0, 2.3 / 4.136e-15);
ok('驻波 节点', P.standing(1, 2, 1, 1, 0.3), 0, 1e-12); ok('驻波 腹 2A', P.standing(1, 2, 1, 0.5, 0), 2);
console.log(n + ' demo formula checks, ' + bad + ' failures'); process.exit(bad ? 1 : 0);
