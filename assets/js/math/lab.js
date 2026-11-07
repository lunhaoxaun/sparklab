/* 数学绘图器 · 工作台 UI 与交互（SL.math.lab）
   ---------------------------------------------------------------
   把 S1–S4 的五个纯逻辑模块装配成可操作的工作台：
     expr      表达式编译（函数曲线 / 自动参数 / 脚本里的 f.eval(x)）
     geometry  场景对象、构造、重算、属性读写、测量
     script    C++ 判断脚本（只经 bridge 访问场景）
     render    Canvas 绘制、视口变换、命中、导出
     help      语法详解弹窗与右栏速查

   对外接口：
     SL.math.lab.mount(host, { lab, onLeave }) -> {
       destroy, save, reset, loadExample, refresh
     }

   约束：
   - 只新建本文件；ES5 / IIFE / 'use strict' / 无第三方库。
   - 所有事件监听登记在 bindings 里，destroy() 逐条解绑；
     ResizeObserver 不可用时回退 window.resize。
   - 渲染器只读 scene，本模块负责 recompute、持久化与交互。
   --------------------------------------------------------------- */
(function () {
  'use strict';

  var SL = (window.SparkLab = window.SparkLab || {});
  SL.math = SL.math || {};

  /* S6 会把 math 补进 SL.KEYS；在此之前用方案约定的字面量 */
  var STORE_KEY = (SL.KEYS && SL.KEYS.math) || 'sparklab:v1:math';
  var SAVE_MS = 300;
  var RUN_MS = 60;
  var SCRIPT_SAVE_MS = 300;
  var PICK_PX = 8;
  var DEFAULT_EXPR = 'x^2-2x-1';

  var TOOLS = [
    { id: 'select', name: '选择', hint: '拖动自由点、点空白处平移视图，点对象可选中' },
    { id: 'point', name: '点', hint: '单击空白处新建点；靠近已有点会复用' },
    { id: 'segment', name: '线段', hint: '依次点两个点画出线段' },
    { id: 'line', name: '直线', hint: '依次点两个点画出直线' },
    { id: 'circle', name: '圆', hint: '先点圆心，再点圆上一点' },
    { id: 'polygon', name: '多边形', hint: '连续点若干点，再点首点或双击闭合（至少 3 点）' },
    { id: 'midpoint', name: '中点', hint: '依次点两个点求中点' },
    { id: 'intersection', name: '交点', hint: '依次点两条线 / 圆 / 线段' },
    { id: 'perpendicular', name: '垂线', hint: '先点一个点，再点一条线或线段' },
    { id: 'parallel', name: '平行线', hint: '先点一个点，再点一条线或线段' },
    { id: 'delete', name: '删除', hint: '点对象删除，依赖它的对象会一起级联删除' }
  ];

  var TOOL_HINT = {};
  for (var ti = 0; ti < TOOLS.length; ti += 1) TOOL_HINT[TOOLS[ti].id] = TOOLS[ti];

  var PALETTE = ['#2a63e8', '#f08a3c', '#1f9d64', '#7c5cff', '#0f9f9a', '#d94b4b', '#c9971f', '#c0399f'];

  var NAMED_HEX = {
    red: '#d94b4b', green: '#1f9d64', blue: '#2a63e8', orange: '#f08a3c',
    purple: '#7c5cff', teal: '#0f9f9a', gray: '#7c8da6', grey: '#7c8da6',
    black: '#1f2328', white: '#ffffff', gold: '#c9971f', pink: '#e06a9a',
    brown: '#8a6446', cyan: '#17a2b8', magenta: '#c0399f', navy: '#274c77',
    olive: '#6b7a33', lime: '#5aa832', maroon: '#8c3b3b', silver: '#b8c4d4',
    coral: '#e8664f', indigo: '#4b4fa8'
  };

  var NAME_LETTERS = ['f', 'g', 'h', 'j', 'k', 'm', 'n', 'p', 'q', 'r', 's', 't',
    'u', 'v', 'w', 'y', 'z', 'a', 'b', 'c', 'd', 'l', 'o'];

  var EXAMPLE_SCRIPT = [
    '// 例：当 BC 的自定义计数 num 等于 2 时，把 BC 标红',
    'if (BC.num == 2) {',
    '    BC.color = "red";',
    '} else {',
    '    BC.color = "#2a63e8";',
    '}',
    '',
    '// 例：判断 AB 与 CD 是否等长',
    'if (near(AB.length, CD.length, 0.01)) pass("AB = CD");',
    'else fail("AB 与 CD 不等长");'
  ].join('\n');

  function has(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }

  function escapeHtml(v) {
    if (SL.escape) return SL.escape(v);
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  function toHex(color, fallback) {
    var fb = fallback || '#2a63e8';
    if (typeof color !== 'string') return fb;
    var s = color.replace(/^\s+|\s+$/g, '').toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(s)) return s;
    if (/^#[0-9a-f]{3}$/.test(s)) {
      return '#' + s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3);
    }
    if (has(NAMED_HEX, s)) return NAMED_HEX[s];
    return fb;
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function stamp() {
    var d = new Date();
    return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) +
      '-' + pad2(d.getHours()) + pad2(d.getMinutes());
  }

  function isTyping(node) {
    if (!node) return false;
    var tag = node.tagName || '';
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable === true;
  }

  function isPointLike(o) {
    return !!o && (o.type === 'point' || o.type === 'midpoint' || o.type === 'intersection');
  }

  function isLineLike(o) {
    return !!o && (o.type === 'segment' || o.type === 'line' ||
      o.type === 'perpendicular' || o.type === 'parallel');
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

  function distToInfinite(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (!len) return Infinity;
    return Math.abs((px - x1) * dy - (py - y1) * dx) / len;
  }

  /* ============================================================
     持久化
     ============================================================ */
  function readStore() {
    var data = SL.storage ? SL.storage.get(STORE_KEY, null) : null;
    if (!data || typeof data !== 'object') data = { version: 1, scenes: {} };
    if (!data.scenes || typeof data.scenes !== 'object') data.scenes = {};
    data.version = 1;
    return data;
  }

  function writeStore(scene, labId) {
    if (!SL.storage) return;
    var all = readStore();
    all.scenes[labId] = scene;
    SL.storage.set(STORE_KEY, all);
  }

  /* ============================================================
     DOM 骨架
     ============================================================ */
  function skeleton(title) {
    var toolHtml = '';
    for (var i = 0; i < TOOLS.length; i += 1) {
      toolHtml += '<button type="button" class="tool-btn' + (i === 0 ? ' is-active' : '') +
        '" data-act="tool" data-tool="' + TOOLS[i].id + '">' + TOOLS[i].name + '</button>';
    }
    return '' +
      '<div class="math-view">' +
        '<div class="math-head">' +
          '<div class="math-head-main">' +
            '<button type="button" class="btn btn-ghost btn-sm" data-act="back">← 返回大厅</button>' +
            '<h1>' + escapeHtml(title) + '</h1>' +
            '<span class="math-tag">函数 + 几何</span>' +
          '</div>' +
          '<div class="math-head-actions">' +
            '<button type="button" class="btn btn-soft btn-sm" data-act="reset">重置</button>' +
            '<button type="button" class="btn btn-soft btn-sm" data-act="export">导出 PNG</button>' +
            '<button type="button" class="btn btn-primary btn-sm" data-act="example">载入示例</button>' +
          '</div>' +
        '</div>' +
        '<div class="math-body">' +
          '<div class="math-left">' +
            '<section class="panel">' +
              '<div class="panel-head"><h2>函数</h2><span class="panel-badge" data-role="expr-count">0</span></div>' +
              '<div class="expr-input">' +
                '<input type="text" data-role="expr-input" placeholder="y = x^2 - 2x - 1" spellcheck="false">' +
                '<button type="button" class="btn btn-primary btn-sm" data-act="add-expr">添加</button>' +
              '</div>' +
              '<div class="expr-list" data-role="expr-list"></div>' +
            '</section>' +
            '<section class="panel">' +
              '<div class="panel-head"><h2>几何工具</h2><span class="panel-badge" data-role="tool-name">选择</span></div>' +
              '<div class="geom-tools" data-role="geom-tools">' + toolHtml + '</div>' +
              '<p class="math-panel-hint" data-role="tool-hint">' + TOOLS[0].hint + '</p>' +
            '</section>' +
            '<section class="panel">' +
              '<div class="panel-head"><h2>对象</h2><span class="panel-badge" data-role="obj-count">0</span></div>' +
              '<div class="obj-list" data-role="obj-list"></div>' +
            '</section>' +
          '</div>' +
          '<div class="math-stage">' +
            '<div class="math-tools">' +
              '<span class="zoom-pct" data-role="tool-label">选择</span>' +
              '<button type="button" class="tool-btn" data-act="zoom-in">＋</button>' +
              '<button type="button" class="tool-btn" data-act="zoom-out">－</button>' +
              '<button type="button" class="tool-btn" data-act="fit">适应</button>' +
              '<span class="tool-sep"></span>' +
              '<span class="zoom-pct" data-role="zoom">100%</span>' +
            '</div>' +
            '<div class="math-canvas-wrap" data-role="canvas-wrap">' +
              '<canvas class="math-canvas" data-role="canvas"></canvas>' +
            '</div>' +
            '<div class="math-stagebar">' +
              '<span class="math-coord" data-role="coord">x = 0.00, y = 0.00</span>' +
              '<span data-role="hint">' + TOOLS[0].hint + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="math-side">' +
            '<section class="panel">' +
              '<div class="panel-head"><h2>参数</h2><span class="panel-badge" data-role="param-count">0</span></div>' +
              '<div class="param-list ctrl-list" data-role="params"></div>' +
            '</section>' +
            '<section class="panel">' +
              '<div class="panel-head"><h2>属性</h2></div>' +
              '<div class="prop-grid" data-role="props"></div>' +
            '</section>' +
            '<section class="panel is-script">' +
              '<div class="panel-head"><h2>C++ 判断脚本</h2></div>' +
              '<textarea class="script-editor" data-role="script" spellcheck="false" placeholder="if (BC.num == 2) BC.color = &quot;red&quot;;"></textarea>' +
              '<div class="script-toolbar">' +
                '<button type="button" class="btn btn-primary btn-sm" data-act="script-run">运行</button>' +
                '<button type="button" class="btn btn-soft btn-sm" data-act="script-clear">清空</button>' +
                '<button type="button" class="btn btn-soft btn-sm" data-act="script-help">语法详解</button>' +
                '<label class="script-auto"><input type="checkbox" data-role="autorun" checked> 自动运行</label>' +
              '</div>' +
              '<div class="script-status" data-role="script-status" hidden></div>' +
              '<div class="script-output" data-role="output"><div class="script-line is-dim">（暂无输出）</div></div>' +
              '<div class="judge-list" data-role="judge"></div>' +
              '<details class="script-quickref"><summary>运算符 / 属性 / 函数速查</summary>' +
                '<div data-role="quickref"></div>' +
              '</details>' +
            '</section>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ============================================================
     mount
     ============================================================ */
  function mount(host, options) {
    options = options || {};
    var lab = options.lab || {};
    var labId = lab.id || 'math-board';
    var labName = (lab.meta && lab.meta.name) || '数学绘图器';
    var onLeave = typeof options.onLeave === 'function' ? options.onLeave : function () {};

    var geo = SL.math.geometry;
    var expr = SL.math.expr;
    var script = SL.math.script;
    var rendererApi = SL.math.render;
    var help = SL.math.help;

    if (!geo || !expr || !script || !rendererApi) {
      throw new Error('数学绘图器缺少依赖模块（expr / geometry / script / render）');
    }

    host.innerHTML = skeleton(labName);
    var root = host.firstChild;

    var q = function (name) { return root.querySelector('[data-role="' + name + '"]'); };
    var canvas = q('canvas');
    var canvasWrap = q('canvas-wrap');
    var exprInput = q('expr-input');
    var exprList = q('expr-list');
    var objList = q('obj-list');
    var paramHost = q('params');
    var propHost = q('props');
    var scriptInput = q('script');
    var outputHost = q('output');
    var judgeHost = q('judge');
    var statusHost = q('script-status');
    var autorunInput = q('autorun');
    var quickrefHost = q('quickref');
    var coordHost = q('coord');
    var hintHost = q('hint');
    var toolHintHost = q('tool-hint');
    var zoomHost = q('zoom');

    if (help && help.QUICKREF_HTML) quickrefHost.innerHTML = help.QUICKREF_HTML;

    /* ---------- 场景 ---------- */
    function defaultScene() {
      var s = geo.defaultScene();
      s.view = { cx: 0, cy: 0, pxPerUnit: 48 };
      s.expressions = [{
        id: 'e1', name: 'f', expr: DEFAULT_EXPR, color: '#2a63e8', visible: true
      }];
      s.params = {};
      s.objects = [];
      s.script = '';
      s.autoRun = true;
      geo.recompute(s);
      return s;
    }

    var stored = readStore().scenes[labId];
    var scene = stored ? geo.normalize(stored) : defaultScene();
    if (!scene.view) scene.view = { cx: 0, cy: 0, pxPerUnit: 48 };
    if (!isNum(scene.view.cx)) scene.view.cx = 0;
    if (!isNum(scene.view.cy)) scene.view.cy = 0;
    if (!isNum(scene.view.pxPerUnit) || scene.view.pxPerUnit <= 0) scene.view.pxPerUnit = 48;
    if (!scene.params || typeof scene.params !== 'object') scene.params = {};
    if (!scene.expressions || !scene.expressions.length) {
      scene.expressions = [{ id: 'e1', name: 'f', expr: DEFAULT_EXPR, color: '#2a63e8', visible: true }];
    }
    if (typeof scene.script !== 'string') scene.script = '';
    scene.autoRun = scene.autoRun !== false;
    geo.recompute(scene);

    var view = scene.view;   /* 渲染器持有同一个 viewRef 对象 */
    var renderer = rendererApi.create(canvas, scene, view);

    /* ---------- 状态 ---------- */
    var state = {
      tool: 'select',
      pending: [],
      selKind: null,
      selId: null,
      drag: null,
      pan: null,
      applyingScript: false
    };

    var destroyed = false;
    var bindings = [];
    var timers = { save: 0, run: 0, script: 0, draw: 0 };
    var resizeObserver = null;
    var helpDialog = null;
    var confirmOverlay = null;
    var controls = null;
    var seq = 0;

    function bind(node, type, fn, opts) {
      if (!node || !node.addEventListener) return;
      var flag = opts || false;
      node.addEventListener(type, fn, flag);
      bindings.push({ node: node, type: type, fn: fn, opts: flag });
    }

    function later(key, ms, fn) {
      if (timers[key]) window.clearTimeout(timers[key]);
      timers[key] = window.setTimeout(function () {
        timers[key] = 0;
        if (!destroyed) fn();
      }, ms);
    }

    function scheduleDraw() {
      if (timers.draw || destroyed) return;
      timers.draw = window.requestAnimationFrame(function () {
        timers.draw = 0;
        if (!destroyed) renderer.draw();
      });
    }

    function save() {
      if (destroyed) return;
      writeStore(scene, labId);
    }

    function scheduleSave() { later('save', SAVE_MS, save); }
    function scheduleScriptSave() { later('script', SCRIPT_SAVE_MS, save); }

    function scheduleRun() {
      if (state.applyingScript || destroyed) return;
      later('run', RUN_MS, function () {
        if (scene.autoRun) runScript();
      });
    }

    /* ---------- 查找 ---------- */
    function objects() { return scene.objects || []; }
    function expressions() { return scene.expressions || []; }

    function byId(id) {
      var list = objects();
      for (var i = 0; i < list.length; i += 1) if (list[i].id === id) return list[i];
      return null;
    }

    function byLabel(name) {
      var list = objects();
      for (var i = 0; i < list.length; i += 1) if (list[i].label === name) return list[i];
      return null;
    }

    function exprByName(name) {
      var list = expressions();
      for (var i = 0; i < list.length; i += 1) if (list[i].name === name) return list[i];
      return null;
    }

    function exprById(id) {
      var list = expressions();
      for (var i = 0; i < list.length; i += 1) if (list[i].id === id) return list[i];
      return null;
    }

    function nextId(prefix) {
      seq += 1;
      return prefix + Date.now().toString(36) + '-' + seq;
    }

    function nextName() {
      for (var round = 0; round < 20; round += 1) {
        for (var i = 0; i < NAME_LETTERS.length; i += 1) {
          var name = NAME_LETTERS[i] + (round ? String(round + 1) : '');
          if (!exprByName(name) && !byLabel(name)) return name;
        }
      }
      return 'f' + seq;
    }

    function typeName(o) {
      return (geo.TYPES && geo.TYPES[o.type]) || o.type || '对象';
    }

    /* ---------- 参数 ---------- */
    function syncParams() {
      var used = {};
      var list = expressions();
      for (var i = 0; i < list.length; i += 1) {
        var c = expr.compile(list[i].expr);
        if (!c || !c.ok || !c.freeVars) continue;
        for (var k = 0; k < c.freeVars.length; k += 1) {
          var v = c.freeVars[k];
          if (v !== 'x') used[v] = true;
        }
      }
      for (var old in scene.params) {
        if (has(scene.params, old) && !used[old]) delete scene.params[old];
      }
      for (var key in used) {
        if (has(used, key) && !has(scene.params, key)) scene.params[key] = 1;
      }
      renderParams();
    }

    function renderParams() {
      var keys = [];
      for (var k in scene.params) if (has(scene.params, k)) keys.push(k);
      keys.sort();
      var schema = [];
      for (var i = 0; i < keys.length; i += 1) {
        schema.push({
          key: keys[i], label: keys[i], type: 'range',
          min: -10, max: 10, step: 0.1, digits: 2
        });
      }
      q('param-count').textContent = String(keys.length);
      if (!SL.sim || !SL.sim.Controls) {
        paramHost.innerHTML = '<div class="math-empty">参数控件不可用</div>';
        return;
      }
      controls = SL.sim.Controls(paramHost, schema, scene.params, function () {
        scheduleDraw();
        scheduleSave();
        scheduleRun();
      });
      if (!keys.length) paramHost.innerHTML = '<div class="math-empty">表达式里没有自由参数</div>';
    }

    /* ---------- 表达式 ---------- */
    function parseExpression(raw) {
      var text = String(raw || '').replace(/^\s+|\s+$/g, '');
      if (!text) return null;
      var m = /^([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)\s*=\s*(.+)$/.exec(text);
      if (m) {
        var body = m[3];
        if (m[2] !== 'x') body = body.replace(new RegExp('\\b' + m[2] + '\\b', 'g'), 'x');
        return { name: m[1], expr: body };
      }
      m = /^y\s*=\s*(.+)$/i.exec(text);
      if (m) return { name: null, expr: m[1] };
      m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(text);
      if (m && m[1] !== 'x') return { name: m[1], expr: m[2] };
      return { name: null, expr: text };
    }

    function addExpression() {
      var parsed = parseExpression(exprInput.value);
      if (!parsed) { SL.toast('请先写一条表达式', 'warn'); return; }
      var compiled = expr.compile(parsed.expr);
      if (!compiled || !compiled.ok) {
        exprInput.style.borderColor = '#d94b4b';
        var msg = compiled && compiled.error ? compiled.error.message : '表达式无法解析';
        SL.toast('表达式有误：' + msg, 'warn');
        return;
      }
      exprInput.style.borderColor = '';

      /* 同一条式子（同名或都未命名）不重复添加，直接选中已有项 */
      var list = expressions();
      for (var di = 0; di < list.length; di += 1) {
        if (list[di].expr === parsed.expr && (!parsed.name || list[di].name === parsed.name)) {
          exprInput.value = '';
          setSelection('expr', list[di].id);
          afterChange();
          return;
        }
      }

      var name = parsed.name || nextName();
      if (exprByName(name) || byLabel(name)) name = nextName();
      var color = PALETTE[expressions().length % PALETTE.length];
      scene.expressions.push({
        id: nextId('e'), name: name, expr: parsed.expr,
        color: color, visible: true
      });
      exprInput.value = '';
      setSelection('expr', scene.expressions[scene.expressions.length - 1].id);
      syncParams();
      afterChange();
    }

    function removeExpression(id) {
      scene.expressions = expressions().filter(function (e) { return e.id !== id; });
      if (state.selKind === 'expr' && state.selId === id) setSelection(null, null);
      syncParams();
      afterChange();
    }

    function renderExprList() {
      var list = expressions();
      q('expr-count').textContent = String(list.length);
      if (!list.length) {
        exprList.innerHTML = '<div class="math-empty">还没有函数，试着输入 x^2</div>';
        return;
      }
      var html = '';
      for (var i = 0; i < list.length; i += 1) {
        var e = list[i];
        var active = state.selKind === 'expr' && state.selId === e.id;
        html += '<div class="expr-item' + (active ? ' is-active' : '') + (e.visible === false ? ' is-off' : '') +
          '" data-id="' + escapeHtml(e.id) + '">' +
          '<span class="expr-swatch" style="background:' + toHex(e.color) + '"></span>' +
          '<span class="expr-name">' + escapeHtml(e.name) + '</span>' +
          '<span class="expr-body" title="' + escapeHtml(e.expr) + '">' + escapeHtml(e.expr) + '</span>' +
          '<span class="expr-actions">' +
            '<button type="button" class="math-icon-btn' + (e.visible === false ? ' is-off' : '') +
              '" data-act="expr-visible" data-id="' + escapeHtml(e.id) + '" title="显示/隐藏">◉</button>' +
            '<button type="button" class="math-icon-btn is-danger" data-act="expr-delete" data-id="' +
              escapeHtml(e.id) + '" title="删除">✕</button>' +
          '</span></div>';
      }
      exprList.innerHTML = html;
    }

    /* ---------- 对象列表 / 属性 ---------- */
    function renderObjList() {
      var list = objects();
      q('obj-count').textContent = String(list.length);
      if (!list.length) {
        objList.innerHTML = '<div class="math-empty">还没有几何对象</div>';
        return;
      }
      var html = '';
      for (var i = 0; i < list.length; i += 1) {
        var o = list[i];
        var active = state.selKind === 'object' && state.selId === o.id;
        html += '<div class="obj-item' + (active ? ' is-active' : '') + (o.visible === false ? ' is-hidden' : '') +
          '" data-id="' + escapeHtml(o.id) + '">' +
          '<span class="obj-swatch" style="background:' + toHex(o.color, '#d94b4b') + '"></span>' +
          '<span class="obj-label">' + escapeHtml(o.label) + '</span>' +
          '<span class="obj-type">' + escapeHtml(typeName(o)) + '</span>' +
          '<span class="obj-actions">' +
            '<button type="button" class="math-icon-btn' + (o.visible === false ? ' is-off' : '') +
              '" data-act="obj-visible" data-id="' + escapeHtml(o.id) + '" title="显示/隐藏">◉</button>' +
            '<button type="button" class="math-icon-btn is-danger" data-act="obj-delete" data-id="' +
              escapeHtml(o.id) + '" title="删除">✕</button>' +
          '</span></div>';
      }
      objList.innerHTML = html;
    }

    function fmtMeasure(key, value) {
      if (typeof value !== 'number') return null;
      if (key === 'slope' && value === Infinity) return '竖直';
      if (!isFinite(value)) return '—';
      return SL.fmt ? SL.fmt(value, 2) : value.toFixed(2);
    }

    function renderProps() {
      var html = '';
      if (state.selKind === 'object') {
        var o = byId(state.selId);
        if (!o) { setSelection(null, null); return; }
        html += '<span class="prop-key">标签</span><span class="prop-val">' + escapeHtml(o.label) + '</span>';
        html += '<span class="prop-key">类型</span><span class="prop-val">' + escapeHtml(typeName(o)) + '</span>';
        html += '<span class="prop-key">颜色</span><input class="prop-color" type="color" data-prop="color" value="' +
          toHex(o.color, '#d94b4b') + '">';
        html += '<span class="prop-key">显示</span><label class="script-auto"><input type="checkbox" data-prop="visible"' +
          (o.visible !== false ? ' checked' : '') + '> 可见</label>';
        html += '<span class="prop-key">num</span><input class="prop-input" type="number" step="0.1" data-prop="num" value="' +
          (isNum(o.num) ? o.num : 0) + '">';
        if (isPointLike(o)) {
          html += '<span class="prop-key">x</span><span class="prop-val is-readonly">' + fmtMeasure('x', o.x) + '</span>';
          html += '<span class="prop-key">y</span><span class="prop-val is-readonly">' + fmtMeasure('y', o.y) + '</span>';
        } else {
          var m = geo.measure(o, scene) || {};
          var keys = ['length', 'slope', 'radius', 'circumference', 'area', 'perimeter'];
          for (var k = 0; k < keys.length; k += 1) {
            if (!has(m, keys[k])) continue;
            var text = fmtMeasure(keys[k], m[keys[k]]);
            if (text == null) continue;
            html += '<span class="prop-key">' + keys[k] + '</span><span class="prop-val is-readonly">' + text + '</span>';
          }
        }
      } else if (state.selKind === 'expr') {
        var e = exprById(state.selId);
        if (!e) { setSelection(null, null); return; }
        html += '<span class="prop-key">名称</span><span class="prop-val">' + escapeHtml(e.name) + '</span>';
        html += '<span class="prop-key">表达式</span><span class="prop-val">' + escapeHtml(e.expr) + '</span>';
        html += '<span class="prop-key">颜色</span><input class="prop-color" type="color" data-prop="color" value="' +
          toHex(e.color) + '">';
        html += '<span class="prop-key">显示</span><label class="script-auto"><input type="checkbox" data-prop="visible"' +
          (e.visible !== false ? ' checked' : '') + '> 可见</label>';
      } else {
        html = '<div class="math-empty" style="grid-column:1/-1">在画布或列表里选中一个对象</div>';
      }
      propHost.innerHTML = html;
    }

    function setSelection(kind, id) {
      state.selKind = kind || null;
      state.selId = id == null ? null : id;
      renderer.setSelection(kind === 'object' ? state.selId : null);
      renderExprList();
      renderObjList();
      renderProps();
      scheduleDraw();
    }

    /* ---------- 重绘 / 变更收口 ---------- */
    function afterChange() {
      geo.recompute(scene);
      renderExprList();
      renderObjList();
      renderProps();
      scheduleDraw();
      scheduleSave();
      scheduleRun();
    }

    function syncAll() {
      geo.recompute(scene);
      renderer.resize();
      renderer.draw();
      syncParams();
      renderExprList();
      renderObjList();
      renderProps();
      scriptInput.value = scene.script;
      autorunInput.checked = scene.autoRun !== false;
      updateZoom();
      updateHints();
    }

    function updateZoom() {
      zoomHost.textContent = Math.round(view.pxPerUnit / 48 * 100) + '%';
    }

    function updateHints() {
      var t = TOOL_HINT[state.tool] || TOOLS[0];
      var pending = state.pending.length ? '（已选 ' + state.pending.length + ' 个，Esc 取消）' : '';
      hintHost.textContent = t.hint + pending;
      toolHintHost.textContent = t.hint + pending;
      q('tool-name').textContent = t.name;
      q('tool-label').textContent = t.name + pending;
    }

    function updateCoord(px, py) {
      var w = renderer.toWorld(px, py);
      var f = function (v) { return SL.fmt ? SL.fmt(v, 2) : v.toFixed(2); };
      coordHost.textContent = 'x = ' + f(w.x) + ', y = ' + f(w.y);
    }

    function setTool(tool) {
      if (!TOOL_HINT[tool]) tool = 'select';
      state.tool = tool;
      state.pending = [];
      var buttons = root.querySelectorAll('[data-tool]');
      for (var i = 0; i < buttons.length; i += 1) {
        var on = buttons[i].getAttribute('data-tool') === tool;
        if (on) buttons[i].classList.add('is-active');
        else buttons[i].classList.remove('is-active');
      }
      updateHints();
    }

    /* ---------- 画布坐标 / 命中 ---------- */
    function localPoint(ev) {
      var rect = canvas.getBoundingClientRect();
      return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
    }

    function pointAt(px, py) {
      var hit = renderer.pick(px, py);
      if (!hit || hit.kind !== 'point') return null;
      return byId(hit.id);
    }

    function ensurePoint(px, py, w) {
      var p = pointAt(px, py);
      if (p) return p;
      return geo.addPoint(scene, w.x, w.y);
    }

    function pointRef(id) {
      var o = byId(id);
      return (o && isPointLike(o) && isNum(o.x) && isNum(o.y)) ? o : null;
    }

    /* 线的世界方向：垂线 / 平行线递归取参考线 */
    function lineWorld(o, depth) {
      if (!o || (depth || 0) > 8) return null;
      if (o.type === 'segment' || o.type === 'line') {
        var A = pointRef(o.a);
        var B = pointRef(o.b);
        if (!A || !B) return null;
        return { x: A.x, y: A.y, dx: B.x - A.x, dy: B.y - A.y, finite: o.type === 'segment' };
      }
      if (o.type === 'perpendicular' || o.type === 'parallel') {
        var P = pointRef(o.through);
        var L = lineWorld(byId(o.ref), (depth || 0) + 1);
        if (!P || !L) return null;
        if (o.type === 'perpendicular') return { x: P.x, y: P.y, dx: -L.dy, dy: L.dx, finite: false };
        return { x: P.x, y: P.y, dx: L.dx, dy: L.dy, finite: false };
      }
      return null;
    }

    function screenDist(o, px, py) {
      if (!o || o.visible === false) return Infinity;
      if (isLineLike(o)) {
        var L = lineWorld(o, 0);
        if (!L) return Infinity;
        var a = renderer.toScreen(L.x, L.y);
        var b = renderer.toScreen(L.x + L.dx, L.y + L.dy);
        return L.finite ? distToSeg(px, py, a.x, a.y, b.x, b.y)
          : distToInfinite(px, py, a.x, a.y, b.x, b.y);
      }
      if (o.type === 'circle') {
        var C = pointRef(o.center);
        var T = pointRef(o.through);
        if (!C || !T) return Infinity;
        var rw = Math.sqrt((T.x - C.x) * (T.x - C.x) + (T.y - C.y) * (T.y - C.y));
        var c = renderer.toScreen(C.x, C.y);
        return Math.abs(Math.sqrt((c.x - px) * (c.x - px) + (c.y - py) * (c.y - py)) - rw * view.pxPerUnit);
      }
      if (o.type === 'polygon') {
        var ids = o.points || [];
        var best = Infinity;
        for (var i = 0; i < ids.length; i += 1) {
          var A = pointRef(ids[i]);
          var B = pointRef(ids[(i + 1) % ids.length]);
          if (!A || !B) continue;
          var sa = renderer.toScreen(A.x, A.y);
          var sb = renderer.toScreen(B.x, B.y);
          var d = distToSeg(px, py, sa.x, sa.y, sb.x, sb.y);
          if (d < best) best = d;
        }
        return best;
      }
      return Infinity;
    }

    /* 只按指定类型找线 / 圆，避免被点对象的优先级挡住 */
    function shapeAt(px, py, types) {
      var list = objects();
      var best = null;
      var bestD = PICK_PX;
      for (var i = 0; i < list.length; i += 1) {
        var o = list[i];
        if (types.indexOf(o.type) < 0) continue;
        var d = screenDist(o, px, py);
        if (d <= bestD) { bestD = d; best = o; }
      }
      return best;
    }

    function notify(msg) { SL.toast(msg, 'warn'); }
    function failPending(msg) { state.pending = []; updateHints(); if (msg) notify(msg); }

    /* ---------- 工具状态机 ---------- */
    function removeObjectById(id) {
      if (!id) return;
      geo.removeObject(scene, id);
      if (state.selKind === 'object' && state.selId === id) setSelection(null, null);
      afterChange();
    }

    function closePolygon() {
      var ids = [];
      for (var i = 0; i < state.pending.length; i += 1) {
        if (ids.indexOf(state.pending[i]) < 0) ids.push(state.pending[i]);
      }
      state.pending = [];
      if (ids.length < 3) { notify('多边形至少需要 3 个不同的点'); updateHints(); return; }
      var poly = geo.addPolygon(scene, ids);
      if (!poly) { notify('多边形创建失败，请换几个点'); updateHints(); return; }
      setSelection('object', poly.id);
      setTool(state.tool);
      afterChange();
    }

    function createIntersections(aId, bId) {
      var list = objects();
      for (var i = 0; i < list.length; i += 1) {
        var o = list[i];
        if (o.type !== 'intersection' || !o.of || o.of.length < 2) continue;
        if ((o.of[0] === aId && o.of[1] === bId) || (o.of[0] === bId && o.of[1] === aId)) {
          notify('这两个对象已经求过交点了');
          return;
        }
      }
      var p0 = geo.addIntersection(scene, aId, bId, 0);
      if (!p0) { notify('这两个对象没有可用交点'); return; }
      var p1 = geo.addIntersection(scene, aId, bId, 1);
      if (p1 && (!isNum(p1.x) || !isNum(p1.y) ||
          (isNum(p0.x) && Math.abs(p0.x - p1.x) < 1e-9 && Math.abs(p0.y - p1.y) < 1e-9))) {
        geo.removeObject(scene, p1.id);
      }
      setSelection('object', p0.id);
    }

    function onToolClick(px, py, w) {
      var tool = state.tool;
      var p;
      var o;

      if (tool === 'point') {
        var hitPt = pointAt(px, py);
        o = hitPt || geo.addPoint(scene, w.x, w.y);
        if (o) setSelection('object', o.id);
        afterChange();
        return;
      }

      if (tool === 'delete') {
        var hit = renderer.pick(px, py);
        if (!hit) return;
        if (hit.kind === 'curve') removeExpression(hit.id);
        else removeObjectById(hit.id);
        return;
      }

      if (tool === 'segment' || tool === 'line' || tool === 'circle' ||
          tool === 'midpoint' || tool === 'perpendicular' || tool === 'parallel') {
        if (state.pending.length === 0) {
          p = ensurePoint(px, py, w);
          if (!p) return;
          state.pending = [p.id];
          updateHints();
          return;
        }
        var firstId = state.pending[0];

        if (tool === 'perpendicular' || tool === 'parallel') {
          var lineObj = shapeAt(px, py, ['segment', 'line', 'perpendicular', 'parallel']);
          if (!lineObj) { failPending('请点一条线段或直线'); return; }
          var made = tool === 'perpendicular'
            ? geo.addPerpendicular(scene, firstId, lineObj.id)
            : geo.addParallel(scene, firstId, lineObj.id);
          state.pending = [];
          if (!made) { notify('创建失败：先选一个点，再点一条线'); updateHints(); return; }
          setSelection('object', made.id);
          afterChange();
          return;
        }

        var second = ensurePoint(px, py, w);
        if (!second) return;
        var result = null;
        if (tool === 'segment') result = geo.addSegment(scene, firstId, second.id);
        else if (tool === 'line') result = geo.addLine(scene, firstId, second.id);
        else if (tool === 'circle') result = geo.addCircle(scene, firstId, second.id);
        else if (tool === 'midpoint') result = geo.addMidpoint(scene, firstId, second.id);
        state.pending = [];
        if (!result) { notify('创建失败：两个点不能相同，请重新选择'); updateHints(); return; }
        setSelection('object', result.id);
        afterChange();
        return;
      }

      if (tool === 'polygon') {
        var at = pointAt(px, py);
        if (at && state.pending.length >= 3 && at.id === state.pending[0]) { closePolygon(); return; }
        var np = ensurePoint(px, py, w);
        if (!np) return;
        if (state.pending.length && state.pending[state.pending.length - 1] === np.id) {
          updateHints();
          return;
        }
        state.pending.push(np.id);
        updateHints();
        afterChange();
        return;
      }

      if (tool === 'intersection') {
        var shape = shapeAt(px, py, ['segment', 'line', 'circle', 'perpendicular', 'parallel']);
        if (!shape) { notify('请点一条线 / 线段 / 圆'); return; }
        if (!state.pending.length) {
          state.pending = [shape.id];
          updateHints();
          return;
        }
        if (state.pending[0] === shape.id) { notify('请选择另一个对象'); return; }
        var aId = state.pending[0];
        state.pending = [];
        createIntersections(aId, shape.id);
        afterChange();
      }
    }

    /* ---------- 画布事件 ---------- */
    function onCanvasClick(ev) {
      if (state.tool === 'select') return;
      var p = localPoint(ev);
      onToolClick(p.x, p.y, renderer.toWorld(p.x, p.y));
    }

    function onDblClick(ev) {
      ev.preventDefault();
      if (state.tool === 'polygon' && state.pending.length >= 3) closePolygon();
    }

    function onPointerDown(ev) {
      if (state.tool !== 'select') return;
      var p = localPoint(ev);
      var hit = renderer.pick(p.x, p.y);
      if (hit && hit.kind === 'curve') {
        setSelection('expr', hit.id);
        return;
      }
      if (hit && (hit.kind === 'point' || hit.kind === 'object')) {
        setSelection('object', hit.id);
        var obj = byId(hit.id);
        if (obj && obj.type === 'point' && obj.free !== false) {
          state.drag = { id: obj.id, moved: false };
        }
        return;
      }
      setSelection(null, null);
      state.pan = { x: p.x, y: p.y, moved: false };
    }

    function onPointerMove(ev) {
      var p = localPoint(ev);
      if (state.drag) {
        var w = renderer.toWorld(p.x, p.y);
        var obj = byId(state.drag.id);
        if (obj) {
          try {
            geo.setProp(obj, 'x', w.x, scene);
            geo.setProp(obj, 'y', w.y, scene);
            geo.recompute(scene);
            state.drag.moved = true;
            renderProps();
            scheduleDraw();
          } catch (e) { /* 只读点（派生点）不拖动 */ }
        }
      } else if (state.pan) {
        renderer.panBy(p.x - state.pan.x, p.y - state.pan.y);
        state.pan.x = p.x;
        state.pan.y = p.y;
        state.pan.moved = true;
        updateZoom();
        scheduleDraw();
      }
      updateCoord(p.x, p.y);
    }

    function onPointerUp() {
      var dragged = (state.drag && state.drag.moved) || (state.pan && state.pan.moved);
      state.drag = null;
      state.pan = null;
      if (dragged) {
        geo.recompute(scene);
        afterChange();
      }
    }

    function onWheel(ev) {
      ev.preventDefault();
      var p = localPoint(ev);
      var factor = ev.deltaY < 0 ? 1.1 : (1 / 1.1);
      renderer.zoomAt(p.x, p.y, factor);
      updateZoom();
      scheduleDraw();
      scheduleSave();
    }

    function onKeyDown(ev) {
      if (isTyping(ev.target)) return;
      /* 弹窗打开时把 Esc / Delete 让给弹窗自己处理 */
      if (document.querySelector && document.querySelector('.modal-overlay')) return;
      if (ev.key === 'Escape') {
        setTool('select');
        setSelection(null, null);
        scheduleDraw();
        return;
      }
      if (ev.key === 'Delete' || ev.key === 'Backspace') {
        ev.preventDefault();
        if (state.selKind === 'object') removeObjectById(state.selId);
        else if (state.selKind === 'expr') removeExpression(state.selId);
      }
    }

    /* ---------- 面板事件（委托） ---------- */
    function attrUp(node, attr) {
      var cur = node;
      while (cur && cur !== root) {
        if (cur.getAttribute && cur.getAttribute(attr) != null) return cur.getAttribute(attr);
        cur = cur.parentNode;
      }
      return null;
    }

    function nodeUp(node, attr) {
      var cur = node;
      while (cur && cur !== root) {
        if (cur.getAttribute && cur.getAttribute(attr) != null) return cur;
        cur = cur.parentNode;
      }
      return null;
    }

    function handleAct(act, ev) {
      var node = ev.target;
      var id;
      var e;
      var o;
      switch (act) {
        case 'back': onLeave(); return;
        case 'reset': reset(); return;
        case 'export': exportPNG(); return;
        case 'example': loadExample(); return;
        case 'add-expr': addExpression(); return;
        case 'tool': setTool(attrUp(node, 'data-tool')); return;
        case 'zoom-in': zoomBy(1.2); return;
        case 'zoom-out': zoomBy(1 / 1.2); return;
        case 'fit': renderer.fit(); updateZoom(); scheduleDraw(); scheduleSave(); return;
        case 'expr-visible':
          id = attrUp(node, 'data-id');
          e = exprById(id);
          if (e) { e.visible = e.visible === false; afterChange(); }
          return;
        case 'expr-delete': removeExpression(attrUp(node, 'data-id')); return;
        case 'obj-visible':
          id = attrUp(node, 'data-id');
          o = byId(id);
          if (o) { o.visible = o.visible === false; afterChange(); }
          return;
        case 'obj-delete': removeObjectById(attrUp(node, 'data-id')); return;
        case 'script-run': runScript(); return;
        case 'script-clear': clearScript(); return;
        case 'script-help': openHelp(); return;
        default: return;
      }
    }

    function onRootClick(ev) {
      var act = attrUp(ev.target, 'data-act');
      if (act) { handleAct(act, ev); return; }
      var item = nodeUp(ev.target, 'data-id');
      if (!item) return;
      var id = item.getAttribute('data-id');
      if (item.className && String(item.className).indexOf('expr-item') >= 0) setSelection('expr', id);
      else if (item.className && String(item.className).indexOf('obj-item') >= 0) setSelection('object', id);
    }

    function onPropChange(ev) {
      var key = attrUp(ev.target, 'data-prop');
      if (!key) return;
      var t = ev.target;
      var value = t.type === 'checkbox' ? t.checked : (key === 'num' ? parseFloat(t.value) : t.value);
      if (state.selKind === 'object') {
        var obj = byId(state.selId);
        if (!obj) return;
        try {
          geo.setProp(obj, key, value, scene);
        } catch (err) {
          notify(err && err.message ? err.message : '属性写入失败');
          renderProps();
          return;
        }
      } else if (state.selKind === 'expr') {
        var e = exprById(state.selId);
        if (!e) return;
        if (key === 'color' || key === 'visible') e[key] = value;
        else return;
      } else {
        return;
      }
      afterChange();
    }

    function onExprInputKey(ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); addExpression(); }
    }

    function onExprInput(ev) {
      exprInput.style.borderColor = '';
      /* 占位：输入变化本身不需要额外处理，保留监听便于将来做即时校验 */
      if (!ev) return;
    }

    function onScriptInput() {
      scene.script = scriptInput.value;
      scheduleScriptSave();
      scheduleRun();
    }

    function onAutoRunChange() {
      scene.autoRun = !!autorunInput.checked;
      scheduleSave();
      if (scene.autoRun) scheduleRun();
    }

    function zoomBy(factor) {
      renderer.zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, factor);
      updateZoom();
      scheduleDraw();
      scheduleSave();
    }

    /* ---------- C++ 判断脚本 ---------- */
    function functionProxy(e) {
      return {
        get: function (p) {
          if (p === 'name' || p === 'expr' || p === 'color') return e[p];
          if (p === 'visible') return e.visible !== false;
          if (p === 'type') return 'function';
          return undefined;
        },
        set: function () { throw new Error('函数对象的属性只读'); },
        call: function (method, args) {
          if (method !== 'eval') throw new Error('函数对象没有方法: ' + method);
          var c = expr.compile(e.expr);
          if (!c || !c.ok) throw new Error('表达式有误: ' + (c && c.error ? c.error.message : e.expr));
          return c.eval(Number(args && args.length ? args[0] : 0), scene.params || {});
        }
      };
    }

    function objectProxy(o) {
      return {
        get: function (p) { return geo.getProp(o, p, scene); },
        set: function (p, value) {
          geo.setProp(o, p, value, scene);
          geo.recompute(scene);
          scheduleDraw();
          scheduleSave();
        },
        call: function (method) {
          throw new Error('对象 ' + o.label + ' 没有方法: ' + method);
        }
      };
    }

    function buildBridge() {
      return {
        resolve: function (name) {
          var e = exprByName(name);
          if (e) return functionProxy(e);
          var o = byLabel(name);
          if (o) return objectProxy(o);
          return undefined;
        },
        isObjectName: function (name) {
          return !!(exprByName(name) || byLabel(name));
        }
      };
    }

    function renderScriptOutput(res) {
      var logs = res && res.logs ? res.logs : [];
      var results = res && res.results ? res.results : [];
      var err = res && res.error ? res.error : null;

      var html = '';
      for (var i = 0; i < logs.length; i += 1) {
        var level = logs[i].level === 'warn' ? 'is-warn' : (logs[i].level === 'error' ? 'is-error' : '');
        html += '<div class="script-line ' + level + '"><span class="script-line-text">' +
          escapeHtml(logs[i].text) + '</span></div>';
      }
      outputHost.innerHTML = html || '<div class="script-line is-dim">（暂无输出）</div>';

      var badge = '';
      if (results.length) {
        var fails = 0;
        var texts = [];
        for (var k = 0; k < results.length; k += 1) {
          if (results[k].kind === 'fail') fails += 1;
          texts.push(escapeHtml(results[k].text));
        }
        badge = '<div class="judge-item"><span class="' + (fails ? 'judge-fail' : 'judge-pass') + '">' +
          (fails ? '未通过' : '通过') + '</span><span class="judge-text">' + texts.join('；') + '</span></div>';
      }
      judgeHost.innerHTML = badge;

      if (err) {
        statusHost.hidden = false;
        statusHost.className = 'script-status';
        statusHost.textContent = '第 ' + (err.line || 1) + ' 行 第 ' + (err.col || 1) + ' 列：' + err.message;
        scriptInput.classList.add('has-error');
      } else {
        statusHost.hidden = true;
        statusHost.textContent = '';
        scriptInput.classList.remove('has-error');
      }
    }

    function runScript() {
      if (destroyed) return;
      scene.script = scriptInput.value;
      var res;
      state.applyingScript = true;
      try {
        res = script.run(scene.script, buildBridge());
      } catch (e) {
        res = {
          ok: false, logs: [], results: [],
          error: { message: '脚本执行出错：' + (e && e.message ? e.message : String(e)), line: 1, col: 1 }
        };
      }
      state.applyingScript = false;
      renderScriptOutput(res);
      geo.recompute(scene);
      renderObjList();
      renderProps();
      scheduleDraw();
      scheduleSave();
    }

    function clearScript() {
      scriptInput.value = '';
      scene.script = '';
      outputHost.innerHTML = '<div class="script-line is-dim">（暂无输出）</div>';
      judgeHost.innerHTML = '';
      statusHost.hidden = true;
      statusHost.textContent = '';
      scriptInput.classList.remove('has-error');
      scheduleSave();
    }

    function openHelp() {
      if (!help || typeof help.open !== 'function') { notify('语法详解模块未加载'); return; }
      if (helpDialog && typeof helpDialog.close === 'function') helpDialog.close();
      helpDialog = help.open();
    }

    /* ---------- 顶栏动作 ---------- */
    function exportPNG() {
      renderer.draw();
      var ret = renderer.exportPNG('数学绘图器-' + stamp() + '.png');
      if (ret && typeof ret.then === 'function') {
        ret.then(function () {}, function () {});
      }
    }

    function loadExample() {
      scene.script = EXAMPLE_SCRIPT;
      scriptInput.value = EXAMPLE_SCRIPT;
      outputHost.innerHTML = '<div class="script-line is-dim">（暂无输出）</div>';
      judgeHost.innerHTML = '';
      statusHost.hidden = true;
      scriptInput.classList.remove('has-error');
      scheduleSave();
      scheduleRun();
    }

    function replaceScene(next) {
      var fresh = geo.normalize(next);
      view.cx = fresh.view.cx;
      view.cy = fresh.view.cy;
      view.pxPerUnit = fresh.view.pxPerUnit;
      scene.params = fresh.params;
      scene.expressions = fresh.expressions;
      scene.objects = fresh.objects;
      scene.script = fresh.script;
      scene.autoRun = fresh.autoRun;
      if (!scene.expressions.length) {
        scene.expressions = [{ id: 'e1', name: 'f', expr: DEFAULT_EXPR, color: '#2a63e8', visible: true }];
      }
      geo.recompute(scene);
      state.pending = [];
      setTool('select');
      setSelection(null, null);
      clearScript();
      syncAll();
    }

    function reset() {
      if (destroyed) return;
      var doReset = function () {
        if (destroyed) return;
        replaceScene(defaultScene());
        save();
      };
      if (SL.confirm) {
        if (confirmOverlay && confirmOverlay.querySelector) {
          var oldClose = confirmOverlay.querySelector('.modal-close');
          if (oldClose) oldClose.click();
        }
        var before = document.querySelectorAll('.modal-overlay').length;
        SL.confirm('确定要重置「' + labName + '」吗？当前函数、图形与脚本都会清空。', doReset,
          { okText: '重置' });
        var overlays = document.querySelectorAll('.modal-overlay');
        confirmOverlay = overlays.length > before ? overlays[overlays.length - 1] : null;
      } else {
        doReset();
      }
    }

    function refresh() {
      if (destroyed) return;
      syncAll();
    }

    /* ---------- 绑定 ---------- */
    bind(root, 'click', onRootClick);
    bind(root, 'change', onPropChange);
    bind(canvas, 'click', onCanvasClick);
    bind(canvas, 'dblclick', onDblClick);
    bind(canvas, 'pointerdown', onPointerDown);
    /* pointermove 只绑 window：canvas 上的事件会冒泡上来，避免一次移动被处理两遍 */
    bind(canvas, 'wheel', onWheel, { passive: false });
    bind(window, 'pointermove', onPointerMove);
    bind(window, 'pointerup', onPointerUp);
    bind(document, 'keydown', onKeyDown);
    bind(exprInput, 'keydown', onExprInputKey);
    bind(exprInput, 'input', onExprInput);
    bind(scriptInput, 'input', onScriptInput);
    bind(autorunInput, 'change', onAutoRunChange);

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(function () {
        if (destroyed) return;
        renderer.resize();
        scheduleDraw();
      });
      resizeObserver.observe(canvasWrap);
    } else {
      bind(window, 'resize', function () {
        if (destroyed) return;
        renderer.resize();
        scheduleDraw();
      });
    }

    /* ---------- 首次渲染 ---------- */
    syncAll();
    window.requestAnimationFrame(function () {
      if (destroyed) return;
      renderer.resize();
      renderer.draw();
    });

    /* ---------- destroy ---------- */
    function destroy() {
      if (destroyed) return;
      save();                       /* 切换 / 离开前先落盘 */

      destroyed = true;
      var keys = ['save', 'run', 'script', 'draw'];
      for (var i = 0; i < keys.length; i += 1) {
        if (!timers[keys[i]]) continue;
        if (keys[i] === 'draw') window.cancelAnimationFrame(timers[keys[i]]);
        else window.clearTimeout(timers[keys[i]]);
        timers[keys[i]] = 0;
      }
      for (var b = 0; b < bindings.length; b += 1) {
        var item = bindings[b];
        item.node.removeEventListener(item.type, item.fn, item.opts);
      }
      bindings.length = 0;
      if (resizeObserver && resizeObserver.disconnect) resizeObserver.disconnect();
      resizeObserver = null;
      if (helpDialog && typeof helpDialog.close === 'function') helpDialog.close();
      helpDialog = null;
      if (confirmOverlay && confirmOverlay.querySelector) {
        var closeBtn = confirmOverlay.querySelector('.modal-close');
        if (closeBtn) closeBtn.click();
      }
      confirmOverlay = null;
      renderer.destroy();
      host.innerHTML = '';
      controls = null;
    }

    return {
      destroy: destroy,
      save: save,
      reset: reset,
      loadExample: loadExample,
      refresh: refresh
    };
  }

  SL.math.lab = {
    mount: mount
  };
})();
