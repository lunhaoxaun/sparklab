/* 数学绘图器 · 几何对象模型与构造运算（SL.math.geometry）
   ---------------------------------------------------------------
   纯数据模块：只操作 scene 里的普通对象，不碰 DOM / canvas / localStorage。
   负责：
   - 创建点、线段、直线、圆、多边形，以及中点、交点、垂线、平行线等派生对象；
   - 按创建顺序重算派生值（最多 5 轮直到稳定），坐标非法一律置 NaN、不抛异常；
   - 属性读写（getProp / setProp）、测量（measure）、命中测试（pick）；
   - 级联删除：删掉一个点会带走依赖它的线段、圆、多边形、交点……

   标签即脚本标识符：点 A/B/C…（用完后 A1、B1…），线段 AB（端点拼接，冲突退化为 s1），
   直线 l1，圆 c1，多边形 poly1，中点 M1，交点 X1，垂线/平行线 p1。所有标签全局唯一。

   派生缓存（recompute 写入，只读，别当输入用）：
   - 线类对象：px、py（线上一点）、dx、dy（单位方向向量）、slope；线段另有 length
   - 圆：radius
   这些值在 normalize 时会被丢掉并重算，因为 JSON 存不了 Infinity / NaN。

   依赖：无。
   --------------------------------------------------------------- */
(function () {
  'use strict';

  var SL = (window.SparkLab = window.SparkLab || {});
  SL.math = SL.math || {};

  var EPS = 1e-9;          /* 通用数值容差 */
  var TOL_T = 1e-7;        /* 线段参数 t 的范围容差 */
  var MAX_ROUNDS = 5;      /* 派生对象重算轮数上限 */
  var MAX_REF_DEPTH = 8;   /* 垂线/平行线互相引用时的递归保护 */

  var POINT_COLOR = '#d94b4b';
  var SHAPE_COLOR = '#2a63e8';

  /* 对象类型 → 中文名（对象列表、属性面板直接用） */
  var TYPES = {
    point: '点',
    segment: '线段',
    line: '直线',
    circle: '圆',
    polygon: '多边形',
    midpoint: '中点',
    intersection: '交点',
    perpendicular: '垂线',
    parallel: '平行线'
  };

  /* setProp 允许的颜色名（其余必须是 #rgb / #rrggbb） */
  var COLOR_NAMES = ['red', 'green', 'blue', 'orange', 'purple', 'teal', 'gray', 'black', 'white'];
  var COLOR_SET = {};
  (function () {
    for (var i = 0; i < COLOR_NAMES.length; i += 1) COLOR_SET[COLOR_NAMES[i]] = true;
  })();

  /* ---------- 小工具 ---------- */
  function has(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }
  function isArr(v) { return Object.prototype.toString.call(v) === '[object Array]'; }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  function coord(v) {
    var n = Number(v);
    return isFinite(n) ? n : NaN;
  }

  function numOr(v, dflt) {
    return isNum(v) ? v : dflt;
  }

  function clamp(v, lo, hi) {
    if (!isNum(v)) return lo;
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  /* 带容差的相等：NaN 与 NaN 视为相等，方便比较两轮重算结果 */
  function eq(a, b) {
    var nanA = (a !== a), nanB = (b !== b);
    if (nanA || nanB) return nanA && nanB;
    if (!isNum(a) || !isNum(b)) return a === b;
    var d = Math.abs(a - b);
    if (d <= EPS) return true;
    return d <= EPS * Math.max(Math.abs(a), Math.abs(b));
  }

  function isPointLike(o) {
    return !!o && (o.type === 'point' || o.type === 'midpoint' || o.type === 'intersection');
  }

  function isLineLike(o) {
    return !!o && (o.type === 'segment' || o.type === 'line' ||
      o.type === 'perpendicular' || o.type === 'parallel');
  }

  function validColor(value) {
    var s = String(value == null ? '' : value).replace(/^\s+|\s+$/g, '');
    if (!s) return null;
    if (COLOR_SET[s.toLowerCase()]) return s;
    if (/^#[0-9a-fA-F]{3}$/.test(s)) return s;
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
    return null;
  }

  function needNum(name, value) {
    var n = Number(value);
    if (!isFinite(n)) throw new Error('属性需要数值: ' + name);
    return n;
  }

  /* ---------- 场景兜底：任何入口都先过一遍，避免半成品 scene 崩溃 ---------- */
  function ensure(scene) {
    if (!scene || typeof scene !== 'object') return false;
    if (!isArr(scene.objects)) scene.objects = [];
    if (!scene.view || typeof scene.view !== 'object') {
      scene.view = { cx: 0, cy: 0, pxPerUnit: 48 };
    }
    return true;
  }

  function findObj(scene, id) {
    if (!scene || !isArr(scene.objects) || id == null) return null;
    var objs = scene.objects;
    for (var i = 0; i < objs.length; i += 1) {
      if (objs[i] && objs[i].id === id) return objs[i];
    }
    return null;
  }

  function objectMap(objects) {
    var map = {};
    for (var i = 0; i < objects.length; i += 1) {
      if (objects[i] && objects[i].id) map[objects[i].id] = objects[i];
    }
    return map;
  }

  /* ============================================================
     编号与标签
     ============================================================ */
  function idPrefix(type) {
    if (type === 'point') return 'p';
    if (type === 'segment') return 's';
    if (type === 'line') return 'l';
    if (type === 'circle') return 'c';
    if (type === 'polygon') return 'g';
    if (type === 'midpoint') return 'm';
    if (type === 'intersection') return 'x';
    return 'q';                     /* 垂线 / 平行线 */
  }

  function nextId(scene, type) {
    var pre = idPrefix(type);
    var used = {};
    var objs = scene.objects || [];
    for (var i = 0; i < objs.length; i += 1) {
      if (objs[i] && objs[i].id) used[objs[i].id] = true;
    }
    var n = 1;
    while (used[pre + n]) n += 1;
    return pre + n;
  }

  function usedLabels(objects) {
    var used = {};
    for (var i = 0; i < objects.length; i += 1) {
      if (objects[i] && objects[i].label) used[objects[i].label] = true;
    }
    return used;
  }

  /* 点：A…Z，然后 A1…Z1、A2… */
  function nextPointLabel(used) {
    for (var round = 0; round < 500; round += 1) {
      for (var i = 0; i < 26; i += 1) {
        var lab = String.fromCharCode(65 + i) + (round === 0 ? '' : String(round));
        if (!used[lab]) return lab;
      }
    }
    return 'P' + (Object.keys(used).length + 1);
  }

  function nextSeqLabel(used, prefix) {
    var n = 1;
    while (used[prefix + n]) n += 1;
    return prefix + n;
  }

  var IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

  /* 按类型生成标签；lookup 用来取端点标签（线段要用） */
  function genLabel(type, obj, lookup, used) {
    /* 自由点用 A…Z 点式标签；派生点各有前缀：中点 M1…、交点 X1… */
    if (type === 'point') return nextPointLabel(used);
    if (type === 'midpoint') return nextSeqLabel(used, 'M');
    if (type === 'intersection') return nextSeqLabel(used, 'X');
    if (type === 'segment') {
      var A = lookup(obj.a), B = lookup(obj.b);
      if (A && B && A.label && B.label) {
        /* 端点标签按字典序拼接：同一条线段不管先点哪个端点都得到同一个基础标签，
           反向再画一次也会因为重名而回退到 s1，不会冒出 BA、CB 这种「同线异名」 */
        var lab = (A.label <= B.label) ? (A.label + B.label) : (B.label + A.label);
        if (IDENT_RE.test(lab) && !used[lab]) return lab;
      }
      return nextSeqLabel(used, 's');
    }
    if (type === 'line') return nextSeqLabel(used, 'l');
    if (type === 'circle') return nextSeqLabel(used, 'c');
    if (type === 'polygon') return nextSeqLabel(used, 'poly');
    return nextSeqLabel(used, 'p');        /* 垂线 / 平行线 */
  }

  /* ============================================================
     场景
     ============================================================ */
  function defaultScene() {
    return {
      view: { cx: 0, cy: 0, pxPerUnit: 48 },
      params: {},
      expressions: [],
      objects: [],
      script: '',
      autoRun: true
    };
  }

  function labelOf(list, id) {
    for (var i = 0; i < list.length; i += 1) {
      if (list[i] && list[i].id === id) return list[i];
    }
    return null;
  }

  function cloneObject(src) {
    var t = src.type;
    var o = {
      id: String(src.id),
      type: t,
      label: typeof src.label === 'string' ? src.label : '',
      color: validColor(src.color) || (t === 'point' ? POINT_COLOR : SHAPE_COLOR),
      visible: src.visible !== false,
      num: isNum(src.num) ? src.num : 0,
      ok: src.ok === true,
      msg: typeof src.msg === 'string' ? src.msg : ''
    };

    if (t === 'point') {
      o.x = numOr(src.x, NaN);
      o.y = numOr(src.y, NaN);
      o.free = src.free !== false;
      return o;
    }
    if (t === 'midpoint' || t === 'intersection') {
      o.of = isArr(src.of) ? [String(src.of[0]), String(src.of[1])] : [];
      o.x = numOr(src.x, NaN);
      o.y = numOr(src.y, NaN);
      if (t === 'intersection') o.index = Number(src.index) === 1 ? 1 : 0;
      return o;
    }
    if (t === 'segment' || t === 'line') {
      o.a = src.a == null ? '' : String(src.a);
      o.b = src.b == null ? '' : String(src.b);
      return o;
    }
    if (t === 'circle') {
      o.center = src.center == null ? '' : String(src.center);
      o.through = src.through == null ? '' : String(src.through);
      return o;
    }
    if (t === 'polygon') {
      var pts = [];
      if (isArr(src.points)) {
        for (var i = 0; i < src.points.length; i += 1) pts.push(String(src.points[i]));
      }
      o.points = pts;
      return o;
    }
    /* 垂线 / 平行线 */
    o.through = src.through == null ? '' : String(src.through);
    o.ref = src.ref == null ? '' : String(src.ref);
    return o;
  }

  function refsOf(o) {
    if (!o) return [];
    if (o.type === 'segment' || o.type === 'line') return [o.a, o.b];
    if (o.type === 'circle') return [o.center, o.through];
    if (o.type === 'polygon') return isArr(o.points) ? o.points.slice() : [];
    if (o.type === 'midpoint' || o.type === 'intersection') return isArr(o.of) ? o.of.slice() : [];
    if (o.type === 'perpendicular' || o.type === 'parallel') return [o.through, o.ref];
    return [];
  }

  function refsOk(o, alive) {
    var refs = refsOf(o);
    for (var i = 0; i < refs.length; i += 1) {
      var id = refs[i];
      if (!id || !alive[id]) return false;
    }
    if (o.type === 'polygon' && refs.length < 3) return false;
    if ((o.type === 'midpoint' || o.type === 'intersection') && refs.length !== 2) return false;
    return true;
  }

  /* 补齐字段、过滤非法对象（缺 id / 未知类型 / 父子引用悬空），返回新场景 */
  function normalize(input) {
    var src = (input && typeof input === 'object') ? input : {};
    var out = defaultScene();

    var v = (src.view && typeof src.view === 'object') ? src.view : {};
    out.view.cx = numOr(v.cx, 0);
    out.view.cy = numOr(v.cy, 0);
    out.view.pxPerUnit = clamp(numOr(v.pxPerUnit, 48), 4, 400);

    if (src.params && typeof src.params === 'object') {
      for (var pk in src.params) {
        if (!has(src.params, pk)) continue;
        var pv = Number(src.params[pk]);
        if (isFinite(pv)) out.params[pk] = pv;
      }
    }

    if (isArr(src.expressions)) {
      for (var ei = 0; ei < src.expressions.length; ei += 1) {
        var e = src.expressions[ei];
        if (!e || typeof e !== 'object' || typeof e.expr !== 'string') continue;
        out.expressions.push({
          id: e.id == null ? 'e' + (out.expressions.length + 1) : String(e.id),
          name: typeof e.name === 'string' ? e.name : '',
          expr: e.expr,
          color: validColor(e.color) || SHAPE_COLOR,
          visible: e.visible !== false
        });
      }
    }

    out.script = typeof src.script === 'string' ? src.script : '';
    out.autoRun = src.autoRun === undefined ? true : !!src.autoRun;

    /* 1) 形态检查 → 2) id 去重 → 3) 引用悬空的对象剔除（迭代，因为删父会连带孤儿） */
    var list = [];
    var seenId = {};
    if (isArr(src.objects)) {
      for (var oi = 0; oi < src.objects.length; oi += 1) {
        var raw = src.objects[oi];
        if (!raw || typeof raw !== 'object') continue;
        if (raw.id == null || raw.id === '') continue;
        if (typeof raw.type !== 'string' || !has(TYPES, raw.type)) continue;
        var obj = cloneObject(raw);
        if (seenId[obj.id]) continue;
        seenId[obj.id] = true;
        list.push(obj);
      }
    }

    for (var guard = 0; guard <= list.length; guard += 1) {
      var alive = objectMap(list);
      var next = [];
      var dropped = false;
      for (var li = 0; li < list.length; li += 1) {
        if (refsOk(list[li], alive)) next.push(list[li]);
        else dropped = true;
      }
      list = next;
      if (!dropped) break;
    }

    /* 4) 标签：补缺失、去重复。先给点类分配，再给线/圆/多边形分配，
          这样线段拼接端点标签时端点一定已经有名字（存档顺序被改乱也不会退化成 s1） */
    var used = {};
    var i;
    for (i = 0; i < list.length; i += 1) {
      var o = list[i];
      if (o.label && !used[o.label]) used[o.label] = true;
      else o.label = '';
    }

    var assign = function (item) {
      if (item.label) return;
      item.label = genLabel(item.type, item, function (id) { return labelOf(list, id); }, used);
      used[item.label] = true;
    };
    for (i = 0; i < list.length; i += 1) {
      if (isPointLike(list[i])) assign(list[i]);
    }
    for (i = 0; i < list.length; i += 1) {
      if (!isPointLike(list[i])) assign(list[i]);
    }

    out.objects = list;
    recompute(out);
    return out;
  }

  /* ============================================================
     几何取值
     ============================================================ */
  /* 线类对象的支撑线：线上一点 + 方向向量（未单位化） */
  function lineData(scene, obj, depth) {
    if (!obj) return null;
    var d = depth || 0;
    if (d > MAX_REF_DEPTH) return null;

    if (obj.type === 'segment' || obj.type === 'line') {
      var A = findObj(scene, obj.a);
      var B = findObj(scene, obj.b);
      if (!isPointLike(A) || !isPointLike(B)) return null;
      return { px: A.x, py: A.y, dx: B.x - A.x, dy: B.y - A.y };
    }

    if (obj.type === 'perpendicular' || obj.type === 'parallel') {
      var P = findObj(scene, obj.through);
      var R = findObj(scene, obj.ref);
      if (!isPointLike(P) || !isLineLike(R)) return null;
      var rd = lineData(scene, R, d + 1);
      if (!rd) return null;
      if (obj.type === 'perpendicular') {
        return { px: P.x, py: P.y, dx: -rd.dy, dy: rd.dx };   /* 方向转 90° */
      }
      return { px: P.x, py: P.y, dx: rd.dx, dy: rd.dy };
    }

    return null;
  }

  function unitVec(dx, dy) {
    if (!isNum(dx) || !isNum(dy)) return null;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (!isNum(len) || len <= EPS) return null;
    return { x: dx / len, y: dy / len };
  }

  /* 斜率：竖直线给 Infinity（与方案一致），并去掉 -0 */
  function slopeFrom(dx, dy) {
    if (!isNum(dx) || !isNum(dy)) return NaN;
    if (Math.abs(dx) <= EPS) return Infinity;
    var s = dy / dx;
    return s === 0 ? 0 : s;
  }

  function circleData(scene, obj) {
    if (!obj || obj.type !== 'circle') return null;
    var C = findObj(scene, obj.center);
    var T = findObj(scene, obj.through);
    if (!isPointLike(C) || !isPointLike(T)) return null;
    var dx = T.x - C.x;
    var dy = T.y - C.y;
    return { cx: C.x, cy: C.y, r: Math.sqrt(dx * dx + dy * dy) };
  }

  function polygonPoints(scene, obj) {
    if (!obj || obj.type !== 'polygon' || !isArr(obj.points)) return null;
    var pts = [];
    for (var i = 0; i < obj.points.length; i += 1) {
      var p = findObj(scene, obj.points[i]);
      if (!isPointLike(p)) return null;
      pts.push({ x: p.x, y: p.y });
    }
    return pts.length >= 3 ? pts : null;
  }

  function polyArea(pts) {
    var s = 0;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
      s += pts[j].x * pts[i].y - pts[i].x * pts[j].y;
    }
    return Math.abs(s) / 2;
  }

  function polyPerimeter(pts) {
    var total = 0;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
      var dx = pts[i].x - pts[j].x;
      var dy = pts[i].y - pts[j].y;
      total += Math.sqrt(dx * dx + dy * dy);
    }
    return total;
  }

  function inPolygon(pts, x, y) {
    var inside = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
      var xi = pts[i].x, yi = pts[i].y;
      var xj = pts[j].x, yj = pts[j].y;
      if ((yi > y) !== (yj > y)) {
        var xCut = (xj - xi) * (y - yi) / (yj - yi) + xi;
        if (x < xCut) inside = !inside;
      }
    }
    return inside;
  }

  /* ============================================================
     交点
     ============================================================ */
  function nanPoint() { return { x: NaN, y: NaN }; }
  function inT(t) { return t >= -TOL_T && t <= 1 + TOL_T; }

  function lineLine(scene, A, B) {
    var d1 = lineData(scene, A, 0);
    var d2 = lineData(scene, B, 0);
    if (!d1 || !d2) return nanPoint();
    var u1 = unitVec(d1.dx, d1.dy);
    var u2 = unitVec(d2.dx, d2.dy);
    if (!u1 || !u2) return nanPoint();

    var det = u1.x * u2.y - u1.y * u2.x;
    if (!isNum(det) || Math.abs(det) < EPS) return nanPoint();   /* 平行或重合 */

    var ex = d2.px - d1.px;
    var ey = d2.py - d1.py;
    /* 方向向量取的是单位向量，所以 t、s 是「沿方向走了多远」，
       要除以各自线段长度才换回 [0,1] 的线段参数 */
    var len1 = Math.sqrt(d1.dx * d1.dx + d1.dy * d1.dy);
    var len2 = Math.sqrt(d2.dx * d2.dx + d2.dy * d2.dy);
    var t = (ex * u2.y - ey * u2.x) / det;
    if (!isNum(t)) return nanPoint();

    if (A.type === 'segment' && !inT(t / len1)) return nanPoint();
    if (B.type === 'segment') {
      var s = (ex * u1.y - ey * u1.x) / det;      /* 在 B 上的参数 */
      if (!inT(s / len2)) return nanPoint();
    }
    return { x: d1.px + u1.x * t, y: d1.py + u1.y * t };
  }

  function lineCircle(scene, L, C, index) {
    var d = lineData(scene, L, 0);
    var c = circleData(scene, C);
    if (!d || !c) return nanPoint();
    var u = unitVec(d.dx, d.dy);
    if (!u || !isNum(c.r)) return nanPoint();

    var fx = d.px - c.cx;
    var fy = d.py - c.cy;
    var b = 2 * (u.x * fx + u.y * fy);
    var cc = fx * fx + fy * fy - c.r * c.r;
    var disc = b * b - 4 * cc;
    var tol = EPS * Math.max(1, c.r * c.r, Math.abs(b));

    if (disc < -tol) return nanPoint();                       /* 相离 */
    var t1, t2;
    if (disc <= tol) {
      t1 = -b / 2;
      t2 = t1;                                                /* 相切：只有一个点 */
    } else {
      var sq = Math.sqrt(disc);
      t1 = (-b - sq) / 2;
      t2 = (-b + sq) / 2;
    }

    var t = (Number(index) === 1) ? t2 : t1;
    if (disc <= tol && Number(index) === 1) return nanPoint();
    if (L.type === 'segment') {
      var len = Math.sqrt(d.dx * d.dx + d.dy * d.dy);
      if (!inT(t / len)) return nanPoint();      /* t 是世界距离，先换回线段参数 */
    }

    return { x: d.px + u.x * t, y: d.py + u.y * t };
  }

  function circleCircle(scene, A, B, index) {
    var c1 = circleData(scene, A);
    var c2 = circleData(scene, B);
    if (!c1 || !c2) return nanPoint();
    if (!isNum(c1.r) || !isNum(c2.r)) return nanPoint();

    var dx = c2.cx - c1.cx;
    var dy = c2.cy - c1.cy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (!isNum(dist)) return nanPoint();
    if (dist < EPS) return nanPoint();                          /* 同心（含重合） */
    if (dist > c1.r + c2.r + EPS) return nanPoint();            /* 相离 */
    if (dist < Math.abs(c1.r - c2.r) - EPS) return nanPoint();  /* 内含 */

    var a = (c1.r * c1.r - c2.r * c2.r + dist * dist) / (2 * dist);
    var h2 = c1.r * c1.r - a * a;
    if (h2 < 0) h2 = 0;
    var h = Math.sqrt(h2);
    var ux = dx / dist;
    var uy = dy / dist;
    var mx = c1.cx + a * ux;
    var my = c1.cy + a * uy;

    if (h <= EPS) return { x: mx, y: my };                      /* 相切 */
    if (Number(index) === 1) return { x: mx + h * uy, y: my - h * ux };
    return { x: mx - h * uy, y: my + h * ux };
  }

  function intersectPair(scene, A, B, index) {
    if (!A || !B) return nanPoint();
    var aLine = isLineLike(A);
    var bLine = isLineLike(B);
    var aCir = A.type === 'circle';
    var bCir = B.type === 'circle';

    if (aLine && bLine) return lineLine(scene, A, B);
    if (aLine && bCir) return lineCircle(scene, A, B, index);
    if (aCir && bLine) return lineCircle(scene, B, A, index);
    if (aCir && bCir) return circleCircle(scene, A, B, index);
    return nanPoint();                                          /* 含点对象 → 非法 */
  }

  /* ============================================================
     重算
     ============================================================ */
  function computeDerivedPoint(obj, scene) {
    var A, B, p;
    if (obj.type === 'midpoint') {
      A = findObj(scene, obj.of[0]);
      B = findObj(scene, obj.of[1]);
      if (!isPointLike(A) || !isPointLike(B)) {
        obj.x = NaN;
        obj.y = NaN;
        return;
      }
      obj.x = (A.x + B.x) / 2;
      obj.y = (A.y + B.y) / 2;
      return;
    }
    if (obj.type === 'intersection') {
      A = findObj(scene, obj.of[0]);
      B = findObj(scene, obj.of[1]);
      p = intersectPair(scene, A, B, obj.index);
      obj.x = p.x;
      obj.y = p.y;
    }
  }

  function onePass(scene) {
    var objs = scene.objects;
    for (var i = 0; i < objs.length; i += 1) {
      var o = objs[i];
      if (!o) continue;

      if (o.type === 'midpoint' || o.type === 'intersection') {
        computeDerivedPoint(o, scene);
        continue;
      }

      if (o.type === 'circle') {
        var c = circleData(scene, o);
        o.radius = c ? c.r : NaN;
        continue;
      }

      if (o.type === 'polygon') {
        var pts = polygonPoints(scene, o);
        o.area = pts ? polyArea(pts) : NaN;
        o.perimeter = pts ? polyPerimeter(pts) : NaN;
        continue;
      }

      if (isLineLike(o)) {
        var d = lineData(scene, o, 0);
        if (!d || !isNum(d.dx) || !isNum(d.dy)) {
          o.px = NaN;
          o.py = NaN;
          o.dx = NaN;
          o.dy = NaN;
          o.slope = NaN;
          if (o.type === 'segment') o.length = NaN;
          continue;
        }
        var u = unitVec(d.dx, d.dy);
        o.px = d.px;
        o.py = d.py;
        o.dx = u ? u.x : NaN;
        o.dy = u ? u.y : NaN;
        o.slope = u ? slopeFrom(u.x, u.y) : NaN;
        if (o.type === 'segment') {
          o.length = Math.sqrt(d.dx * d.dx + d.dy * d.dy);
        }
      }
    }
  }

  function snapshot(scene) {
    var out = [];
    var objs = scene.objects || [];
    for (var i = 0; i < objs.length; i += 1) {
      var o = objs[i];
      if (!o) { out.push(NaN); continue; }
      if (isPointLike(o)) {
        out.push(o.x, o.y);
      } else if (o.type === 'circle') {
        out.push(o.radius);
      } else if (isLineLike(o)) {
        out.push(o.px, o.py, o.dx, o.dy);
      } else {
        out.push(0);
      }
    }
    return out;
  }

  function sameSnapshot(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i += 1) {
      if (!eq(a[i], b[i])) return false;
    }
    return true;
  }

  function recompute(scene) {
    if (!ensure(scene)) return scene;
    for (var round = 0; round < MAX_ROUNDS; round += 1) {
      var before = snapshot(scene);
      onePass(scene);
      if (sameSnapshot(before, snapshot(scene))) break;
    }
    return scene;
  }

  /* ============================================================
     创建
     ============================================================ */
  function baseObject(scene, type, label, color) {
    return {
      id: nextId(scene, type),
      type: type,
      label: label,
      color: color,
      visible: true,
      num: 0,
      ok: false,
      msg: ''
    };
  }

  function addPoint(scene, x, y) {
    if (!ensure(scene)) return null;
    var used = usedLabels(scene.objects);
    var obj = baseObject(scene, 'point', nextPointLabel(used), POINT_COLOR);
    obj.x = coord(x);
    obj.y = coord(y);
    obj.free = true;
    scene.objects.push(obj);
    recompute(scene);
    return obj;
  }

  function addSegment(scene, aId, bId) {
    if (!ensure(scene)) return null;
    var A = findObj(scene, aId);
    var B = findObj(scene, bId);
    if (!isPointLike(A) || !isPointLike(B) || A === B) return null;

    var used = usedLabels(scene.objects);
    var label = genLabel('segment', { a: A.id, b: B.id },
      function (id) { return findObj(scene, id); }, used);
    var obj = baseObject(scene, 'segment', label, SHAPE_COLOR);
    obj.a = A.id;
    obj.b = B.id;
    scene.objects.push(obj);
    recompute(scene);
    return obj;
  }

  function addLine(scene, aId, bId) {
    if (!ensure(scene)) return null;
    var A = findObj(scene, aId);
    var B = findObj(scene, bId);
    if (!isPointLike(A) || !isPointLike(B) || A === B) return null;

    var used = usedLabels(scene.objects);
    var obj = baseObject(scene, 'line', genLabel('line', {}, null, used), SHAPE_COLOR);
    obj.a = A.id;
    obj.b = B.id;
    scene.objects.push(obj);
    recompute(scene);
    return obj;
  }

  function addCircle(scene, centerId, throughId) {
    if (!ensure(scene)) return null;
    var C = findObj(scene, centerId);
    var T = findObj(scene, throughId);
    if (!isPointLike(C) || !isPointLike(T) || C === T) return null;

    var used = usedLabels(scene.objects);
    var obj = baseObject(scene, 'circle', genLabel('circle', {}, null, used), SHAPE_COLOR);
    obj.center = C.id;
    obj.through = T.id;
    scene.objects.push(obj);
    recompute(scene);
    return obj;
  }

  function addPolygon(scene, pointIds) {
    if (!ensure(scene) || !isArr(pointIds)) return null;

    var ids = [];
    var seen = {};
    for (var i = 0; i < pointIds.length; i += 1) {
      var p = findObj(scene, pointIds[i]);
      if (!isPointLike(p)) return null;
      if (seen[p.id]) continue;
      seen[p.id] = true;
      ids.push(p.id);
    }
    if (ids.length < 3) return null;

    var used = usedLabels(scene.objects);
    var obj = baseObject(scene, 'polygon', genLabel('polygon', {}, null, used), SHAPE_COLOR);
    obj.points = ids;
    scene.objects.push(obj);
    recompute(scene);
    return obj;
  }

  function addMidpoint(scene, aId, bId) {
    if (!ensure(scene)) return null;
    var A = findObj(scene, aId);
    var B = findObj(scene, bId);
    if (!isPointLike(A) || !isPointLike(B)) return null;

    var used = usedLabels(scene.objects);
    var obj = baseObject(scene, 'midpoint', genLabel('midpoint', {}, null, used), POINT_COLOR);
    obj.of = [A.id, B.id];
    obj.x = NaN;
    obj.y = NaN;
    scene.objects.push(obj);
    recompute(scene);
    return obj;
  }

  function addIntersection(scene, idA, idB, index) {
    if (!ensure(scene)) return null;
    var A = findObj(scene, idA);
    var B = findObj(scene, idB);
    if (!A || !B || A === B) return null;
    if (isPointLike(A) || isPointLike(B)) return null;        /* 点不参与求交 */
    if (!((isLineLike(A) || A.type === 'circle') &&
          (isLineLike(B) || B.type === 'circle'))) return null;

    var used = usedLabels(scene.objects);
    var obj = baseObject(scene, 'intersection', genLabel('intersection', {}, null, used), POINT_COLOR);
    obj.of = [A.id, B.id];
    obj.index = Number(index) === 1 ? 1 : 0;
    obj.x = NaN;
    obj.y = NaN;
    scene.objects.push(obj);
    recompute(scene);
    return obj;
  }

  function addPerpendicular(scene, throughId, refId) {
    return addLineLike(scene, 'perpendicular', throughId, refId);
  }

  function addParallel(scene, throughId, refId) {
    return addLineLike(scene, 'parallel', throughId, refId);
  }

  function addLineLike(scene, type, throughId, refId) {
    if (!ensure(scene)) return null;
    var P = findObj(scene, throughId);
    var R = findObj(scene, refId);
    if (!isPointLike(P) || !isLineLike(R)) return null;

    var used = usedLabels(scene.objects);
    var obj = baseObject(scene, type, genLabel(type, {}, null, used), SHAPE_COLOR);
    obj.through = P.id;
    obj.ref = R.id;
    scene.objects.push(obj);
    recompute(scene);
    return obj;
  }

  /* ============================================================
     删除（级联）
     ============================================================ */
  function removeObject(scene, id) {
    if (!ensure(scene)) return [];
    var target = findObj(scene, id);
    if (!target) return [];

    var doomed = {};
    doomed[target.id] = true;

    /* 反复扫描：删父对象会让子对象变成孤儿，所以要迭代到不动为止 */
    for (var round = 0; round <= scene.objects.length; round += 1) {
      var grew = false;
      for (var i = 0; i < scene.objects.length; i += 1) {
        var o = scene.objects[i];
        if (!o || doomed[o.id]) continue;
        var refs = refsOf(o);
        for (var k = 0; k < refs.length; k += 1) {
          if (doomed[refs[k]]) {
            doomed[o.id] = true;
            grew = true;
            break;
          }
        }
      }
      if (!grew) break;
    }

    var removed = [target.id];
    var kept = [];
    for (var j = 0; j < scene.objects.length; j += 1) {
      var obj = scene.objects[j];
      if (!obj) continue;
      if (doomed[obj.id]) {
        if (obj.id !== target.id) removed.push(obj.id);
        continue;
      }
      kept.push(obj);
    }
    scene.objects = kept;
    recompute(scene);
    return removed;
  }

  /* ============================================================
     属性读写
     ============================================================ */
  function measure(obj, scene) {
    var out = {};
    if (!obj) return out;

    /* 有 scene 就现算（点可能刚被移动过，缓存还没刷新）；
       没传 scene 时退回 recompute 写下的缓存，总比一律 NaN 有用 */
    var live = !!scene && isArr(scene.objects);

    if (obj.type === 'segment') {
      if (live) {
        var d = lineData(scene, obj, 0);
        if (d) {
          out.length = Math.sqrt(d.dx * d.dx + d.dy * d.dy);
          out.slope = slopeFrom(d.dx, d.dy);
        } else {
          out.length = NaN;
          out.slope = NaN;
        }
      } else {
        out.length = numOr(obj.length, NaN);
        out.slope = (typeof obj.slope === 'number') ? obj.slope : NaN;
      }
      return out;
    }

    if (obj.type === 'line' || obj.type === 'perpendicular' || obj.type === 'parallel') {
      if (live) {
        var dl = lineData(scene, obj, 0);
        out.slope = dl ? slopeFrom(dl.dx, dl.dy) : NaN;
      } else {
        out.slope = (typeof obj.slope === 'number') ? obj.slope : NaN;
      }
      return out;
    }

    if (obj.type === 'circle') {
      var r;
      if (live) {
        var cd = circleData(scene, obj);
        r = cd ? cd.r : NaN;
      } else {
        r = numOr(obj.radius, NaN);
      }
      out.radius = r;
      out.circumference = 2 * Math.PI * r;
      out.area = Math.PI * r * r;
      return out;
    }

    if (obj.type === 'polygon') {
      if (live) {
        var pts = polygonPoints(scene, obj);
        out.area = pts ? polyArea(pts) : NaN;
        out.perimeter = pts ? polyPerimeter(pts) : NaN;
      } else {
        out.area = numOr(obj.area, NaN);
        out.perimeter = numOr(obj.perimeter, NaN);
      }
      return out;
    }

    return out;
  }

  var MEASURE_KEYS = ['length', 'slope', 'radius', 'circumference', 'area', 'perimeter'];

  function getProp(obj, name, scene) {
    if (!obj) return undefined;

    if (name === 'name') return obj.label;
    if (name === 'type') return obj.type;
    if (name === 'visible') return obj.visible !== false;
    if (name === 'color') return obj.color;
    if (name === 'num') return isNum(obj.num) ? obj.num : 0;
    if (name === 'ok') return obj.ok === true;
    if (name === 'msg') return obj.msg == null ? '' : String(obj.msg);

    if (isPointLike(obj)) {
      if (name === 'x') return isNum(obj.x) ? obj.x : NaN;
      if (name === 'y') return isNum(obj.y) ? obj.y : NaN;
    }

    for (var i = 0; i < MEASURE_KEYS.length; i += 1) {
      if (MEASURE_KEYS[i] === name) return measure(obj, scene)[name];
    }

    return undefined;
  }

  function setProp(obj, name, value, scene) {
    if (!obj) throw new Error('对象不存在');

    if (name === 'visible') { obj.visible = !!value; return true; }
    if (name === 'ok') { obj.ok = !!value; return true; }
    if (name === 'num') { obj.num = needNum(name, value); return true; }
    if (name === 'msg') { obj.msg = value == null ? '' : String(value); return true; }
    if (name === 'color') {
      var c = validColor(value);
      if (!c) throw new Error('颜色写法有误: ' + value);
      obj.color = c;
      return true;
    }
    if (name === 'x' || name === 'y') {
      if (obj.type !== 'point' || !obj.free) throw new Error('属性只读: ' + name);
      obj[name] = needNum(name, value);
      return true;
    }
    throw new Error('属性只读: ' + name);
  }

  /* ============================================================
     命中测试
     ============================================================ */
  function distToLineLike(scene, obj, x, y) {
    var d = lineData(scene, obj, 0);
    if (!d || !isNum(d.dx) || !isNum(d.dy)) return Infinity;
    var len2 = d.dx * d.dx + d.dy * d.dy;
    if (!isNum(len2) || len2 <= EPS * EPS) return Infinity;

    var t = ((x - d.px) * d.dx + (y - d.py) * d.dy) / len2;
    if (obj.type === 'segment') {
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
    }
    var qx = d.px + d.dx * t;
    var qy = d.py + d.dy * t;
    return Math.sqrt((x - qx) * (x - qx) + (y - qy) * (y - qy));
  }

  function distToCircle(scene, obj, x, y) {
    var c = circleData(scene, obj);
    if (!c || !isNum(c.r)) return Infinity;
    var dx = x - c.cx;
    var dy = y - c.cy;
    return Math.abs(Math.sqrt(dx * dx + dy * dy) - c.r);
  }

  function distToPolygonBorder(pts, x, y) {
    var best = Infinity;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
      var ax = pts[j].x, ay = pts[j].y;
      var bx = pts[i].x, by = pts[i].y;
      var dx = bx - ax, dy = by - ay;
      var len2 = dx * dx + dy * dy;
      var t = len2 <= EPS * EPS ? 0 : ((x - ax) * dx + (y - ay) * dy) / len2;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
      var qx = ax + dx * t;
      var qy = ay + dy * t;
      var dd = Math.sqrt((x - qx) * (x - qx) + (y - qy) * (y - qy));
      if (dd < best) best = dd;
    }
    return best;
  }

  function pick(scene, x, y, tolWorld) {
    if (!ensure(scene)) return null;
    var px = Number(x);
    var py = Number(y);
    if (!isFinite(px) || !isFinite(py)) return null;

    var tol = (isNum(tolWorld) && tolWorld > 0) ? tolWorld : 0.1;
    var objs = scene.objects;
    var i, o, d;
    var best = null;
    var bestD = Infinity;

    /* 1) 点优先级最高 */
    for (i = 0; i < objs.length; i += 1) {
      o = objs[i];
      if (!o || o.visible === false || !isPointLike(o)) continue;
      if (!isNum(o.x) || !isNum(o.y)) continue;
      d = Math.sqrt((o.x - px) * (o.x - px) + (o.y - py) * (o.y - py));
      if (d <= tol && d < bestD) { bestD = d; best = o.id; }
    }
    if (best) return best;

    /* 2) 线段 / 直线 / 垂线 / 平行线 / 圆 */
    for (i = 0; i < objs.length; i += 1) {
      o = objs[i];
      if (!o || o.visible === false) continue;
      if (!isLineLike(o) && o.type !== 'circle') continue;
      d = (o.type === 'circle') ? distToCircle(scene, o, px, py) : distToLineLike(scene, o, px, py);
      if (d <= tol && d < bestD) { bestD = d; best = o.id; }
    }
    if (best) return best;

    /* 3) 多边形：先看边，再看内部（内部命中小面积优先） */
    var bestArea = Infinity;
    for (i = 0; i < objs.length; i += 1) {
      o = objs[i];
      if (!o || o.visible === false || o.type !== 'polygon') continue;
      var pts = polygonPoints(scene, o);
      if (!pts) continue;
      d = distToPolygonBorder(pts, px, py);
      if (d <= tol && d < bestD) { bestD = d; best = o.id; }
    }
    if (best) return best;

    for (i = 0; i < objs.length; i += 1) {
      o = objs[i];
      if (!o || o.visible === false || o.type !== 'polygon') continue;
      var ps = polygonPoints(scene, o);
      if (!ps || !inPolygon(ps, px, py)) continue;
      var area = polyArea(ps);
      if (area < bestArea) { bestArea = area; best = o.id; }
    }
    return best;
  }

  /* ============================================================
     导出
     ============================================================ */
  var geo = (SL.math.geometry = SL.math.geometry || {});
  geo.TYPES = TYPES;
  geo.defaultScene = defaultScene;
  geo.normalize = normalize;
  geo.addPoint = addPoint;
  geo.addSegment = addSegment;
  geo.addLine = addLine;
  geo.addCircle = addCircle;
  geo.addPolygon = addPolygon;
  geo.addMidpoint = addMidpoint;
  geo.addIntersection = addIntersection;
  geo.addPerpendicular = addPerpendicular;
  geo.addParallel = addParallel;
  geo.removeObject = removeObject;
  geo.recompute = recompute;
  geo.getProp = getProp;
  geo.setProp = setProp;
  geo.measure = measure;
  geo.pick = pick;
  geo.EPS = EPS;          /* 附加导出：容差常量，方便上层统一口径 */
})();
