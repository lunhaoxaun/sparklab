/* 数学绘图器 · JSXGraph 画布内核（SL.math.board）
   ---------------------------------------------------------------
   把 scene 里的几何对象 / 函数表达式映射成 JSXGraph 元素，对外只暴露
   一个 handle：重建、视口、命中、属性、构造、导出。

   设计约定：
   - scene 是唯一真相：JXG 元素只按 scene 定义创建，不把 JXG 内部对象
     序列化进 localStorage；自由点拖动时只改元素，松手后 syncScene 写回。
   - 元素 name 严格等于 scene 对象的 label，C++ 脚本按名字寻址。
   - 派生对象（中点 / 交点 / 垂线 / 平行线 / 多边形）全部交给 JSXGraph
     自己算，本文件不再写几何公式。
   - 视口用 scene.view {cx, cy, pxPerUnit} 表示，boundingbox 由它和容器
     尺寸换算；坐标往返也按同一个 boundingbox 手算，避免依赖 JXG 私有 API。
   --------------------------------------------------------------- */
(function () {
  'use strict';

  var SL = (window.SparkLab = window.SparkLab || {});
  SL.math = SL.math || {};

  var JXG = window.JXG;

  var PICK_PX = 8;
  var MIN_SCALE = 4;
  var MAX_SCALE = 400;
  var ACCENT = '#7c5cff';
  var POINT_COLOR = '#d94b4b';
  var SHAPE_COLOR = '#2a63e8';
  var CURVE_COLOR = '#2a63e8';

  var POINT_TYPES = { point: 1, midpoint: 1, intersection: 1 };
  var LINE_TYPES = { segment: 1, line: 1, perpendicular: 1, parallel: 1 };

  var ID_PREFIX = {
    point: 'p', segment: 's', line: 'l', circle: 'c', polygon: 'g',
    midpoint: 'm', intersection: 'x', perpendicular: 'q', parallel: 'r'
  };

  var NAMED_COLORS = {
    red: '#d94b4b', green: '#1f9d64', blue: '#2a63e8', orange: '#f08a3c',
    purple: '#7c5cff', teal: '#0f9f9a', gray: '#7c8da6', grey: '#7c8da6',
    black: '#1f2328', white: '#ffffff', gold: '#c9971f', pink: '#e06a9a',
    brown: '#8a6446', cyan: '#17a2b8', magenta: '#c0399f', navy: '#274c77',
    olive: '#6b7a33', lime: '#5aa832', maroon: '#8c3b3b', silver: '#b8c4d4',
    coral: '#e8664f', indigo: '#4b4fa8', yellow: '#c9971f', violet: '#7c5cff'
  };

  /* 全局主题：只设一次，之后所有 board 共用。
     文本必须走 SVG（默认 html 会生成 foreignObject，导出 PNG 时无法进 canvas）。 */
  if (JXG && JXG.Options) {
    if (JXG.Options.text) JXG.Options.text.display = 'svg';
    if (JXG.Options.infobox) JXG.Options.infobox.show = false;
    if (JXG.Options.navigation) JXG.Options.navigation.show = false;
    if (JXG.Options.axis) {
      JXG.Options.axis.strokeColor = '#9aa8bb';
      JXG.Options.axis.strokeWidth = 1;
    }
    if (JXG.Options.label) JXG.Options.label.strokeColor = '#4b5a70';
  }

  function has(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  function numOr(v, fb) {
    var n = Number(v);
    return isFinite(n) ? n : fb;
  }

  function normalizeColor(value, fallback) {
    var fb = fallback || null;
    if (typeof value !== 'string') return fb;
    var s = value.replace(/^\s+|\s+$/g, '').toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(s)) return s;
    if (/^#[0-9a-f]{3}$/.test(s)) {
      return '#' + s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3);
    }
    if (has(NAMED_COLORS, s)) return NAMED_COLORS[s];
    if (/^rgba?\(/.test(s)) return s;
    return fb;
  }

  function colorOf(o, fallback) {
    if (o && typeof o.color === 'string') {
      var c = normalizeColor(o.color, null);
      if (c) return c;
    }
    return fallback || SHAPE_COLOR;
  }

  function isPointLike(o) { return !!o && has(POINT_TYPES, o.type); }
  function isLineLike(o) { return !!o && has(LINE_TYPES, o.type); }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function stamp() {
    var d = new Date();
    return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) +
      '-' + pad2(d.getHours()) + pad2(d.getMinutes());
  }

  function measureBox(container) {
    var w = container.clientWidth || container.offsetWidth || 0;
    var h = container.clientHeight || container.offsetHeight || 0;
    if (!w) w = 800;
    if (!h) h = 600;
    return { w: w, h: h };
  }

  function bboxFor(view, w, h) {
    var halfW = w / (2 * view.pxPerUnit);
    var halfH = h / (2 * view.pxPerUnit);
    return [view.cx - halfW, view.cy + halfH, view.cx + halfW, view.cy - halfH];
  }

  function distToSeg(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len2 = dx * dx + dy * dy;
    var t = len2 > 0 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    var qx = x1 + t * dx;
    var qy = y1 + t * dy;
    return Math.sqrt((px - qx) * (px - qx) + (py - qy) * (py - qy));
  }

  function distToLine(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (!len) return Infinity;
    return Math.abs((px - x1) * dy - (py - y1) * dx) / len;
  }

  function dist(ax, ay, bx, by) {
    return Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by));
  }

  function create(container, scene, opts) {
    if (!JXG || !JXG.JSXGraph) throw new Error('JSXGraph 未加载');
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('board 需要一个容器元素');
    }

    opts = opts || {};
    var onDrag = typeof opts.onDrag === 'function' ? opts.onDrag : null;
    var onDragEnd = typeof opts.onDragEnd === 'function' ? opts.onDragEnd : null;

    var sc = scene;
    if (!sc || typeof sc !== 'object') sc = {};
    if (!sc.objects) sc.objects = [];
    if (!sc.expressions) sc.expressions = [];
    if (!sc.params || typeof sc.params !== 'object') sc.params = {};
    if (!sc.view || typeof sc.view !== 'object') sc.view = { cx: 0, cy: 0, pxPerUnit: 48 };

    var view = sc.view;
    if (!isNum(view.cx)) view.cx = 0;
    if (!isNum(view.cy)) view.cy = 0;
    if (!isNum(view.pxPerUnit) || view.pxPerUnit <= 0) view.pxPerUnit = 48;

    var size = measureBox(container);

    var board = JXG.JSXGraph.initBoard(container, {
      boundingbox: bboxFor(view, size.w, size.h),
      axis: true,
      grid: true,
      showNavigation: false,
      showCopyright: false,
      showInfobox: false,
      pan: false,
      zoom: false,
      keepAspectRatio: true,
      renderer: 'svg',
      resize: false
    });

    var elements = {};      /* id -> JXG element（含表达式） */
    var created = [];       /* 创建顺序，清理时倒序删 */
    var selectedId = null;
    var hoverId = null;
    var destroyed = false;
    var seq = 0;

    function objects() { return sc.objects || []; }
    function expressions() { return sc.expressions || []; }

    function byId(id) {
      var list = objects();
      for (var i = 0; i < list.length; i += 1) {
        if (list[i] && list[i].id === id) return list[i];
      }
      return null;
    }

    function nextId(prefix) {
      seq += 1;
      return prefix + Date.now().toString(36) + '-' + seq;
    }

    function usedLabels() {
      var used = {};
      var i;
      var list = objects();
      for (i = 0; i < list.length; i += 1) {
        if (list[i] && list[i].label) used[list[i].label] = true;
      }
      var ex = expressions();
      for (i = 0; i < ex.length; i += 1) {
        if (ex[i] && ex[i].name) used[ex[i].name] = true;
      }
      return used;
    }

    function nextPointLabel(used) {
      var i;
      for (i = 0; i < 26; i += 1) {
        var ch = String.fromCharCode(65 + i);
        if (!used[ch]) return ch;
      }
      for (var round = 1; round < 100; round += 1) {
        for (i = 0; i < 26; i += 1) {
          var c = String.fromCharCode(65 + i) + round;
          if (!used[c]) return c;
        }
      }
      return 'P' + seq;
    }

    function nextSeq(used, prefix) {
      for (var i = 1; i < 10000; i += 1) {
        var name = prefix + i;
        if (!used[name]) return name;
      }
      return prefix + 'x' + seq;
    }

    function nextExprName(used) {
      var letters = ['f', 'g', 'h', 'j', 'k', 'm', 'n', 'p', 'q', 'r', 's', 't',
        'u', 'v', 'w', 'y', 'z', 'a', 'b', 'c', 'd', 'l', 'o'];
      var i;
      for (i = 0; i < letters.length; i += 1) {
        if (!used[letters[i]]) return letters[i];
      }
      for (var round = 2; round < 100; round += 1) {
        for (i = 0; i < letters.length; i += 1) {
          var name = letters[i] + round;
          if (!used[name]) return name;
        }
      }
      return 'f' + seq;
    }

    function baseObject(type, label, color) {
      return {
        id: nextId(ID_PREFIX[type] || 'o'),
        type: type,
        label: label,
        color: color || SHAPE_COLOR,
        visible: true,
        num: 0,
        ok: false,
        msg: ''
      };
    }

    function pointXY(id) {
      var o = byId(id);
      var el = elements[id];
      if (el && typeof el.X === 'function') {
        var x = el.X();
        var y = el.Y();
        if (isFinite(x) && isFinite(y)) return { x: x, y: y };
      }
      if (o && isPointLike(o) && isNum(o.x) && isNum(o.y)) return { x: o.x, y: o.y };
      return null;
    }

    /* ---------- 视口 ---------- */
    function applyView() {
      if (destroyed) return;
      var box = bboxFor(view, size.w, size.h);
      board.setBoundingBox(box, false);
      board.update();
    }

    function toScreen(x, y) {
      var box = board.getBoundingBox();
      var w = size.w;
      var h = size.h;
      return {
        x: (x - box[0]) / (box[2] - box[0]) * w,
        y: (box[1] - y) / (box[1] - box[3]) * h
      };
    }

    function toWorld(px, py) {
      var box = board.getBoundingBox();
      var w = size.w;
      var h = size.h;
      return {
        x: box[0] + (px / w) * (box[2] - box[0]),
        y: box[1] - (py / h) * (box[1] - box[3])
      };
    }

    function screenScale() {
      var box = board.getBoundingBox();
      return size.w / (box[2] - box[0]);
    }

    function zoomAt(px, py, factor) {
      if (destroyed || !isNum(factor) || factor <= 0) return;
      var w0 = toWorld(px, py);
      var next = view.pxPerUnit * factor;
      if (next < MIN_SCALE) next = MIN_SCALE;
      if (next > MAX_SCALE) next = MAX_SCALE;
      view.pxPerUnit = next;
      view.cx = w0.x - (px - size.w / 2) / next;
      view.cy = w0.y + (py - size.h / 2) / next;
      applyView();
    }

    function panBy(dxPx, dyPx) {
      if (destroyed) return;
      var s = view.pxPerUnit;
      view.cx -= dxPx / s;
      view.cy += dyPx / s;
      applyView();
    }

    /* ---------- 元素创建 ---------- */
    function pointOptions(o, fixed) {
      var color = colorOf(o, POINT_COLOR);
      return {
        name: o.label,
        withLabel: true,
        label: { offset: [8, 8], strokeColor: '#4b5a70', fontSize: 12 },
        size: 4,
        strokeWidth: 1,
        fillColor: color,
        strokeColor: color,
        highlightFillColor: color,
        highlightStrokeColor: color,
        fixed: !!fixed,
        highlight: false,
        layer: 9
      };
    }

    function shapeOptions(o, width) {
      var color = colorOf(o, SHAPE_COLOR);
      return {
        name: o.label,
        withLabel: false,
        strokeColor: color,
        strokeWidth: width || 2,
        highlight: false,
        layer: 6
      };
    }

    function areaOptions(o, width) {
      var color = colorOf(o, SHAPE_COLOR);
      return {
        name: o.label,
        withLabel: false,
        strokeColor: color,
        strokeWidth: width || 2,
        fillColor: color,
        fillOpacity: o.type === 'polygon' ? 0.12 : 0.06,
        highlight: false,
        layer: o.type === 'polygon' ? 4 : 5
      };
    }

    function bindDrag(el, o) {
      el.on('drag', function () {
        try {
          var x = el.X();
          var y = el.Y();
          if (isFinite(x)) o.x = x;
          if (isFinite(y)) o.y = y;
          if (onDrag) onDrag(o);
        } catch (e) { /* 拖动回调不允许把 JXG 拖崩 */ }
      });
      el.on('up', function () {
        try {
          var x = el.X();
          var y = el.Y();
          if (isFinite(x)) o.x = x;
          if (isFinite(y)) o.y = y;
          if (onDragEnd) onDragEnd(o);
        } catch (e) { /* 同上 */ }
      });
    }

    function createElement(o) {
      if (!o || !o.id || !o.type) return null;
      var el = null;
      var A;
      var B;

      if (o.type === 'point') {
        el = board.create('point', [numOr(o.x, 0), numOr(o.y, 0)], pointOptions(o, false));
        bindDrag(el, o);
        o.free = o.free !== false;
      } else if (o.type === 'segment') {
        A = elements[o.a];
        B = elements[o.b];
        if (!A || !B) return null;
        el = board.create('segment', [A, B], shapeOptions(o, 2));
      } else if (o.type === 'line') {
        A = elements[o.a];
        B = elements[o.b];
        if (!A || !B) return null;
        el = board.create('line', [A, B], shapeOptions(o, 2));
      } else if (o.type === 'circle') {
        A = elements[o.center];
        B = elements[o.through];
        if (!A || !B) return null;
        el = board.create('circle', [A, B], areaOptions(o, 2));
      } else if (o.type === 'polygon') {
        var pts = [];
        var ids = o.points || [];
        for (var i = 0; i < ids.length; i += 1) {
          if (!elements[ids[i]]) return null;
          pts.push(elements[ids[i]]);
        }
        if (pts.length < 3) return null;
        el = board.create('polygon', pts, areaOptions(o, 2));
      } else if (o.type === 'midpoint') {
        A = elements[o.of && o.of[0]];
        B = elements[o.of && o.of[1]];
        if (!A || !B) return null;
        el = board.create('midpoint', [A, B], pointOptions(o, true));
      } else if (o.type === 'intersection') {
        A = elements[o.of && o.of[0]];
        B = elements[o.of && o.of[1]];
        if (!A || !B) return null;
        el = board.create('intersection', [A, B, Number(o.index) === 1 ? 1 : 0], pointOptions(o, true));
      } else if (o.type === 'perpendicular' || o.type === 'parallel') {
        A = elements[o.through];
        B = elements[o.ref];
        if (!A || !B) return null;
        el = board.create(o.type, [A, B], shapeOptions(o, 2));
      } else {
        return null;
      }

      if (!el) return null;
      elements[o.id] = el;
      created.push(el);
      return el;
    }

    function buildExpressions() {
      var list = expressions();
      var exprApi = SL.math.expr;
      for (var i = 0; i < list.length; i += 1) {
        var e = list[i];
        if (!e || !e.id) continue;
        var compiled = exprApi && typeof exprApi.compile === 'function' ? exprApi.compile(e.expr) : null;
        if (!compiled || !compiled.ok) {
          e.error = compiled && compiled.error ? compiled.error : { message: '表达式无法解析', line: 1, col: 1 };
          continue;
        }
        e.error = null;
        var fn = (function (cc) {
          return function (x) { return cc.eval(x, sc.params || {}); };
        }(compiled));
        try {
          var el = board.create('functiongraph', [fn], {
            name: e.name,
            withLabel: false,
            strokeColor: colorOf(e, CURVE_COLOR),
            strokeWidth: 2,
            highlight: false,
            layer: 3,
            visible: e.visible !== false
          });
          elements[e.id] = el;
          created.push(el);
        } catch (err) {
          e.error = { message: err && err.message ? err.message : '函数图像创建失败', line: 1, col: 1 };
        }
      }
    }

    function clearElements() {
      for (var i = created.length - 1; i >= 0; i -= 1) {
        try { board.removeObject(created[i], true); } catch (e) { /* 已被父对象带走 */ }
      }
      created.length = 0;
      elements = {};
      try { board.update(); } catch (e2) { /* 忽略空 board */ }
    }

    /* ---------- 场景规范化 / 重建 ---------- */
    function normalizeScene() {
      if (!sc.objects) sc.objects = [];
      if (!sc.expressions) sc.expressions = [];
      if (!sc.params || typeof sc.params !== 'object') sc.params = {};
      var keep = [];
      var seen = {};
      for (var i = 0; i < sc.objects.length; i += 1) {
        var o = sc.objects[i];
        if (!o || typeof o !== 'object' || !o.id || !o.type) continue;
        if (has(POINT_TYPES, o.type) || has(LINE_TYPES, o.type) || o.type === 'circle' || o.type === 'polygon') {
          if (!o.label) o.label = o.type === 'point' ? 'A' : o.type;
          if (seen[o.label]) continue;
          seen[o.label] = true;
          keep.push(o);
        }
      }
      sc.objects = keep;
    }

    function rebuild(nextScene) {
      if (destroyed) return;
      if (nextScene && nextScene !== sc) {
        sc = nextScene;
        if (!sc.view || typeof sc.view !== 'object') sc.view = view;
        view = sc.view;
      }
      if (!sc.objects) sc.objects = [];
      if (!sc.expressions) sc.expressions = [];
      if (!sc.params || typeof sc.params !== 'object') sc.params = {};
      if (!sc.view || typeof sc.view !== 'object') sc.view = view;

      normalizeScene();
      var keepSel = selectedId;
      clearElements();
      size = measureBox(container);
      if (typeof board.resizeContainer === 'function') {
        board.resizeContainer(size.w, size.h, true);
      }
      applyView();

      var list = objects();
      var pending = [];
      var i;
      var o;
      for (i = 0; i < list.length; i += 1) {
        o = list[i];
        if (!o || !o.id) continue;
        if (o.type === 'point') {
          try { createElement(o); } catch (e) { pending.push(o); }
        } else {
          pending.push(o);
        }
      }
      for (var round = 0; round < 8 && pending.length; round += 1) {
        var rest = [];
        for (i = 0; i < pending.length; i += 1) {
          var made = null;
          try { made = createElement(pending[i]); } catch (e2) { made = null; }
          if (!made) rest.push(pending[i]);
        }
        if (rest.length === pending.length) break;
        pending = rest;
      }

      buildExpressions();
      board.update();
      selectedId = keepSel;
      applyAllStyles();
      syncScene();
    }

    function syncScene(sceneRef) {
      var list = (sceneRef && sceneRef.objects) || objects();
      for (var i = 0; i < list.length; i += 1) {
        var o = list[i];
        if (!o || !o.id || !isPointLike(o)) continue;
        var el = elements[o.id];
        if (!el || typeof el.X !== 'function') continue;
        var x = el.X();
        var y = el.Y();
        if (isFinite(x) && isFinite(y)) {
          o.x = x;
          o.y = y;
        }
      }
    }

    /* ---------- 选中 / 悬停 ---------- */
    function applyOne(o) {
      var el = elements[o.id];
      if (!el) return;
      var sel = o.id === selectedId;
      var hov = o.id === hoverId;
      var base = colorOf(o, isPointLike(o) ? POINT_COLOR : SHAPE_COLOR);
      var attrs = { highlight: false };
      if (isPointLike(o)) {
        attrs.strokeColor = sel ? ACCENT : base;
        attrs.fillColor = sel ? ACCENT : base;
        attrs.size = 4 + (sel ? 2 : (hov ? 1 : 0));
        attrs.strokeWidth = 1;
      } else {
        attrs.strokeColor = sel ? ACCENT : base;
        attrs.strokeWidth = 2 + (sel ? 2 : (hov ? 1 : 0));
        if (o.type === 'circle' || o.type === 'polygon') {
          attrs.fillColor = sel ? ACCENT : base;
        }
      }
      try { el.setAttribute(attrs); } catch (e) { /* 某些元素不接受 fillColor */ }
    }

    function applyAllStyles() {
      var list = objects();
      for (var i = 0; i < list.length; i += 1) {
        if (list[i]) applyOne(list[i]);
      }
      var ex = expressions();
      for (var k = 0; k < ex.length; k += 1) {
        var el = elements[ex[k].id];
        if (!el) continue;
        try {
          el.setAttribute({
            strokeColor: colorOf(ex[k], CURVE_COLOR),
            strokeWidth: 2,
            visible: ex[k].visible !== false
          });
        } catch (e2) { /* 忽略 */ }
      }
      try { board.update(); } catch (e3) { /* 忽略 */ }
    }

    function setSelection(id) {
      selectedId = id == null ? null : id;
      applyAllStyles();
    }

    function setHover(id) {
      hoverId = id == null ? null : id;
      applyAllStyles();
    }

    /* ---------- 构造 ---------- */
    function pushObject(o) {
      sc.objects.push(o);
      board.update();
      return o;
    }

    function addPoint(x, y) {
      if (destroyed) return null;
      var o = baseObject('point', nextPointLabel(usedLabels()), POINT_COLOR);
      o.x = numOr(x, 0);
      o.y = numOr(y, 0);
      o.free = true;
      try { createElement(o); } catch (e) { return null; }
      return pushObject(o);
    }

    function addSegment(aId, bId) {
      if (destroyed) return null;
      var A = byId(aId);
      var B = byId(bId);
      if (!isPointLike(A) || !isPointLike(B) || aId === bId) return null;
      var used = usedLabels();
      var label = A.label + B.label;
      if (used[label]) label = nextSeq(used, 's');
      var o = baseObject('segment', label, SHAPE_COLOR);
      o.a = aId;
      o.b = bId;
      try { if (!createElement(o)) return null; } catch (e) { return null; }
      return pushObject(o);
    }

    function addLine(aId, bId) {
      if (destroyed) return null;
      var A = byId(aId);
      var B = byId(bId);
      if (!isPointLike(A) || !isPointLike(B) || aId === bId) return null;
      var o = baseObject('line', nextSeq(usedLabels(), 'l'), SHAPE_COLOR);
      o.a = aId;
      o.b = bId;
      try { if (!createElement(o)) return null; } catch (e) { return null; }
      return pushObject(o);
    }

    function addCircle(centerId, throughId) {
      if (destroyed) return null;
      var C = byId(centerId);
      var T = byId(throughId);
      if (!isPointLike(C) || !isPointLike(T) || centerId === throughId) return null;
      var o = baseObject('circle', nextSeq(usedLabels(), 'c'), SHAPE_COLOR);
      o.center = centerId;
      o.through = throughId;
      try { if (!createElement(o)) return null; } catch (e) { return null; }
      return pushObject(o);
    }

    function addPolygon(pointIds) {
      if (destroyed || !pointIds || !pointIds.length) return null;
      var ids = [];
      var seen = {};
      for (var i = 0; i < pointIds.length; i += 1) {
        var p = byId(pointIds[i]);
        if (!isPointLike(p) || seen[p.id]) continue;
        seen[p.id] = true;
        ids.push(p.id);
      }
      if (ids.length < 3) return null;
      var o = baseObject('polygon', nextSeq(usedLabels(), 'poly'), SHAPE_COLOR);
      o.points = ids;
      try { if (!createElement(o)) return null; } catch (e) { return null; }
      return pushObject(o);
    }

    function addMidpoint(aId, bId) {
      if (destroyed) return null;
      var A = byId(aId);
      var B = byId(bId);
      if (!isPointLike(A) || !isPointLike(B)) return null;
      var o = baseObject('midpoint', nextSeq(usedLabels(), 'M'), POINT_COLOR);
      o.of = [aId, bId];
      try { if (!createElement(o)) return null; } catch (e) { return null; }
      var el = elements[o.id];
      if (el) { o.x = el.X(); o.y = el.Y(); }
      return pushObject(o);
    }

    function addIntersection(aId, bId, index) {
      if (destroyed) return null;
      var A = byId(aId);
      var B = byId(bId);
      if (!A || !B || A.id === B.id) return null;
      if (isPointLike(A) || isPointLike(B)) return null;
      var aShape = isLineLike(A) || A.type === 'circle';
      var bShape = isLineLike(B) || B.type === 'circle';
      if (!aShape || !bShape) return null;
      var bothLines = isLineLike(A) && isLineLike(B);
      var idx = Number(index) === 1 ? 1 : 0;
      if (bothLines && idx === 1) return null;   /* 两条线只有一个交点 */
      var o = baseObject('intersection', nextSeq(usedLabels(), 'X'), POINT_COLOR);
      o.of = [aId, bId];
      o.index = idx;
      try { if (!createElement(o)) return null; } catch (e) { return null; }
      var el = elements[o.id];
      if (el) { o.x = el.X(); o.y = el.Y(); }
      return pushObject(o);
    }

    function addLineLike(type, throughId, refId) {
      if (destroyed) return null;
      var P = byId(throughId);
      var R = byId(refId);
      if (!isPointLike(P) || !isLineLike(R)) return null;
      var o = baseObject(type, nextSeq(usedLabels(), 'p'), SHAPE_COLOR);
      o.through = throughId;
      o.ref = refId;
      try { if (!createElement(o)) return null; } catch (e) { return null; }
      return pushObject(o);
    }

    function addPerpendicular(throughId, refId) { return addLineLike('perpendicular', throughId, refId); }
    function addParallel(throughId, refId) { return addLineLike('parallel', throughId, refId); }

    function addFunction(src, fnOpts) {
      if (destroyed) return null;
      fnOpts = fnOpts || {};
      var exprApi = SL.math.expr;
      var compiled = exprApi && typeof exprApi.compile === 'function' ? exprApi.compile(src) : null;
      if (!compiled || !compiled.ok) {
        return {
          id: null,
          error: compiled && compiled.error ? compiled.error : { message: '表达式无法解析', line: 1, col: 1 }
        };
      }
      var used = usedLabels();
      var e = {
        id: fnOpts.id || nextId('e'),
        name: fnOpts.name || nextExprName(used),
        expr: String(src == null ? '' : src),
        color: normalizeColor(fnOpts.color, CURVE_COLOR),
        visible: fnOpts.visible !== false
      };
      if (used[e.name]) e.name = nextExprName(used);
      sc.expressions.push(e);

      var fn = function (x) { return compiled.eval(x, sc.params || {}); };
      try {
        var el = board.create('functiongraph', [fn], {
          name: e.name,
          withLabel: false,
          strokeColor: e.color,
          strokeWidth: 2,
          highlight: false,
          layer: 3,
          visible: e.visible
        });
        elements[e.id] = el;
        created.push(el);
        board.update();
      } catch (err) {
        sc.expressions.pop();
        return { id: null, error: { message: err && err.message ? err.message : '函数图像创建失败', line: 1, col: 1 } };
      }
      return { id: e.id, error: null };
    }

    /* ---------- 删除 ---------- */
    function refsOf(o) {
      if (!o) return [];
      if (o.type === 'segment' || o.type === 'line') return [o.a, o.b];
      if (o.type === 'circle') return [o.center, o.through];
      if (o.type === 'polygon') return o.points ? o.points.slice() : [];
      if (o.type === 'midpoint' || o.type === 'intersection') return o.of ? o.of.slice() : [];
      if (o.type === 'perpendicular' || o.type === 'parallel') return [o.through, o.ref];
      return [];
    }

    function removeElement(id) {
      var el = elements[id];
      if (el) {
        try { board.removeObject(el, true); } catch (e) { /* 已随父对象移除 */ }
      }
      delete elements[id];
    }

    function removeObject(id) {
      if (destroyed) return [];
      var target = byId(id);
      if (!target) return [];

      var doomed = {};
      doomed[id] = true;
      var list = objects();
      for (var round = 0; round <= list.length; round += 1) {
        var grew = false;
        for (var i = 0; i < list.length; i += 1) {
          var o = list[i];
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

      var removed = [id];
      var kept = [];
      for (var j = 0; j < list.length; j += 1) {
        var obj = list[j];
        if (!obj) continue;
        if (doomed[obj.id]) {
          if (obj.id !== id) removed.push(obj.id);
          removeElement(obj.id);
          continue;
        }
        kept.push(obj);
      }
      sc.objects = kept;
      if (selectedId && doomed[selectedId]) selectedId = null;
      if (hoverId && doomed[hoverId]) hoverId = null;
      board.update();
      return removed;
    }

    /* ---------- 属性 / 测量 ---------- */
    function slopeFromPoints(A, B) {
      if (!A || !B) return NaN;
      var dx = B.x - A.x;
      var dy = B.y - A.y;
      if (!isNum(dx) || !isNum(dy)) return NaN;
      if (Math.abs(dx) < 1e-12) return Infinity;
      var s = dy / dx;
      return s === 0 ? 0 : s;
    }

    function measure(id) {
      var o = byId(id);
      var el = elements[id];
      var out = {};
      if (!o || !el) return out;

      if (o.type === 'segment') {
        out.length = typeof el.L === 'function' ? el.L() : NaN;
        out.slope = slopeFromPoints(pointXY(o.a), pointXY(o.b));
        return out;
      }
      if (o.type === 'line' || o.type === 'perpendicular' || o.type === 'parallel') {
        var s = typeof el.getSlope === 'function' ? el.getSlope() : NaN;
        out.slope = (typeof s === 'number') ? s : NaN;
        return out;
      }
      if (o.type === 'circle') {
        var r = typeof el.Radius === 'function' ? el.Radius() : NaN;
        out.radius = r;
        out.circumference = 2 * Math.PI * r;
        out.area = Math.PI * r * r;
        return out;
      }
      if (o.type === 'polygon') {
        out.area = typeof el.Area === 'function' ? el.Area() : NaN;
        out.perimeter = typeof el.Perimeter === 'function' ? el.Perimeter() : NaN;
        return out;
      }
      return out;
    }

    function getProp(id, name) {
      var o = byId(id);
      if (!o) return undefined;
      if (name === 'name') return o.label;
      if (name === 'type') return o.type;
      if (name === 'visible') return o.visible !== false;
      if (name === 'color') return o.color;
      if (name === 'num') return isNum(o.num) ? o.num : 0;

      if (name === 'x' || name === 'y') {
        if (!isPointLike(o)) return undefined;
        var xy = pointXY(id);
        if (xy) {
          var v = name === 'x' ? xy.x : xy.y;
          o[name] = v;
          return v;
        }
        return o[name];
      }

      var m = measure(id);
      if (has(m, name)) return m[name];
      return undefined;
    }

    function setProp(id, name, value) {
      var o = byId(id);
      if (!o) throw new Error('对象不存在');

      if (name === 'visible') {
        o.visible = !!value;
        var el = elements[id];
        if (el) el.setAttribute({ visible: !!value });
        board.update();
        return true;
      }
      if (name === 'num') {
        o.num = numOr(value, 0);
        return true;
      }
      if (name === 'color') {
        var c = normalizeColor(value, null);
        if (!c) throw new Error('颜色写法有误: ' + value);
        o.color = c;
        applyOne(o);
        board.update();
        return true;
      }
      if (name === 'x' || name === 'y') {
        if (o.type !== 'point' || o.free === false) throw new Error('属性只读: ' + name);
        o[name] = numOr(value, 0);
        var p = elements[id];
        if (p) p.setPosition(JXG.COORDS_BY_USER, [numOr(o.x, 0), numOr(o.y, 0)]);
        board.update();
        return true;
      }
      throw new Error('属性只读: ' + name);
    }

    /* ---------- 命中 ---------- */
    function lineWorld(o, depth) {
      if (!o || (depth || 0) > 8) return null;
      if (o.type === 'segment' || o.type === 'line') {
        var A = pointXY(o.a);
        var B = pointXY(o.b);
        if (!A || !B) return null;
        return { x: A.x, y: A.y, dx: B.x - A.x, dy: B.y - A.y, finite: o.type === 'segment' };
      }
      if (o.type === 'perpendicular' || o.type === 'parallel') {
        var P = pointXY(o.through);
        var L = lineWorld(byId(o.ref), (depth || 0) + 1);
        if (!P || !L) return null;
        if (o.type === 'perpendicular') {
          return { x: P.x, y: P.y, dx: -L.dy, dy: L.dx, finite: false };
        }
        return { x: P.x, y: P.y, dx: L.dx, dy: L.dy, finite: false };
      }
      return null;
    }

    function screenDist(o, px, py) {
      if (!o || o.visible === false) return Infinity;
      if (isLineLike(o)) {
        var L = lineWorld(o, 0);
        if (!L) return Infinity;
        var a = toScreen(L.x, L.y);
        var b = toScreen(L.x + L.dx, L.y + L.dy);
        return L.finite ? distToSeg(px, py, a.x, a.y, b.x, b.y)
          : distToLine(px, py, a.x, a.y, b.x, b.y);
      }
      if (o.type === 'circle') {
        var C = pointXY(o.center);
        if (!C) return Infinity;
        var el = elements[o.id];
        var rw = el && typeof el.Radius === 'function' ? el.Radius() : NaN;
        if (!isNum(rw)) return Infinity;
        var c = toScreen(C.x, C.y);
        return Math.abs(dist(c.x, c.y, px, py) - rw * screenScale());
      }
      if (o.type === 'polygon') {
        var ids = o.points || [];
        var best = Infinity;
        for (var i = 0; i < ids.length; i += 1) {
          var A = pointXY(ids[i]);
          var B = pointXY(ids[(i + 1) % ids.length]);
          if (!A || !B) continue;
          var sa = toScreen(A.x, A.y);
          var sb = toScreen(B.x, B.y);
          var d = distToSeg(px, py, sa.x, sa.y, sb.x, sb.y);
          if (d < best) best = d;
        }
        return best;
      }
      return Infinity;
    }

    function pick(px, py) {
      if (destroyed || !isNum(px) || !isNum(py)) return null;
      var list = objects();
      var i;
      var o;
      var best = null;
      var bestD = PICK_PX;

      for (i = 0; i < list.length; i += 1) {
        o = list[i];
        if (!o || o.visible === false || !isPointLike(o)) continue;
        var xy = pointXY(o.id);
        if (!xy) continue;
        var sp = toScreen(xy.x, xy.y);
        var d = dist(sp.x, sp.y, px, py);
        if (d <= bestD) { bestD = d; best = o.id; }
      }
      if (best) return best;

      bestD = PICK_PX;
      for (i = 0; i < list.length; i += 1) {
        o = list[i];
        if (!o || o.visible === false) continue;
        if (!isLineLike(o) && o.type !== 'circle') continue;
        var dd = screenDist(o, px, py);
        if (dd < bestD) { bestD = dd; best = o.id; }
      }
      if (best) return best;

      bestD = PICK_PX;
      for (i = 0; i < list.length; i += 1) {
        o = list[i];
        if (!o || o.visible === false || o.type !== 'polygon') continue;
        var pd = screenDist(o, px, py);
        if (pd < bestD) { bestD = pd; best = o.id; }
      }
      return best;
    }

    /* ---------- 适应视图 ---------- */
    function fit() {
      if (destroyed) return;
      var minX = Infinity;
      var maxX = -Infinity;
      var minY = Infinity;
      var maxY = -Infinity;
      var any = false;

      function take(x, y) {
        if (!isNum(x) || !isNum(y)) return;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        any = true;
      }

      var list = objects();
      var i;
      for (i = 0; i < list.length; i += 1) {
        var o = list[i];
        if (!o || o.visible === false) continue;
        if (isPointLike(o)) {
          var xy = pointXY(o.id);
          if (xy) take(xy.x, xy.y);
        } else if (o.type === 'circle') {
          var C = pointXY(o.center);
          var el = elements[o.id];
          var r = el && typeof el.Radius === 'function' ? el.Radius() : NaN;
          if (C && isNum(r)) {
            take(C.x - r, C.y - r);
            take(C.x + r, C.y + r);
          }
        } else if (o.type === 'segment') {
          var A = pointXY(o.a);
          var B = pointXY(o.b);
          if (A) take(A.x, A.y);
          if (B) take(B.x, B.y);
        } else if (o.type === 'polygon') {
          var ids = o.points || [];
          for (var k = 0; k < ids.length; k += 1) {
            var P = pointXY(ids[k]);
            if (P) take(P.x, P.y);
          }
        }
      }

      var objMinX = minX;
      var objMaxX = maxX;
      var objMinY = minY;
      var objMaxY = maxY;

      if (!any) {
        objMinX = -10; objMaxX = 10;
        objMinY = -10; objMaxY = 10;
      }

      var padY = Math.max(2, (objMaxY - objMinY));
      var loY = objMinY - padY;
      var hiY = objMaxY + padY;
      var x0 = any ? objMinX : -10;
      var x1 = any ? objMaxX : 10;
      if (!(x1 > x0)) { x0 -= 5; x1 += 5; }

      var ex = expressions();
      var exprApi = SL.math.expr;
      for (i = 0; i < ex.length; i += 1) {
        var e = ex[i];
        if (!e || e.visible === false) continue;
        var compiled = exprApi && typeof exprApi.compile === 'function' ? exprApi.compile(e.expr) : null;
        if (!compiled || !compiled.ok) continue;
        for (var s = 0; s <= 120; s += 1) {
          var wx = x0 + (x1 - x0) * s / 120;
          var wy = compiled.eval(wx, sc.params || {});
          if (!isNum(wy)) continue;
          if (wy < loY || wy > hiY) continue;
          take(wx, wy);
        }
      }

      if (!any) {
        view.cx = 0;
        view.cy = 0;
        view.pxPerUnit = 48;
        applyView();
        return;
      }

      var bw = Math.max(0.5, maxX - minX);
      var bh = Math.max(0.5, maxY - minY);
      var sx = size.w / (bw * 1.18);
      var sy = size.h / (bh * 1.18);
      var scale = Math.min(sx, sy);
      if (scale < MIN_SCALE) scale = MIN_SCALE;
      if (scale > MAX_SCALE) scale = MAX_SCALE;
      view.pxPerUnit = scale;
      view.cx = (minX + maxX) / 2;
      view.cy = (minY + maxY) / 2;
      applyView();
    }

    /* ---------- 导出 ---------- */
    function saveBlob(blob, filename) {
      try {
        var a = document.createElement('a');
        var url = URL.createObjectURL(blob);
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        window.setTimeout(function () {
          try {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          } catch (e) { /* 忽略 */ }
        }, 0);
        return true;
      } catch (e2) {
        return false;
      }
    }

    function fallbackSVG(xml, filename, resolve) {
      var svgName = String(filename || '数学绘图器.png').replace(/\.png$/i, '') + '.svg';
      var ok = false;
      if (SL.download) {
        try { SL.download(svgName, xml); ok = true; } catch (e) { ok = false; }
      }
      if (!ok) {
        try {
          var blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
          ok = saveBlob(blob, svgName);
        } catch (e2) { ok = false; }
      }
      if (SL.toast) SL.toast(ok ? 'PNG 导出失败，已改为下载 SVG' : '导出失败，请稍后再试', 'warn');
      resolve(false);
    }

    function exportPNG(pngOpts) {
      pngOpts = pngOpts || {};
      var scale = isNum(pngOpts.scale) && pngOpts.scale > 0 ? pngOpts.scale : 2;
      var white = pngOpts.white !== false;
      var filename = pngOpts.filename || ('数学绘图器-' + stamp() + '.png');

      return new Promise(function (resolve) {
        if (destroyed) { resolve(false); return; }
        var xml;
        try {
          /* 只改副本：活动 SVG 一个属性都不动，否则导出会把画布撑到导出尺寸 */
          var live = board.renderer.svgRoot;
          var svg = live.cloneNode(true);
          svg.setAttribute('width', size.w);
          svg.setAttribute('height', size.h);
          if (!svg.getAttribute('xmlns')) {
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          }
          xml = new XMLSerializer().serializeToString(svg);
          if (xml.indexOf('xmlns=') < 0) {
            xml = xml.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
          }
        } catch (e) {
          resolve(false);
          return;
        }

        var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
        var img = new Image();
        img.onload = function () {
          try {
            var cv = document.createElement('canvas');
            cv.width = Math.round(size.w * scale);
            cv.height = Math.round(size.h * scale);
            var g = cv.getContext('2d');
            if (white) {
              g.fillStyle = '#ffffff';
              g.fillRect(0, 0, cv.width, cv.height);
            }
            g.drawImage(img, 0, 0, cv.width, cv.height);

            function finish(blob) {
              if (blob) {
                saveBlob(blob, filename);
                resolve(true);
              } else {
                fallbackSVG(xml, filename, resolve);
              }
            }
            if (cv.toBlob) {
              cv.toBlob(finish, 'image/png');
            } else {
              var dataUrl = cv.toDataURL('image/png');
              var bin = atob(dataUrl.split(',')[1]);
              var bytes = new Uint8Array(bin.length);
              for (var i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
              finish(new Blob([bytes], { type: 'image/png' }));
            }
          } catch (e2) {
            fallbackSVG(xml, filename, resolve);
          }
        };
        img.onerror = function () { fallbackSVG(xml, filename, resolve); };
        img.src = url;
      });
    }

    /* ---------- 尺寸 / 销毁 ---------- */
    function resize() {
      if (destroyed) return;
      var next = measureBox(container);
      if (next.w === size.w && next.h === size.h) {
        applyView();
        return;
      }
      size = next;
      if (typeof board.resizeContainer === 'function') {
        board.resizeContainer(size.w, size.h, true);
      }
      applyView();
    }

    function redraw() {
      if (destroyed) return;
      try { board.update(); } catch (e) { /* 忽略 */ }
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      clearElements();
      try { JXG.JSXGraph.freeBoard(board); } catch (e) { /* 已被外部释放 */ }
      try { container.innerHTML = ''; } catch (e2) { /* 忽略 */ }
    }

    rebuild(sc);
    selectedId = null;
    applyAllStyles();

    return {
      rebuild: rebuild,
      redraw: redraw,
      resize: resize,
      toWorld: toWorld,
      toScreen: toScreen,
      zoomAt: zoomAt,
      panBy: panBy,
      fit: fit,
      pick: pick,
      setSelection: setSelection,
      setHover: setHover,
      getProp: getProp,
      setProp: setProp,
      measure: measure,
      addPoint: addPoint,
      addSegment: addSegment,
      addLine: addLine,
      addCircle: addCircle,
      addPolygon: addPolygon,
      addMidpoint: addMidpoint,
      addIntersection: addIntersection,
      addPerpendicular: addPerpendicular,
      addParallel: addParallel,
      addFunction: addFunction,
      removeObject: removeObject,
      syncScene: syncScene,
      exportPNG: exportPNG,
      destroy: destroy
    };
  }

  SL.math.board = {
    create: create
  };
})();
