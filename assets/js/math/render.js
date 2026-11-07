/* 数学绘图器 · Canvas 渲染器（SL.math.render）
   ---------------------------------------------------------------
   一个 canvas 同时画「函数曲线」与「几何对象」，坐标系由 viewRef 决定：

     sx = W/2 + (x - cx) * pxPerUnit
     sy = H/2 - (y - cy) * pxPerUnit

   设计约束：
   - 只读 scene / viewRef：draw() 绝不改 scene.objects、也不重算几何
     （拖动点后由上层调 geometry.recompute 再重绘）；
     zoomAt / panBy / fit 会改 viewRef，这是渲染器分内的事。
   - 曲线用表达式引擎逐屏幕列采样；NaN / Infinity 断开，相邻点纵向跳变
     超过画布高度 1.5 倍也断开（防止 1/x 这类渐近线被连成一条竖线）。
   - 导出 PNG 时另建离屏 canvas 重新绘制，不依赖屏幕 canvas 的临时状态。

   对外接口：
     SL.math.render.create(canvas, scene, viewRef) -> {
       resize, draw, exportPNG, toWorld, toScreen,
       zoomAt, panBy, fit, pick, setSelection, setHover, destroy
     }

   依赖：SL.math.expr（曲线求值）、SL.fmt（刻度数字）；两者缺失时降级跳过。
   --------------------------------------------------------------- */
(function () {
  'use strict';

  var SL = (window.SparkLab = window.SparkLab || {});
  SL.math = SL.math || {};

  var DEFAULT_COLOR = '#7c5cff';
  var BG = '#fbfcff';
  var GRID = 'rgba(122, 146, 180, .22)';
  var AXIS = 'rgba(96, 118, 150, .72)';
  var TICK_TEXT = '#7b8ca5';
  var LABEL = '#2b3a50';
  var MIN_SCALE = 4;
  var MAX_SCALE = 400;
  var PICK_TOL = 8;
  var MAX_ZEROS = 20;

  /* 常见色名 → 十六进制（对象 color 可能是色名，也可能缺失/写错） */
  var NAMED = {
    red: '#d94b4b', green: '#1f9d64', blue: '#2a63e8', orange: '#f08a3c',
    purple: '#7c5cff', teal: '#0f9f9a', gray: '#7c8da6', grey: '#7c8da6',
    black: '#1f2328', white: '#ffffff', gold: '#c9971f', pink: '#e06a9a',
    brown: '#8a6446', cyan: '#17a2b8', magenta: '#c0399f', navy: '#274c77',
    olive: '#6b7a33', lime: '#5aa832', maroon: '#8c3b3b', silver: '#b8c4d4',
    coral: '#e8664f', indigo: '#4b4fa8'
  };

  function has(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  /* 颜色归一化：只放行 #rgb / #rrggbb / rgb() / rgba() / 已知色名 */
  function normalizeColor(value, fallback) {
    var fb = fallback || DEFAULT_COLOR;
    if (typeof value !== 'string') return fb;
    var s = value.replace(/^\s+|\s+$/g, '').toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(s)) {
      return '#' + s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3);
    }
    if (/^#[0-9a-f]{6}$/.test(s)) return s;
    if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0\.\d+)\s*)?\)$/.test(s)) return s;
    if (has(NAMED, s)) return NAMED[s];
    return fb;
  }

  function fmtNum(v, digits) {
    if (!isNum(v)) return '—';
    if (SL.fmt) return SL.fmt(v, digits == null ? 2 : digits);
    return Number(v).toFixed(digits == null ? 2 : digits);
  }

  function isPointLike(o) {
    return !!o && (o.type === 'point' || o.type === 'midpoint' || o.type === 'intersection');
  }

  function isLineLike(o) {
    return !!o && (o.type === 'segment' || o.type === 'line' ||
      o.type === 'perpendicular' || o.type === 'parallel');
  }

  function finitePoint(o) {
    return !!o && isNum(o.x) && isNum(o.y);
  }

  /* 二维线段裁剪（Liang-Barsky），返回 [x1,y1,x2,y2] 或 null */
  function clipSegment(x1, y1, x2, y2, w, h) {
    var t0 = 0;
    var t1 = 1;
    var dx = x2 - x1;
    var dy = y2 - y1;
    var p = [-dx, dx, -dy, dy];
    var q = [x1, w - x1, y1, h - y1];
    for (var i = 0; i < 4; i += 1) {
      if (p[i] === 0) {
        if (q[i] < 0) return null;
      } else {
        var r = q[i] / p[i];
        if (p[i] < 0) {
          if (r > t1) return null;
          if (r > t0) t0 = r;
        } else {
          if (r < t0) return null;
          if (r < t1) t1 = r;
        }
      }
    }
    return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
  }

  /* 点到线段距离 */
  function distToSegment(px, py, x1, y1, x2, y2) {
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

  /* 点到无限直线距离 */
  function distToLine(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (!len) return Infinity;
    return Math.abs((px - x1) * dy - (py - y1) * dx) / len;
  }

  /* ============================================================
     创建渲染器
     ============================================================ */
  function create(canvas, scene, viewRef) {
    if (!canvas || typeof canvas.getContext !== 'function') {
      throw new Error('渲染器需要一个 canvas 元素');
    }
    var ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('当前浏览器不支持 canvas 2d');

    var sc = scene || { objects: [], expressions: [], params: {}, view: {} };

    /* 只读场景：字段缺失时返回空数组，绝不往 scene 上补字段 */
    var EMPTY = [];
    function objects() { return sc.objects || EMPTY; }
    function expressions() { return sc.expressions || EMPTY; }

    var view = viewRef || sc.view || { cx: 0, cy: 0, pxPerUnit: 48 };
    if (!isNum(view.cx)) view.cx = 0;
    if (!isNum(view.cy)) view.cy = 0;
    if (!isNum(view.pxPerUnit) || view.pxPerUnit <= 0) view.pxPerUnit = 48;

    var cssW = 0;
    var cssH = 0;
    var dpr = 1;
    var selection = null;
    var hover = null;
    var destroyed = false;
    var rafId = 0;

    /* 采样点复用数组：避免每帧给每条曲线新建一堆临时对象 */
    var ZEROS = [];
    var BOX = {};

    /* 表达式编译缓存：同一条式子反复拖动时不重复解析 */
    var compiled = {};
    var compiledCount = 0;

    function compileOf(src) {
      if (!SL.math.expr || typeof SL.math.expr.compile !== 'function') return null;
      var key = String(src == null ? '' : src);
      if (has(compiled, key)) return compiled[key];
      var res = null;
      try { res = SL.math.expr.compile(key); } catch (e) { res = null; }
      if (compiledCount > 40) { compiled = {}; compiledCount = 0; }
      compiled[key] = res;
      compiledCount += 1;
      return res;
    }

    /* ---------- 尺寸 ---------- */
    function resize() {
      if (destroyed) return;
      var parent = canvas.parentNode;
      var w = parent ? parent.clientWidth : 0;
      var h = parent ? parent.clientHeight : 0;
      /* 容器没布局（display:none / 无头测试）时退回 canvas 自身的宽高 */
      if (!w) w = canvas.width || 400;
      if (!h) h = canvas.height || 300;

      var ratio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
      if (ratio > 3) ratio = 3;

      cssW = Math.max(1, Math.round(w));
      cssH = Math.max(1, Math.round(h));
      dpr = ratio;

      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
      if (canvas.style) {
        canvas.style.width = cssW + 'px';
        canvas.style.height = cssH + 'px';
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* ---------- 坐标变换 ---------- */
    function toScreen(x, y) {
      return {
        x: cssW / 2 + (x - view.cx) * view.pxPerUnit,
        y: cssH / 2 - (y - view.cy) * view.pxPerUnit
      };
    }

    function toWorld(px, py) {
      return {
        x: view.cx + (px - cssW / 2) / view.pxPerUnit,
        y: view.cy - (py - cssH / 2) / view.pxPerUnit
      };
    }

    function screenX(x) { return cssW / 2 + (x - view.cx) * view.pxPerUnit; }
    function screenY(y) { return cssH / 2 - (y - view.cy) * view.pxPerUnit; }

    function zoomAt(px, py, factor) {
      var f = Number(factor);
      if (!isNum(f) || f <= 0) return;
      var before = toWorld(px, py);
      var next = view.pxPerUnit * f;
      if (next < MIN_SCALE) next = MIN_SCALE;
      if (next > MAX_SCALE) next = MAX_SCALE;
      view.pxPerUnit = next;
      /* 反解 cx/cy，让光标下的世界坐标保持不动 */
      view.cx = before.x - (px - cssW / 2) / view.pxPerUnit;
      view.cy = before.y + (py - cssH / 2) / view.pxPerUnit;
    }

    function panBy(dx, dy) {
      view.cx -= (Number(dx) || 0) / view.pxPerUnit;
      view.cy += (Number(dy) || 0) / view.pxPerUnit;
    }

    /* ---------- 网格与坐标轴 ---------- */
    function gridStep() {
      var raw = 50 / view.pxPerUnit;
      var pow = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
      var n = raw / pow;
      var f = n <= 1 ? 1 : (n <= 2 ? 2 : (n <= 5 ? 5 : 10));
      return f * pow;
    }

    function decimalsFor(step) {
      if (step >= 1) return 0;
      var d = Math.ceil(-Math.log(step) / Math.LN10);
      return d > 6 ? 6 : d;
    }

    function drawGrid(g) {
      var step = gridStep();
      var dec = decimalsFor(step);
      var left = toWorld(0, 0).x;
      var right = toWorld(cssW, 0).x;
      var top = toWorld(0, 0).y;
      var bottom = toWorld(0, cssH).y;

      var axisY = (top >= 0 && bottom <= 0) ? screenY(0) : null;
      var axisX = (left <= 0 && right >= 0) ? screenX(0) : null;

      g.save();
      g.lineWidth = 1;
      g.strokeStyle = GRID;
      g.beginPath();
      var i;
      var x;
      var sx;
      var startX = Math.ceil(left / step) * step;
      var guard = 0;
      for (x = startX; x <= right + step * 1e-6 && guard < 400; x += step, guard += 1) {
        if (Math.abs(x) < step * 1e-6) continue;      /* 0 处交给坐标轴 */
        sx = Math.round(screenX(x)) + 0.5;
        g.moveTo(sx, 0);
        g.lineTo(sx, cssH);
      }
      var startY = Math.ceil(bottom / step) * step;
      guard = 0;
      for (var y = startY; y <= top + step * 1e-6 && guard < 400; y += step, guard += 1) {
        if (Math.abs(y) < step * 1e-6) continue;
        var sy = Math.round(screenY(y)) + 0.5;
        g.moveTo(0, sy);
        g.lineTo(cssW, sy);
      }
      g.stroke();

      /* 坐标轴加粗 */
      g.strokeStyle = AXIS;
      g.lineWidth = 1.6;
      g.beginPath();
      if (axisY != null) {
        var y0 = Math.round(axisY) + 0.5;
        g.moveTo(0, y0);
        g.lineTo(cssW, y0);
      }
      if (axisX != null) {
        var x0 = Math.round(axisX) + 0.5;
        g.moveTo(x0, 0);
        g.lineTo(x0, cssH);
      }
      g.stroke();

      /* 刻度数字 */
      g.fillStyle = TICK_TEXT;
      g.font = '11px ui-monospace, SFMono-Regular, Consolas, monospace';
      g.textBaseline = 'top';
      g.textAlign = 'center';
      var labelY = axisY != null ? Math.min(cssH - 16, Math.max(4, axisY + 5)) : cssH - 16;
      guard = 0;
      for (x = startX; x <= right + step * 1e-6 && guard < 400; x += step, guard += 1) {
        if (Math.abs(x) < step * 1e-6) continue;
        sx = screenX(x);
        if (sx < 14 || sx > cssW - 14) continue;
        g.fillText(fmtNum(x, dec), sx, labelY);
      }

      g.textAlign = 'right';
      g.textBaseline = 'middle';
      var labelX = axisX != null ? Math.min(cssW - 8, Math.max(30, axisX - 6)) : 30;
      guard = 0;
      for (y = startY; y <= top + step * 1e-6 && guard < 400; y += step, guard += 1) {
        if (Math.abs(y) < step * 1e-6) continue;
        var yy = screenY(y);
        if (yy < 10 || yy > cssH - 10) continue;
        g.fillText(fmtNum(y, dec), labelX, yy);
      }

      /* 原点与轴名 */
      if (axisX != null && axisY != null) {
        g.textAlign = 'right';
        g.textBaseline = 'top';
        g.fillText('0', axisX - 5, axisY + 5);
        g.fillStyle = 'rgba(96, 118, 150, .9)';
        g.textAlign = 'right';
        g.textBaseline = 'bottom';
        g.fillText('x', cssW - 8, axisY - 4);
        g.textAlign = 'left';
        g.textBaseline = 'top';
        g.fillText('y', axisX + 6, 6);
      }
      g.restore();
    }

    /* ---------- 曲线 ---------- */
    function bisectZero(cmp, params, x1, y1, x2, y2) {
      var lo = x1;
      var hi = x2;
      var flo = y1;
      for (var i = 0; i < 60; i += 1) {
        var mid = (lo + hi) / 2;
        var fm = cmp.eval(mid, params);
        if (!isNum(fm)) return null;
        if (Math.abs(hi - lo) < 1e-9) break;
        if (fm === 0) { lo = mid; hi = mid; flo = 0; break; }
        if ((flo < 0) === (fm < 0)) { lo = mid; flo = fm; } else { hi = mid; }
      }
      var root = (lo + hi) / 2;
      var fr = cmp.eval(root, params);
      if (!isNum(fr)) return null;
      /* 真正过零时 |f(root)| 与斜率×精度同量级；极点处会大得离谱，直接丢掉 */
      var slope = Math.abs((y2 - y1) / (x2 - x1 || 1e-12));
      var tol = Math.max(1e-6, slope * 2e-7);
      if (Math.abs(fr) > tol) return null;
      return root;
    }

    function drawExpressions(g) {
      var list = expressions();
      var params = sc.params || {};
      for (var i = 0; i < list.length; i += 1) {
        var item = list[i];
        if (!item || item.visible === false) continue;
        var cmp = compileOf(item.expr);
        if (!cmp || !cmp.ok || typeof cmp.eval !== 'function') continue;

        var color = normalizeColor(item.color, '#2a63e8');
        var stepPx = 2;
        var maxPts = Math.floor(cssW / 2) + 4;
        var used = 0;
        var prevY = 0;
        var prevWx = 0;
        var has = false;
        var zeros = 0;

        ZEROS.length = 0;
        g.save();
        g.strokeStyle = color;
        g.lineWidth = 2;
        g.lineJoin = 'round';
        g.lineCap = 'round';
        g.beginPath();

        for (var px = 0; px <= cssW && used < maxPts; px += stepPx) {
          var wx = view.cx + (px - cssW / 2) / view.pxPerUnit;
          var y = cmp.eval(wx, params);
          used += 1;

          if (!isNum(y)) { has = false; prevWx = wx; continue; }

          var sy = screenY(y);
          /* 渐近线保护：纵向跳变太大就断开 */
          if (has && Math.abs(sy - prevY) > cssH * 1.5) has = false;

          if (has && prevY * y < 0 && zeros < MAX_ZEROS) {
            var root = bisectZero(cmp, params, prevWx, prevY, wx, y);
            if (root != null) { ZEROS.push(root); zeros += 1; }
          }

          if (!has) { g.moveTo(px, sy); has = true; }
          else g.lineTo(px, sy);

          prevY = sy;
          prevWx = wx;
          if (y === 0 && zeros < MAX_ZEROS) { ZEROS.push(wx); zeros += 1; }
        }
        g.stroke();
        g.restore();

        /* 零点：小圆点都画，坐标标注过密时跳过，避免一条正弦曲线糊成一片字 */
        var lastLabelX = -1e9;
        for (var z = 0; z < ZEROS.length; z += 1) {
          var zx = screenX(ZEROS[z]);
          var zy = screenY(0);
          if (zx < 0 || zx > cssW) continue;
          g.save();
          g.beginPath();
          g.arc(zx, zy, 3.2, 0, Math.PI * 2);
          g.fillStyle = color;
          g.fill();
          g.lineWidth = 1.5;
          g.strokeStyle = '#ffffff';
          g.stroke();
          if (Math.abs(zx - lastLabelX) >= 46) {
            g.font = '11px ui-monospace, SFMono-Regular, Consolas, monospace';
            g.textAlign = 'center';
            g.textBaseline = 'bottom';
            var txt = '(' + fmtNum(ZEROS[z], 2) + ', 0)';
            g.lineWidth = 3;
            g.strokeStyle = 'rgba(255, 255, 255, .92)';
            g.strokeText(txt, zx, zy - 6);
            g.fillStyle = color;
            g.fillText(txt, zx, zy - 6);
            lastLabelX = zx;
          }
          g.restore();
        }
      }
    }

    /* ---------- 几何 ---------- */
    function buildBox() {
      BOX = {};
      var objs = objects();
      for (var i = 0; i < objs.length; i += 1) {
        var o = objs[i];
        if (o && o.id != null) BOX[o.id] = o;
      }
      return BOX;
    }

    function pointOf(id) {
      var o = BOX[id];
      return finitePoint(o) ? o : null;
    }

    /* 线的方向（世界坐标）；垂线 / 平行线递归取参考线 */
    function dirOf(obj, depth) {
      if (!obj || (depth || 0) > 8) return null;
      if (obj.type === 'segment' || obj.type === 'line') {
        var A = pointOf(obj.a);
        var B = pointOf(obj.b);
        if (!A || !B) return null;
        return { x: B.x - A.x, y: B.y - A.y };
      }
      if (obj.type === 'perpendicular') {
        var d = dirOf(BOX[obj.ref], (depth || 0) + 1);
        if (!d) return null;
        return { x: -d.y, y: d.x };
      }
      if (obj.type === 'parallel') return dirOf(BOX[obj.ref], (depth || 0) + 1);
      return null;
    }

    function strokeLine(g, x1, y1, x2, y2, color, width, isSel, isHov) {
      var seg = clipSegment(x1, y1, x2, y2, cssW, cssH);
      if (!seg) return;
      g.save();
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(seg[0], seg[1]);
      g.lineTo(seg[2], seg[3]);
      if (isSel) {
        /* 强调色外圈 → 白色描边 → 物体本色 */
        g.strokeStyle = 'rgba(42, 99, 232, .35)';
        g.lineWidth = width + 7;
        g.stroke();
        g.beginPath();
        g.moveTo(seg[0], seg[1]);
        g.lineTo(seg[2], seg[3]);
        g.strokeStyle = '#ffffff';
        g.lineWidth = width + 4;
        g.stroke();
        g.beginPath();
        g.moveTo(seg[0], seg[1]);
        g.lineTo(seg[2], seg[3]);
      }
      g.strokeStyle = color;
      g.lineWidth = width + (isHov ? 0.8 : 0);
      g.stroke();
      g.restore();
    }

    function drawPoint(g, o) {
      if (!finitePoint(o)) return;
      var p = toScreen(o.x, o.y);
      var color = normalizeColor(o.color, '#d94b4b');
      var isSel = selection != null && selection === o.id;
      var isHov = hover != null && hover === o.id;
      var r = isSel ? 5 : (isHov ? 4.8 : 3.8);

      g.save();
      if (isSel) {
        g.beginPath();
        g.arc(p.x, p.y, r + 4.5, 0, Math.PI * 2);
        g.strokeStyle = 'rgba(42, 99, 232, .55)';
        g.lineWidth = 2;
        g.stroke();
        g.beginPath();
        g.arc(p.x, p.y, r + 2, 0, Math.PI * 2);
        g.strokeStyle = '#ffffff';
        g.lineWidth = 2.4;
        g.stroke();
      } else if (isHov) {
        g.beginPath();
        g.arc(p.x, p.y, r + 2.4, 0, Math.PI * 2);
        g.fillStyle = 'rgba(255, 255, 255, .9)';
        g.fill();
      }
      g.beginPath();
      g.arc(p.x, p.y, r, 0, Math.PI * 2);
      g.fillStyle = color;
      g.fill();
      g.lineWidth = 1.4;
      g.strokeStyle = '#ffffff';
      g.stroke();

      if (o.label && o.visible !== false) {
        g.font = '600 12px -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif';
        g.textAlign = 'left';
        g.textBaseline = 'bottom';
        g.lineWidth = 3;
        g.strokeStyle = 'rgba(255, 255, 255, .95)';
        g.strokeText(o.label, p.x + 7, p.y - 5);
        g.fillStyle = LABEL;
        g.fillText(o.label, p.x + 7, p.y - 5);
      }
      g.restore();
    }

    function drawCircle(g, o) {
      var C = pointOf(o.center);
      var T = pointOf(o.through);
      if (!C || !T) return;
      var rw = Math.sqrt((T.x - C.x) * (T.x - C.x) + (T.y - C.y) * (T.y - C.y));
      if (!isNum(rw) || rw <= 0) return;
      var c = toScreen(C.x, C.y);
      var r = rw * view.pxPerUnit;
      if (!isNum(r) || r < 0.5) return;
      var color = normalizeColor(o.color, '#2a63e8');
      var isSel = selection != null && selection === o.id;
      var isHov = hover != null && hover === o.id;

      g.save();
      g.beginPath();
      g.arc(c.x, c.y, r, 0, Math.PI * 2);
      g.fillStyle = color;
      g.globalAlpha = 0.05;
      g.fill();
      g.globalAlpha = 1;
      if (isSel) {
        g.strokeStyle = 'rgba(42, 99, 232, .35)';
        g.lineWidth = 8;
        g.stroke();
        g.beginPath();
        g.arc(c.x, c.y, r, 0, Math.PI * 2);
        g.strokeStyle = '#ffffff';
        g.lineWidth = 5;
        g.stroke();
        g.beginPath();
        g.arc(c.x, c.y, r, 0, Math.PI * 2);
      }
      g.strokeStyle = color;
      g.lineWidth = isHov ? 2.8 : 2;
      g.stroke();
      g.restore();
    }

    function drawPolygon(g, o) {
      var ids = o.points || [];
      if (ids.length < 3) return;
      var pts = [];
      for (var i = 0; i < ids.length; i += 1) {
        var p = pointOf(ids[i]);
        if (!p) return;
        pts.push(toScreen(p.x, p.y));
      }
      var color = normalizeColor(o.color, '#2a63e8');
      var isSel = selection != null && selection === o.id;
      var isHov = hover != null && hover === o.id;

      g.save();
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (var k = 1; k < pts.length; k += 1) g.lineTo(pts[k].x, pts[k].y);
      g.closePath();
      g.fillStyle = color;
      g.globalAlpha = 0.13;
      g.fill();
      g.globalAlpha = 1;

      if (isSel) {
        g.strokeStyle = 'rgba(42, 99, 232, .35)';
        g.lineWidth = 7;
        g.lineJoin = 'round';
        g.stroke();
        g.strokeStyle = '#ffffff';
        g.lineWidth = 4.5;
        g.stroke();
      }
      g.strokeStyle = color;
      g.lineWidth = isHov ? 2.8 : 2;
      g.lineJoin = 'round';
      g.stroke();
      g.restore();
    }

    function drawObjects(g) {
      buildBox();
      var objs = objects();
      for (var i = 0; i < objs.length; i += 1) {
        var o = objs[i];
        if (!o || o.visible === false) continue;
        var color = normalizeColor(o.color, isPointLike(o) ? '#d94b4b' : '#2a63e8');
        var isSel = selection != null && selection === o.id;
        var isHov = hover != null && hover === o.id;

        if (isPointLike(o)) {
          drawPoint(g, o);
        } else if (o.type === 'segment') {
          var A = pointOf(o.a);
          var B = pointOf(o.b);
          if (!A || !B) continue;
          var sa = toScreen(A.x, A.y);
          var sb = toScreen(B.x, B.y);
          strokeLine(g, sa.x, sa.y, sb.x, sb.y, color, 2, isSel, isHov);
        } else if (o.type === 'line') {
          var LA = pointOf(o.a);
          var LB = pointOf(o.b);
          if (!LA || !LB) continue;
          drawInfinite(g, LA.x, LA.y, LB.x - LA.x, LB.y - LA.y, color, 2, isSel, isHov);
        } else if (o.type === 'perpendicular' || o.type === 'parallel') {
          var P = pointOf(o.through);
          var ref = BOX[o.ref];
          var d = dirOf(ref, 0);
          if (!P || !d || (!d.x && !d.y)) continue;
          drawInfinite(g, P.x, P.y, d.x, d.y, color, 2, isSel, isHov);
        } else if (o.type === 'circle') {
          drawCircle(g, o);
        } else if (o.type === 'polygon') {
          drawPolygon(g, o);
        }
      }
    }

    function drawInfinite(g, wx, wy, dx, dy, color, width, isSel, isHov) {
      var p = toScreen(wx, wy);
      var sxDir = dx * view.pxPerUnit;
      var syDir = -dy * view.pxPerUnit;
      var big = (cssW + cssH) * 4 / Math.max(Math.abs(sxDir), Math.abs(syDir));
      strokeLine(g, p.x - sxDir * big, p.y - syDir * big,
        p.x + sxDir * big, p.y + syDir * big, color, width, isSel, isHov);
    }

    /* ---------- 整幅绘制 ---------- */
    function paint(g, opts) {
      var o = opts || {};
      /* 导出时临时清掉选中/悬停高亮，得到干净的一张图 */
      var selBackup = selection;
      var hovBackup = hover;
      if (o.clean) { selection = null; hover = null; }

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, cssW, cssH);
      g.fillStyle = o.white ? '#ffffff' : BG;
      g.fillRect(0, 0, cssW, cssH);
      drawGrid(g);
      drawExpressions(g);
      drawObjects(g);

      if (o.clean) { selection = selBackup; hover = hovBackup; }
    }

    function draw() {
      if (destroyed) return;
      if (cssW <= 0 || cssH <= 0) resize();
      paint(ctx, {});
    }

    /* ---------- 适应视图 ---------- */
    function collectBounds() {
      var minX = Infinity;
      var maxX = -Infinity;
      var minY = Infinity;
      var maxY = -Infinity;
      var any = false;
      var objs = objects();

      function take(x, y) {
        if (!isNum(x) || !isNum(y)) return;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        any = true;
      }

      for (var i = 0; i < objs.length; i += 1) {
        var ob = objs[i];
        if (!ob || ob.visible === false) continue;
        if (isPointLike(ob)) {
          take(ob.x, ob.y);
        } else if (ob.type === 'polygon') {
          for (var k = 0; k < ob.points.length; k += 1) {
            var p = BOX[ob.points[k]];
            if (p) take(p.x, p.y);
          }
        }
      }

      /* 曲线：在对象范围内采样。曲线是无限延伸的，若把远端极大的 y 也算进包围盒，
         fit() 会把视图缩得看不见任何对象；因此只取「对象 y 范围再放宽一倍」之内的部分 */
      var x0 = any ? minX : -10;
      var x1 = any ? maxX : 10;
      if (!(x1 > x0)) { x0 -= 5; x1 += 5; }
      var objMinY = any ? minY : -10;
      var objMaxY = any ? maxY : 10;
      var padY = Math.max(2, objMaxY - objMinY);
      var loY = objMinY - padY;
      var hiY = objMaxY + padY;
      var hasCurve = false;
      for (var e = 0; e < (expressions()).length; e += 1) {
        var item = expressions()[e];
        if (!item || item.visible === false) continue;
        var cmp = compileOf(item.expr);
        if (!cmp || !cmp.ok) continue;
        hasCurve = true;
        for (var si = 0; si <= 120; si += 1) {
          var wx = x0 + (x1 - x0) * si / 120;
          var wy = cmp.eval(wx, sc.params || {});
          if (!isNum(wy) || wy < loY || wy > hiY) continue;
          take(wx, wy);
        }
      }

      if (!any) return null;
      if (hasCurve || objs.length) return { minX: minX, maxX: maxX, minY: minY, maxY: maxY };
      return null;
    }

    function fit() {
      var box = collectBounds();
      if (!box) {
        view.cx = 0;
        view.cy = 0;
        view.pxPerUnit = 48;
        return;
      }
      var spanX = box.maxX - box.minX;
      var spanY = box.maxY - box.minY;
      if (!(spanX > 0)) spanX = 2;
      if (!(spanY > 0)) spanY = 2;

      view.cx = (box.minX + box.maxX) / 2;
      view.cy = (box.minY + box.maxY) / 2;
      var scale = Math.min(cssW * 0.86 / spanX, cssH * 0.86 / spanY);
      if (scale < MIN_SCALE) scale = MIN_SCALE;
      if (scale > MAX_SCALE) scale = MAX_SCALE;
      view.pxPerUnit = scale;
    }

    /* ---------- 命中测试 ---------- */
    function pick(px, py) {
      if (!isNum(px) || !isNum(py)) return null;
      buildBox();
      var objs = objects();
      var i;
      var o;
      var best = null;
      var bestD = PICK_TOL;

      /* 1) 点优先 */
      for (i = 0; i < objs.length; i += 1) {
        o = objs[i];
        if (!o || o.visible === false || !isPointLike(o) || !finitePoint(o)) continue;
        var sp = toScreen(o.x, o.y);
        var d = Math.sqrt((sp.x - px) * (sp.x - px) + (sp.y - py) * (sp.y - py));
        if (d <= bestD) { bestD = d; best = o.id; }
      }
      if (best) return { kind: 'point', id: best };

      /* 2) 线 / 圆 */
      bestD = PICK_TOL;
      for (i = 0; i < objs.length; i += 1) {
        o = objs[i];
        if (!o || o.visible === false) continue;
        var dd = Infinity;
        if (o.type === 'segment') {
          var A = pointOf(o.a);
          var B = pointOf(o.b);
          if (!A || !B) continue;
          var a1 = toScreen(A.x, A.y);
          var b1 = toScreen(B.x, B.y);
          dd = distToSegment(px, py, a1.x, a1.y, b1.x, b1.y);
        } else if (o.type === 'line') {
          var LA = pointOf(o.a);
          var LB = pointOf(o.b);
          if (!LA || !LB) continue;
          var la = toScreen(LA.x, LA.y);
          var lb = toScreen(LB.x, LB.y);
          dd = distToLine(px, py, la.x, la.y, lb.x, lb.y);
        } else if (o.type === 'perpendicular' || o.type === 'parallel') {
          var P = pointOf(o.through);
          var dir = dirOf(BOX[o.ref], 0);
          if (!P || !dir) continue;
          var pp = toScreen(P.x, P.y);
          dd = distToLine(px, py, pp.x, pp.y,
            pp.x + dir.x * view.pxPerUnit, pp.y - dir.y * view.pxPerUnit);
        } else if (o.type === 'circle') {
          var C = pointOf(o.center);
          var T = pointOf(o.through);
          if (!C || !T) continue;
          var rw = Math.sqrt((T.x - C.x) * (T.x - C.x) + (T.y - C.y) * (T.y - C.y));
          var cc = toScreen(C.x, C.y);
          dd = Math.abs(Math.sqrt((cc.x - px) * (cc.x - px) + (cc.y - py) * (cc.y - py)) - rw * view.pxPerUnit);
        } else {
          continue;
        }
        if (dd <= bestD) { bestD = dd; best = o.id; }
      }
      if (best) return { kind: 'object', id: best };

      /* 3) 多边形内部（小面积优先） */
      var bestArea = Infinity;
      for (i = 0; i < objs.length; i += 1) {
        o = objs[i];
        if (!o || o.visible === false || o.type !== 'polygon') continue;
        var pts = [];
        var ok = true;
        for (var k = 0; k < (o.points || []).length; k += 1) {
          var vp = pointOf(o.points[k]);
          if (!vp) { ok = false; break; }
          pts.push(toScreen(vp.x, vp.y));
        }
        if (!ok || pts.length < 3) continue;
        var inside = false;
        for (var m = 0, n = pts.length - 1; m < pts.length; n = m, m += 1) {
          if (((pts[m].y > py) !== (pts[n].y > py)) &&
              (px < (pts[n].x - pts[m].x) * (py - pts[m].y) / (pts[n].y - pts[m].y) + pts[m].x)) {
            inside = !inside;
          }
        }
        if (!inside) continue;
        var area = 0;
        for (var q = 0; q < pts.length; q += 1) {
          var q2 = (q + 1) % pts.length;
          area += pts[q].x * pts[q2].y - pts[q2].x * pts[q].y;
        }
        area = Math.abs(area) / 2;
        if (area < bestArea) { bestArea = area; best = o.id; }
      }
      if (best) return { kind: 'object', id: best };

      /* 4) 曲线：按列算纵向距离 */
      var exprs = expressions();
      for (i = 0; i < exprs.length; i += 1) {
        var item = exprs[i];
        if (!item || item.visible === false) continue;
        var cmp = compileOf(item.expr);
        if (!cmp || !cmp.ok) continue;
        var wx = view.cx + (px - cssW / 2) / view.pxPerUnit;
        var wy = cmp.eval(wx, sc.params || {});
        if (!isNum(wy)) continue;
        if (Math.abs(screenY(wy) - py) <= PICK_TOL) return { kind: 'curve', id: item.id };
      }
      return null;
    }

    /* ---------- 导出 ---------- */
    function stamp() {
      var d = new Date();
      function p(n) { return n < 10 ? '0' + n : '' + n; }
      return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' +
        p(d.getHours()) + p(d.getMinutes());
    }

    function triggerDownload(url, filename, revoke) {
      try {
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (revoke) {
          window.setTimeout(function () {
            try { URL.revokeObjectURL(url); } catch (e) { /* 忽略 */ }
          }, 1500);
        }
      } catch (e) { /* 无头环境不校验下载 */ }
    }

    function exportPNG(filename) {
      if (destroyed) return null;
      var name = filename || ('数学绘图器-' + stamp() + '.png');
      var off = document.createElement('canvas');
      var ratio = dpr || 1;
      off.width = Math.max(1, Math.round(cssW * ratio));
      off.height = Math.max(1, Math.round(cssH * ratio));
      var g = off.getContext('2d');
      if (!g) return null;
      g.setTransform(ratio, 0, 0, ratio, 0, 0);
      paint(g, { white: true, clean: true });

      var toDataUrl = function () {
        try { triggerDownload(off.toDataURL('image/png'), name, false); } catch (e) { /* 忽略 */ }
        return false;
      };

      if (typeof off.toBlob !== 'function') return toDataUrl();

      if (typeof Promise === 'undefined') {
        try {
          off.toBlob(function (blob) {
            if (!blob) { toDataUrl(); return; }
            try { triggerDownload(URL.createObjectURL(blob), name, true); } catch (e) { /* 忽略 */ }
          }, 'image/png');
        } catch (e) { toDataUrl(); }
        return undefined;
      }

      return new Promise(function (resolve) {
        try {
          off.toBlob(function (blob) {
            if (!blob) { resolve(toDataUrl()); return; }
            var url = null;
            try { url = URL.createObjectURL(blob); } catch (e) { url = null; }
            if (!url) { resolve(toDataUrl()); return; }
            triggerDownload(url, name, true);
            resolve(true);
          }, 'image/png');
        } catch (e) {
          resolve(toDataUrl());
        }
      });
    }

    /* ---------- 生命周期 ---------- */
    function onWindowResize() {
      if (destroyed) return;
      if (rafId) return;
      rafId = window.requestAnimationFrame(function () {
        rafId = 0;
        resize();
        draw();
      });
    }

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('resize', onWindowResize);
    }

    function destroy() {
      destroyed = true;
      if (rafId && window.cancelAnimationFrame) window.cancelAnimationFrame(rafId);
      rafId = 0;
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('resize', onWindowResize);
      }
      compiled = {};
      compiledCount = 0;
      ZEROS.length = 0;
      BOX = {};
      selection = null;
      hover = null;
    }

    resize();

    return {
      resize: resize,
      draw: draw,
      exportPNG: exportPNG,
      toWorld: toWorld,
      toScreen: toScreen,
      zoomAt: zoomAt,
      panBy: panBy,
      fit: fit,
      pick: pick,
      setSelection: function (id) { selection = id == null ? null : id; },
      setHover: function (id) { hover = id == null ? null : id; },
      destroy: destroy
    };
  }

  SL.math.render = {
    create: create
  };
})();
