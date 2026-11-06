/* 物理自由实验室：力 / 热 / 光 三科自由实验室委托 + 电学桥接
   本文件不写任何物理公式，也不画任何仪器；只负责装置切换与数据行转发。
   未来新增物理装置：改对应学科自由实验室的 parts / freeDevices 即可，这里自动出现。 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['physics-free'];

  var GROUP_LABS = [
    SL.labs['mech-free'],
    SL.labs['thermo-free'],
    SL.labs['optics-free']
  ];

  var DEVICE_OPTIONS = [];
  GROUP_LABS.forEach(function (lab) {
    (lab.freeDevices || []).forEach(function (d) {
      DEVICE_OPTIONS.push({ value: d.id, label: d.label });
    });
  });
  DEVICE_OPTIONS.push({ value: 'electricity', label: '电学（跳转全自由电学）' });

  function groupLab(values) {
    var id = values && values.device;
    if (!id || id === 'electricity') return null;
    for (var i = 0; i < GROUP_LABS.length; i++) {
      var lab = GROUP_LABS[i];
      var hit = (lab.freeDevices || []).some(function (d) { return d.id === id; });
      if (hit) return lab;
    }
    return null;
  }

  var controls = [{
    key: 'device',
    label: '实验装置',
    type: 'select',
    options: DEVICE_OPTIONS,
    note: '力 3 + 热 3 + 光 3，共 9 套装置；电学一键跳转'
  }];

  GROUP_LABS.forEach(function (lab) {
    var defs = (lab.controls || []).filter(function (d) { return d.key !== 'device'; });
    var ids = (lab.freeDevices || []).map(function (d) { return d.id; });
    ids.forEach(function (id) {
      /* 学科自由实验室的控件已按装置用 when 分好组，这里先按其装置参数筛选一次，
         再统一改写成「当前 device = 该装置」，避免把同科其他装置（如滑轮的绳段）也带出来 */
      var probe = Object.assign({}, lab.defaults || {}, { device: id });
      var only = defs.filter(function (d) { return !d.when || d.when(probe); });
      controls = controls.concat(SL.sim.byDevice(id, only));
    });
  });

  controls.push({
    key: 'openCircuit',
    label: '电学实验入口',
    type: 'buttons',
    options: [{ value: 'go', label: '打开全自由电学实验室' }],
    when: function (values) { return values.device === 'electricity'; },
    note: '电路元件库、MNA 求解、表盘读数都在独立电路引擎里'
  });

  var defaults = { device: 'lever' };
  GROUP_LABS.forEach(function (lab) {
    var src = lab.defaults || {};
    Object.keys(src).forEach(function (key) {
      if (key !== 'device') defaults[key] = src[key];
    });
  });
  defaults.device = 'lever';

  function resetAll() {
    GROUP_LABS.forEach(function (lab) {
      if (lab.reset) lab.reset();
    });
  }

  function drawBridge(ctx) {
    var s = ctx.stage;
    s.clear();
    s.rect(0, 0, 900, 520, { fill: '#f8fafc' });

    s.rect(150, 76, 600, 352, { rx: 18, fill: '#ffffff', stroke: '#c7d2fe', 'stroke-width': 1.5 });
    s.rect(150, 76, 600, 10, { rx: 5, fill: '#7c5cff' });

    s.text(450, 140, '电学实验使用独立电路引擎', {
      class: 'physics-bridge-title', 'text-anchor': 'middle', fill: '#4338ca', 'font-weight': 700
    });
    s.text(450, 172, '物理自由实验室已经把力、热、光三科装置合一；', {
      class: 'sim-note', 'text-anchor': 'middle'
    });
    s.text(450, 196, '电学需要元件库与节点方程求解，因此单独放在全自由电学实验室。', {
      class: 'sim-note', 'text-anchor': 'middle'
    });

    /* 简易电路缩略图 */
    var bx = 300, by = 250;
    s.line(bx, by, bx + 300, by, { stroke: '#334155', 'stroke-width': 2.6 });
    s.line(bx, by + 100, bx + 300, by + 100, { stroke: '#334155', 'stroke-width': 2.6 });
    s.line(bx, by, bx, by + 40, { stroke: '#334155', 'stroke-width': 2.6 });
    s.line(bx, by + 70, bx, by + 100, { stroke: '#334155', 'stroke-width': 2.6 });
    s.line(bx + 300, by, bx + 300, by + 32, { stroke: '#334155', 'stroke-width': 2.6 });
    s.line(bx + 300, by + 76, bx + 300, by + 100, { stroke: '#334155', 'stroke-width': 2.6 });
    s.line(bx + 285, by + 32, bx + 315, by + 32, { stroke: '#334155', 'stroke-width': 3 });
    s.line(bx + 285, by + 42, bx + 315, by + 42, { stroke: '#334155', 'stroke-width': 2.4 });
    s.line(bx + 285, by + 66, bx + 315, by + 66, { stroke: '#334155', 'stroke-width': 2.4 });
    s.line(bx + 285, by + 76, bx + 315, by + 76, { stroke: '#334155', 'stroke-width': 3 });
    s.rect(bx + 132, by - 12, 44, 24, { fill: '#fef3c7', stroke: '#f59e0b', 'stroke-width': 1.6 });
    s.text(bx + 154, by + 6, 'R', { class: 'sim-note', 'text-anchor': 'middle' });
    s.text(bx + 300, by + 140, '电源 · 电阻 · 开关 · 表盘', { class: 'sim-note', 'text-anchor': 'middle' });

    s.rect(240, 360, 420, 40, { rx: 20, fill: '#7c5cff', opacity: 0.12 });
    s.text(450, 386, '点击左侧「打开全自由电学实验室」按钮', {
      class: 'physics-bridge-text', 'text-anchor': 'middle', fill: '#6d28d9', 'font-weight': 600
    });
  }

  function drawBridgeExtra(host) {
    if (!host) return;
    host.innerHTML = '<div class="plot-card"><div class="plot-head"><span>电学为什么不塞进来</span><em>独立引擎</em></div>' +
      '<div class="lens-rule-list">' +
      '<div>① 电路由元件与导线组成，需要拓扑编辑与节点方程求解</div>' +
      '<div>② 表盘、变阻器、开关状态需要独立的元件生命周期</div>' +
      '<div>③ 力、热、光装置是单场景直接仿真，可以统一委托</div>' +
      '<div>④ 点击左侧按钮即进入全自由电学实验室，数据在那边记录</div>' +
      '</div></div>';
  }

  SL.labs['physics-free'] = {
    id: 'physics-free',
    kind: 'sim',
    meta: meta,
    canvas: { w: 900, h: 520 },
    controls: controls,
    defaults: defaults,
    freeDevices: DEVICE_OPTIONS,
    groups: GROUP_LABS,
    rebuildOn: ['device'],
    rt: null,

    freeGuide: {
      title: '物理自由实验室',
      text: '力、热、光九套装置集中在一个实验台，切换装置就换整套参数与读数；每个学科仍然保留自己的独立自由实验室。'
    },

    reset: resetAll,

    calc: function (values) {
      if (values.device === 'electricity') return { bridge: true };
      var lab = groupLab(values);
      return lab ? lab.calc(values) : { bridge: true };
    },

    setup: function (ctx) {
      var lab = groupLab(ctx.values);
      if (lab && lab.setup) lab.setup(ctx);
    },

    draw: function (ctx) {
      if (ctx.values.device === 'electricity') return drawBridge(ctx);
      var lab = groupLab(ctx.values);
      if (lab) lab.draw(ctx);
    },

    readouts: function (c, values) {
      if (values.device === 'electricity') {
        return [
          { label: '当前装置', text: '电学（独立电路引擎）' },
          { label: '元件库', text: '电池、灯泡、电阻、变阻器、开关、电表' },
          { label: '数据记录', text: '请到全自由电学实验室完成' }
        ];
      }
      var lab = groupLab(values);
      return lab ? lab.readouts(c, values) : [];
    },

    warnings: function (c, values) {
      if (values.device === 'electricity') {
        return [{ type: 'state', message: '电学实验请点击左侧按钮进入全自由电学实验室' }];
      }
      var lab = groupLab(values);
      return lab ? (lab.warnings(c, values) || []) : [];
    },

    measure: function (ctx) {
      if (ctx.values.device === 'electricity') {
        SL.toast('电学数据请在全自由电学实验室记录', 'warn');
        return null;
      }
      var lab = groupLab(ctx.values);
      return lab ? lab.measure(ctx) : null;
    },

    renderExtra: function (host, rows, values) {
      if (values.device === 'electricity') return drawBridgeExtra(host);
      var lab = groupLab(values);
      if (lab && lab.renderExtra) lab.renderExtra(host, rows, values);
    },

    onTick: function (dt, ctx) {
      var lab = groupLab(ctx.values);
      if (lab && lab.onTick) lab.onTick(dt, ctx);
    },

    onParam: function (key, ctx) {
      if (key === 'openCircuit') {
        SL.app.openLab('sandbox');
        return;
      }
      var lab = groupLab(ctx.values);
      if (lab && lab.onParam) lab.onParam(key, ctx);
    },

    onReset: function (ctx) {
      resetAll();
      var lab = ctx && groupLab(ctx.values);
      if (lab && lab.onReset) lab.onReset(ctx);
    },

    animated: function (values) {
      if (values.device === 'electricity') return false;
      var lab = groupLab(values);
      if (!lab) return false;
      return typeof lab.animated === 'function' ? !!lab.animated(values) : !!lab.animated;
    }
  };
})();
