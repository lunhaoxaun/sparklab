/* 力学 · 自由刚体沙盒（mech-sandbox）
   ------------------------------------------------------------
   与其它仿真实验的区别：画面不是「参数 → 公式 → 画一遍」，
   而是「放装置 → 引擎按固定步长推进 → 每帧按 body.vertices 重画」。
   所以这里不写 calc 公式，只做三件事：
     1) 装置库（调 SL.rigid.devices）+ 落位夹取 + 存档快照；
     2) 把刚体画成项目统一风格的 SVG（节点按 body.id 复用，不重建 DOM）；
     3) 把物理量换算成初中口径的读数：g = 10 N/kg、1 px = 1 cm。 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['mech-sandbox'];

  var W = 900, H = 520, FLOOR_Y = 470;
  var MAX_BODIES = 40;
  var G = 10;

  var rt = {
    pool: {},        /* body.id → { node, body } */
    overlay: null,
    sel: null
  };

  /* ---------- 装置清单（左侧器材栏） ---------- */
  var TYPES = {
    balance: { label: '托盘天平', icon: 'seesaw', desc: '横梁 + 悬挂托盘 + 机架限位', w: 150, mount: 'floor' },
    stackBalance: { label: '小天平', icon: 'seesaw', desc: '能整体放到另一台天平的托盘上', w: 60, mount: 'free' },
    block: { label: '物块', icon: 'weight', desc: '可堆放，也可压在天平托盘上', w: 40, mount: 'free' },
    weight: { label: '砝码', icon: 'weight', desc: '小而重，适合放小托盘', w: 24, mount: 'free' },
    ramp: { label: '斜面', icon: 'ruler', desc: '静态斜面，物块会沿它下滑', w: 200, mount: 'floor' },
    wall: { label: '挡板', icon: 'gauge', desc: '竖直静态挡板，用来挡停物块', w: 20, mount: 'floor' }
  };
  var ORDER = ['balance', 'stackBalance', 'block', 'weight', 'ramp', 'wall'];

  var devices = ORDER.map(function (id) {
    var t = TYPES[id];
    return { id: id, label: t.label, icon: t.icon, desc: t.desc };
  });

  /* ---------- 世界底座 ---------- */
  function ensureBase(rigid) {
    if (!rigid) return;
    /* 清空装置后底座也会被一起清掉，所以按 role 现查，不能只用一个标志位 */
    var has = rigid.bodies().some(function (b) { return b.sl && b.sl.role === 'floor'; });
    if (has) return;
    rigid.addStatic({
      type: 'box', x: W / 2, y: FLOOR_Y + 10, w: W + 160, h: 20,
      friction: 0.9, role: 'floor'
    });
    [-6, W + 6].forEach(function (x) {
      rigid.addStatic({ type: 'box', x: x, y: H / 2, w: 12, h: H + 40, role: 'wall' });
    });
  }

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  /* ---------- 落位 ---------- */
  function clampSpot(type, x, y) {
    var t = TYPES[type] || TYPES.block;
    var half = t.w / 2 + 6;
    var px = clamp(x, half, W - half);
    if (t.mount === 'floor') return { x: px, y: FLOOR_Y };
    if (type === 'block') return { x: px, y: clamp(y, 40, FLOOR_Y - 24) };
    return { x: px, y: clamp(y, 70, FLOOR_Y) };
  }

  function groupBounds(rigid) {
    return rigid.groups().map(function (g) {
      var bb = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
      g.bodies.forEach(function (b) {
        bb.minX = Math.min(bb.minX, b.bounds.min.x);
        bb.minY = Math.min(bb.minY, b.bounds.min.y);
        bb.maxX = Math.max(bb.maxX, b.bounds.max.x);
        bb.maxY = Math.max(bb.maxY, b.bounds.max.y);
      });
      return bb;
    });
  }

  /* 空位扫描：从舞台中间向两边找第一块没被占的地方 */
  function autoSpot(rigid, type) {
    var t = TYPES[type] || TYPES.block;
    var half = t.w / 2 + 12;
    var boxes = groupBounds(rigid);
    var cands = [450, 320, 580, 200, 700, 110, 790];
    for (var i = 0; i < cands.length; i++) {
      var x = cands[i];
      var clash = boxes.some(function (bb) {
        return x + half > bb.minX - 8 && x - half < bb.maxX + 8;
      });
      if (!clash) return clampSpot(type, x, type === 'block' ? FLOOR_Y - 24 : FLOOR_Y);
    }
    return clampSpot(type, cands[rigid.count() % cands.length], FLOOR_Y);
  }

  function place(rigid, type, x, y, options) {
    if (!rigid || rigid.isDestroyed()) return null;
    var o = options || {};
    var spot = (o.raw ? { x: x, y: y } : clampSpot(type, x, y));
    if (type === 'balance') return SL.rigid.devices.balance(rigid, spot.x, FLOOR_Y, o);
    if (type === 'stackBalance') return SL.rigid.devices.stackBalance(rigid, spot.x, spot.y, o);
    if (type === 'ramp') {
      return SL.rigid.devices.ramp(rigid, spot.x, FLOOR_Y, { len: 200, thick: 10, angle: 22 });
    }
    if (type === 'wall') {
      return SL.rigid.devices.ramp(rigid, spot.x, FLOOR_Y, { len: 150, thick: 12, angle: 90, type: 'wall' });
    }
    if (type === 'weight') {
      return SL.rigid.devices.block(rigid, spot.x, spot.y, {
        w: 24, h: 24, density: 0.008, tone: 0
      });
    }
    return SL.rigid.devices.block(rigid, spot.x, spot.y, {
      tone: (rigid.count() % 3), angle: o.angle || 0
    });
  }

  /* 存档快照：静态装置记锚点，动态装置记当前位姿，刷新后原样复原 */
  function snapshot(rigid) {
    if (!rigid) return [];
    return rigid.groups().map(function (g) {
      var anchor = g.meta.anchor || { x: 0, y: 0 };
      if (g.type === 'block' && g.parts.block) {
        return { type: 'block', x: round1(g.parts.block.position.x), y: round1(g.parts.block.position.y) };
      }
      if (g.type === 'stackBalance' && g.parts.base) {
        return { type: 'stackBalance', x: round1(g.parts.base.position.x), y: round1(g.parts.base.bounds.max.y) };
      }
      return { type: g.type, x: round1(anchor.x), y: round1(anchor.y) };
    });
  }

  function round1(n) { return Math.round(n * 10) / 10; }

  /* ---------- 默认场景：一台天平两边各压一个物块（托盘水平），地上一摞物块 ---------- */
  function demo(rigid) {
    if (!rigid) return;
    var bal = SL.rigid.devices.balance(rigid, 450, FLOOR_Y);
    /* 托盘面高度从刚体上现取，别手算（hang / 立柱一改就会错） */
    var panTop = bal.parts.panL.bounds.min.y;
    SL.rigid.devices.block(rigid, 450 - 116, panTop - 21, { tone: 0 });
    SL.rigid.devices.block(rigid, 450 + 116, panTop - 21, { tone: 1 });
    SL.rigid.devices.block(rigid, 170, FLOOR_Y - 20, { tone: 2 });
    SL.rigid.devices.block(rigid, 170, FLOOR_Y - 60, { tone: 0 });
    return bal;
  }

  /* ---------- 绘制 ---------- */
  function bodyClass(body) {
    var sl = body.sl || {};
    var cls = 'rb-body rb-' + (sl.role || 'block');
    if (body.isStatic) cls += ' rb-static';
    if (sl.role === 'block') cls += ' rb-tone' + (sl.tone || 0);
    return cls;
  }

  function textNode(attrs, str) {
    var node = SL.sim.svgEl('text', attrs);
    node.textContent = str;
    return node;
  }

  function draw(ctx) {
    var stage = ctx.stage, rigid = ctx.rigid;
    if (!stage || !rigid || rigid.isDestroyed()) return;
    var pool = rt.pool;
    var alive = {};

    rigid.bodies().forEach(function (body) {
      alive[body.id] = true;
      var item = pool[body.id];
      var cls = bodyClass(body);
      if (body === ctx.sel) cls += ' is-sel';
      var pts = '';
      for (var i = 0; i < body.vertices.length; i++) {
        pts += body.vertices[i].x.toFixed(1) + ',' + body.vertices[i].y.toFixed(1) + ' ';
      }
      if (!item) {
        var node = SL.sim.svgEl('polygon', { points: pts, class: cls });
        stage.layer.appendChild(node);
        pool[body.id] = { node: node, body: body };
        return;
      }
      item.node.setAttribute('points', pts);
      item.node.setAttribute('class', cls);
    });

    Object.keys(pool).forEach(function (id) {
      if (alive[id]) return;
      var node = pool[id].node;
      if (node.parentNode) node.parentNode.removeChild(node);
      delete pool[id];
    });

    /* 覆盖层（铰点、标注、状态徽标）：每帧重建，元素很少 */
    if (!rt.overlay || !rt.overlay.parentNode) {
      rt.overlay = SL.sim.svgEl('g', { class: 'rb-overlay' });
    }
    var ov = rt.overlay;
    while (ov.firstChild) ov.removeChild(ov.firstChild);
    stage.layer.appendChild(ov);

    var stats = ctx.calc || { balances: [] };
    var balances = stats.balances || [];
    var selGroup = ctx.sel && ctx.sel.sl ? ctx.sel.sl.group : null;

    balances.forEach(function (b, index) {
      var g = rigid.group(b.id);
      if (!g) return;
      var beam = g.parts.beam;
      if (beam) {
        ov.appendChild(SL.sim.svgEl('circle', { cx: beam.position.x, cy: beam.position.y, r: 3.4, class: 'rb-pin' }));
      }
      var pivot = beam ? beam.position : null;
      if (!pivot) return;
      /* 画面里有多台天平时只写 ①② 编号（编号对上右栏读数）——
         叠放时小天平头顶就是大横梁，写完整力矩标注必然压字。 */
      if (balances.length > 1) {
        ov.appendChild(SL.sim.svgEl('circle', {
          cx: pivot.x, cy: pivot.y - 20, r: 8, class: 'rb-chip' + (b.id === selGroup ? ' is-sel' : '')
        }));
        ov.appendChild(textNode({
          x: pivot.x, y: pivot.y - 16.5, class: 'rb-chip-text', 'text-anchor': 'middle'
        }, String(index + 1)));
        return;
      }
      var label = Math.abs(b.torqueL - b.torqueR) < 0.001
        ? '左右力矩相等'
        : (b.heavier === 'left' ? '左侧偏重' : '右侧偏重');
      ov.appendChild(textNode({
        x: pivot.x, y: pivot.y - 26, class: 'rb-caption', 'text-anchor': 'middle'
      }, 'F₁L₁ ' + SL.fmt(b.torqueL, 2) + ' ｜ F₂L₂ ' + SL.fmt(b.torqueR, 2) + ' N·m · ' + label));
    });

    /* 选中物体的质量标注：只给物块/砝码写，横梁、托盘上标质量只会和铰点抢位置 */
    if (ctx.sel && ctx.sel.mass && ctx.sel.sl && ctx.sel.sl.role === 'block') {
      ov.appendChild(textNode({
        x: ctx.sel.position.x, y: ctx.sel.bounds.min.y - 7, class: 'rb-label', 'text-anchor': 'middle'
      }, Math.round(ctx.sel.mass * SL.rigid.MASS_TO_G) + ' g'));
    }

    /* 状态徽标：第一台天平平衡与否，或空场景提示（按动态刚体数判断，地面和边界不算） */
    var badge;
    if (!stats.count) {
      badge = { cls: 'rb-tip', text: '从左侧器材栏放一件装置进来，放下后会自动开始运动' };
    } else if (balances.length) {
      var b0 = balances[0];
      badge = b0.balanced
        ? { cls: 'bal-ok', text: '天平平衡　F₁L₁ = F₂L₂ = ' + SL.fmt(b0.torqueL, 2) + ' N·m' }
        : { cls: 'bal-no', text: '天平不平衡　' + (b0.heavier === 'left' ? '左' : '右') + '侧下沉　力矩差 ' +
            SL.fmt(Math.abs(b0.torqueL - b0.torqueR), 2) + ' N·m' };
    } else {
      badge = { cls: 'rb-tip', text: '刚体 ' + stats.count + ' 个　接触 ' + stats.contacts + ' 对　总动能 ' +
        SL.fmt(stats.kinetic, 3) + ' J' };
    }
    var bg = SL.sim.svgEl('rect', { x: 20, y: 18, width: 486, height: 34, rx: 9, class: 'sim-badge ' + badge.cls });
    ov.appendChild(bg);
    ov.appendChild(textNode({ x: 36, y: 40, class: 'sim-badge-text ' + badge.cls }, badge.text));
  }

  /* ---------- 读数 ---------- */
  function readouts(c) {
    var list = [
      { label: '刚体数量', value: c.count, unit: '个', digits: 0, note: '含静态机架共 ' + c.all + ' 个' },
      { label: '接触对数', value: c.contacts, unit: '对', digits: 0 },
      { label: '总动能', value: c.kinetic, unit: 'J', digits: 3, accent: true },
      { label: '最大速度', value: c.maxSpeed, unit: 'm/s', digits: 2 }
    ];
    (c.balances || []).forEach(function (b, i) {
      var tag = (c.balances.length > 1 ? '天平' + (i + 1) + ' ' : '天平 ');
      list.push({ label: tag + '左端力矩', value: b.torqueL, unit: 'N·m', digits: 2 });
      list.push({ label: tag + '右端力矩', value: b.torqueR, unit: 'N·m', digits: 2 });
      list.push({
        label: tag + '是否平衡',
        text: b.balanced ? '平衡' : '不平衡（' + (b.heavier === 'left' ? '左重' : '右重') + '）',
        accent: true
      });
    });
    return list;
  }

  function warnings(c) {
    var out = [];
    if (c.broken) out.push({ type: 'error', message: '物理求解异常，点「重置」恢复' });
    if (c.count >= MAX_BODIES) out.push({ type: 'state', message: '刚体已达 ' + MAX_BODIES + ' 个上限，可能变卡' });
    if (!c.count) out.push({ type: 'state', message: '还没有放置装置：从左侧器材栏点一个' });
    (c.balances || []).forEach(function (b, i) {
      if (b.balanced) return;
      out.push({
        type: 'state',
        message: '天平' + (i + 1) + '不平衡：' + (b.heavier === 'left' ? '左' : '右') + '端偏重 ' +
          SL.fmt(Math.abs(b.torqueL - b.torqueR), 2) + ' N·m'
      });
    });
    return out.slice(0, 3);
  }

  /* 记录单的「装置」列只有一行的宽度，用短名，数量为 1 时不写 ×1 */
  var TYPE_LABEL = { balance: '天平', stackBalance: '小天平', block: '物块', weight: '砝码', ramp: '斜面', wall: '挡板' };

  function deviceText(devices) {
    var parts = ORDER.filter(function (id) { return devices[id]; }).map(function (id) {
      return TYPE_LABEL[id] + (devices[id] > 1 ? '×' + devices[id] : '');
    });
    return parts.join(' ') || '无装置';
  }

  SL.labs['mech-sandbox'] = {
    id: 'mech-sandbox',
    kind: 'rigid',
    meta: meta,
    rt: rt,
    canvas: { w: W, h: H },
    floorY: FLOOR_Y,
    maxBodies: MAX_BODIES,
    devices: devices,
    types: TYPES,

    reset: function () {
      rt.pool = {};
      rt.overlay = null;
      rt.sel = null;
    },

    /* 由 app 在世界建好后调用一次 */
    setup: function (ctx) {
      rt.pool = {};
      rt.overlay = null;
      rt.rigid = ctx.rigid || null;
      /* 世界重建后所有 body.id 都变了，上一次画的节点要清掉，否则会留在画面上 */
      if (ctx.stage && ctx.stage.layer) {
        SL.$$('.rb-body, .rb-overlay', ctx.stage.layer).forEach(function (n) {
          if (n.parentNode) n.parentNode.removeChild(n);
        });
      }
      ensureBase(ctx.rigid);
    },

    place: place,
    autoSpot: autoSpot,
    snapshot: snapshot,
    demo: demo,
    clampSpot: clampSpot,

    /* 刚体的「计算」就是当前世界的统计快照，没有解析公式 */
    calc: function (values, ctx) {
      var rigid = (ctx && ctx.rigid) || rt.rigid || null;
      if (!rigid || rigid.isDestroyed()) {
        return { count: 0, all: 0, contacts: 0, kinetic: 0, maxSpeed: 0, devices: {}, balances: [] };
      }
      return rigid.readStats();
    },

    draw: draw,
    readouts: readouts,
    warnings: warnings,

    freeGuide: {
      title: '刚体沙盒',
      text: '这里没有固定步骤：把天平、物块、斜面摆成你想要的装置，物体会按真实的碰撞、堆叠、铰接运动。',
      list: [
        '点一下器材卡就放进画面，也可以按住拖到指定位置',
        '拖动画面里的物体可以直接推它；拖住天平底座可以整体挪位',
        '试试把「小天平」拖到另一台天平的托盘上，看它还平不平衡',
        '点物体 → 在「物体属性」里改质量、密度、摩擦，观察平衡怎么变',
        '平衡判据：两端力矩 F₁L₁ 与 F₂L₂ 相等（g 取 10 N/kg，1 px = 1 cm）'
      ]
    },

    measure: function (ctx) {
      var c = ctx.calc;
      if (!c || !c.count) {
        SL.toast('先放一件装置，等它稳定再记录', 'warn');
        return null;
      }
      var row = {
        group: ctx.rows.length + 1,
        device: deviceText(c.devices || {}),
        summary: '刚体 ' + c.count + ' ｜ 接触 ' + c.contacts + ' 对 ｜ v最大 ' +
          SL.fmt(c.maxSpeed, 2) + ' m/s',
        result: '总动能 ' + SL.fmt(c.kinetic, 3) + ' J'
      };
      var b = (c.balances || [])[0];
      if (b) {
        row.result = 'F₁L₁ ' + SL.fmt(b.torqueL, 2) + ' ｜ F₂L₂ ' + SL.fmt(b.torqueR, 2) +
          ' N·m ｜ ' + (b.balanced ? '平衡' : (b.heavier === 'left' ? '左沉' : '右沉'));
      }
      return row;
    }
  };
})();
