/* 热学自由实验室：沸腾 / 比热容 / 熔化 三套装置委托复用 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['thermo-free'];
  var meltingRt = null;
  var meltPlotHost = null;
  var meltPlotRef = null;

  function resetMelt() {
    meltingRt = { t: 0, temp: -10, melted: 0, heat: 0, curve: [], sampleAt: 0 };
  }
  function ensureMelt() { if (!meltingRt) resetMelt(); return meltingRt; }

  function meltColor(key) {
    return key === 'hypo' ? '#c4b5fd' : key === 'wax' ? '#fde68a' : '#bfdbfe';
  }

  function drawMelting(ctx) {
    var s = ctx.stage;
    var c = ctx.calc;
    var v = ctx.values;
    s.clear();

    s.rect(0, 432, 900, 88, { fill: '#f3f6fa' });
    s.line(40, 432, 860, 432, { stroke: '#dbe3ec', 'stroke-width': 1.4 });

    /* 加热器 */
    s.rect(294, 400, 312, 16, { rx: 5, fill: '#475569' });
    s.rect(320, 416, 266, 12, { rx: 3, fill: '#334155' });
    s.path('M330 396 q22 -12 44 0 t44 0 t44 0 t44 0 t44 0', {
      fill: 'none', stroke: c.t > 0 ? '#f97316' : '#cbd5e1', 'stroke-width': 4
    });
    if (c.t > 0) s.circle(450, 388, 80, { fill: 'url(#sim-glow)', opacity: 0.7 });
    s.text(450, 456, '热源 ' + v.power + ' W', { class: 'sim-note', 'text-anchor': 'middle' });

    /* 试管 */
    s.path('M400 176 L400 372 Q400 392 420 392 L480 392 Q500 392 500 372 L500 176', {
      fill: 'url(#sim-glass)', stroke: '#9fb4c7', 'stroke-width': 2
    });
    s.rect(400, 366, 100, 26, { fill: meltColor(v.material), opacity: 0.5 });
    var solidLeft = 100 * (1 - c.progress / 100);
    if (solidLeft > 0) {
      s.rect(404, 250, 92 * solidLeft / 100, 116, { fill: meltColor(v.material), opacity: 0.85 });
    }
    if (c.progress > 0) {
      s.rect(404, 360, 92 * c.progress / 100, 6, { fill: '#38bdf8', opacity: 0.8 });
    }
    s.text(450, 164, c.material + ' ' + v.mass + ' g', { class: 'sim-note', 'text-anchor': 'middle' });

    /* 温度计 */
    s.rect(441, 96, 18, 250, { rx: 9, fill: '#f8fbff', stroke: '#9fb4c7', 'stroke-width': 1.2 });
    var topY = 326 - Math.max(0, Math.min(100, c.temp + 20)) / 130 * 190;
    s.rect(446, topY, 8, 336 - topY, { fill: '#dc2626', opacity: 0.85 });
    s.circle(450, 340, 10, { fill: '#dc2626' });
    s.text(450, 84, SL.fmt(c.temp, 1) + ' ℃', { class: 'thermo-value', 'text-anchor': 'middle', 'font-weight': 700 });

    /* 状态与熔点 */
    var done = c.progress >= 99.9;
    s.rect(28, 24, 244, 36, { rx: 18, fill: '#0f766e', opacity: 0.12 });
    s.circle(48, 42, 6, { fill: '#0f766e' });
    s.text(62, 47, c.phase, { class: 'thermo-badge-text', fill: '#0f766e', 'font-weight': 600 });
    s.text(560, 60, '熔点：' + c.meltPoint + ' ℃', { class: 'sim-note' });
    s.text(560, 86, done ? '熔化过程结束，继续加热温度重新升高' : '熔化过程中继续吸热，温度保持不变', { class: 'sim-note' });

    s.rect(690, 130, 176, 240, { rx: 12, fill: '#ffffff', stroke: '#e2e8f0', 'stroke-width': 1.2 });
    s.text(706, 158, '熔化进度', { class: 'sim-note' });
    s.rect(706, 176, 144, 18, { rx: 9, fill: '#e2e8f0' });
    s.rect(706, 176, Math.max(2, 144 * c.progress / 100), 18, { rx: 9, fill: '#38bdf8' });
    s.text(706, 220, SL.fmt(c.progress, 1) + ' %', { class: 'thermo-value', 'font-weight': 700 });
    s.text(706, 252, '已熔化 ' + SL.fmt(c.melted, 0) + ' g', { class: 'sim-note' });
    s.text(706, 274, '剩余 ' + SL.fmt(c.remaining, 0) + ' g', { class: 'sim-note' });
  }

  function renderMeltPlot(host) {
    if (!host) return;
    var r = ensureMelt();
    if (meltPlotHost !== host || !host.querySelector('.plot-svg')) {
      host.innerHTML = '<div class="plot-card"><div class="plot-head"><span>熔化温度—时间图像</span>' +
        '<em>' + r.curve.length + ' 个采样点</em></div><div class="plot-svg"></div></div>';
      meltPlotHost = host;
      meltPlotRef = SL.sim.Plot(host.querySelector('.plot-svg'), {
        w: 360, h: 210, xLabel: '加热时间 t/s', yLabel: '温度 T/℃', yMin: -20, yMax: 110,
        foot: function () { return '图像上的平台对应晶体熔化过程：吸热但温度不变'; }
      });
    }
    meltPlotRef.setSeries([{ name: '温度', color: '#0f766e', points: r.curve }]);
  }

  resetMelt();

  var meltingPart = {
    id: 'melting',
    canvas: { w: 900, h: 520 },
    controls: [
      {
        key: 'material', label: '晶体材料', type: 'select',
        options: [{ value: 'ice', label: '冰（熔点 0 ℃）' }, { value: 'hypo', label: '海波（熔点 48 ℃）' }, { value: 'wax', label: '蜡（熔点 60 ℃）' }],
        note: '更换材料会重置温度曲线'
      },
      {
        key: 'mass', label: '晶体质量', type: 'range',
        min: 50, max: 200, step: 25, unit: 'g', digits: 0
      },
      {
        key: 'power', label: '加热功率', type: 'range',
        min: 200, max: 800, step: 50, unit: 'W', digits: 0
      }
    ],
    defaults: { material: 'ice', mass: 100, power: 500 },
    rt: null,

    reset: resetMelt,
    calc: function (values) { return SL.thermo.melting(values, ensureMelt()); },
    draw: drawMelting,

    readouts: function (c) {
      return [
        { label: '温度', value: c.temp, unit: '℃', digits: 1, accent: true },
        { label: '状态', text: c.phase },
        { label: '熔点', value: c.meltPoint, unit: '℃', digits: 0 },
        { label: '熔化进度', value: c.progress, unit: '%', digits: 1 },
        { label: '已熔化', value: c.melted, unit: 'g', digits: 0 },
        { label: '加热时间', value: c.t, unit: 's', digits: 1 }
      ];
    },

    warnings: function (c) {
      if (c.t <= 0) return [{ type: 'state', message: '点击「播放」开始加热，观察熔化前后温度的变化' }];
      if (c.progress > 0 && c.progress < 99.9) {
        return [{ type: 'ok', message: '熔化中：继续吸热，温度保持 ' + c.meltPoint + ' ℃ 不变' }];
      }
      if (c.progress >= 99.9) return [{ type: 'state', message: '晶体已全部熔化，继续加热温度重新升高' }];
      return [];
    },

    measure: function (ctx) {
      var c = ctx.calc;
      return {
        group: ctx.rows.length + 1,
        device: '晶体熔化',
        summary: c.material + ' ' + ctx.values.mass + ' g ｜ ' + ctx.values.power + ' W',
        result: '温度 ' + SL.fmt(c.temp, 1) + ' ℃ ｜ ' + c.phase + ' ' + SL.fmt(c.progress, 0) + '%'
      };
    },

    renderExtra: function (host) { renderMeltPlot(host); },

    onTick: function (dt, ctx) {
      var r = ensureMelt();
      SL.thermo.tickMelting(dt, ctx.values, r);
      if (r.t - r.sampleAt >= 1) {
        r.sampleAt = Math.floor(r.t);
        r.curve.push({ x: Math.round(r.t * 10) / 10, y: Number(r.temp.toFixed(2)) });
        if (r.curve.length > 240) r.curve.shift();
        renderMeltPlot(SL.$('#extra-host'));
      }
    },

    animated: true,

    onParam: function (key) {
      if (key === 'material') {
        resetMelt();
        renderMeltPlot(SL.$('#extra-host'));
      }
    },

    onReset: function () {
      resetMelt();
      meltPlotHost = null;
      meltPlotRef = null;
    }
  };

  var FREE_DEVICES = [
    { id: 'thermo-boiling', label: '水沸腾' },
    { id: 'thermo-heatcap', label: '比热容' },
    { id: 'melting', label: '晶体熔化' }
  ];

  var PARTS = {
    'thermo-boiling': SL.labs['thermo-boiling'],
    'thermo-heatcap': SL.labs['thermo-heatcap'],
    melting: meltingPart
  };

  function mounted(values) {
    return PARTS[values.device] || PARTS['thermo-boiling'];
  }

  var controls = [{
    key: 'device',
    label: '实验装置',
    type: 'buttons',
    options: FREE_DEVICES.map(function (d) { return { value: d.id, label: d.label }; }),
    note: '切换装置会换掉整套参数，已有记录仍在记录单里'
  }]
    .concat(SL.sim.byDevice('thermo-boiling', SL.labs['thermo-boiling'].controls))
    .concat(SL.sim.byDevice('thermo-heatcap', SL.labs['thermo-heatcap'].controls))
    .concat(SL.sim.byDevice('melting', meltingPart.controls));

  var defaults = { device: 'thermo-boiling' };
  FREE_DEVICES.forEach(function (d) {
    var src = PARTS[d.id] && PARTS[d.id].defaults || {};
    Object.keys(src).forEach(function (key) {
      if (key !== 'device') defaults[key] = src[key];
    });
  });

  function resetAll() {
    FREE_DEVICES.forEach(function (d) {
      if (PARTS[d.id] && PARTS[d.id].reset) PARTS[d.id].reset();
    });
  }

  function freeMeasure(ctx) {
    var v = ctx.values;
    var c = ctx.calc;
    if (v.device === 'thermo-heatcap') {
      return {
        group: ctx.rows.length + 1,
        device: '比热容',
        summary: c.labelA + ' / ' + c.labelB + ' ' + v.mass + ' g ｜ ' + v.power + ' W',
        result: 'ΔtA ' + SL.fmt(c.dTA, 1) + ' ℃ ｜ ΔtB ' + SL.fmt(c.dTB, 1) + ' ℃'
      };
    }
    if (v.device === 'melting') {
      return {
        group: ctx.rows.length + 1,
        device: '晶体熔化',
        summary: c.material + ' ' + v.mass + ' g ｜ ' + v.power + ' W',
        result: '温度 ' + SL.fmt(c.temp, 1) + ' ℃ ｜ ' + c.phase + ' ' + SL.fmt(c.progress, 0) + '%'
      };
    }
    return {
      group: ctx.rows.length + 1,
      device: '水沸腾',
      summary: '水 ' + v.mass + ' g ｜ ' + v.power + ' W',
      result: '温度 ' + SL.fmt(c.temp, 1) + ' ℃ ｜ 已加热 ' + SL.fmt(c.t, 1) + ' s'
    };
  }

  SL.labs['thermo-free'] = {
    id: 'thermo-free',
    kind: 'sim',
    meta: meta,
    canvas: { w: 900, h: 520 },
    controls: controls,
    defaults: defaults,
    freeDevices: FREE_DEVICES,
    parts: PARTS,
    rebuildOn: ['device'],
    rt: null,

    freeGuide: {
      title: '热学自由实验室',
      text: '三套热学装置随时切换，功率、质量、材料全部开放、没有步骤限制。想验证什么就改什么，读数与温度曲线会立刻重算。'
    },

    reset: resetAll,
    calc: function (values) { return mounted(values).calc(values); },
    setup: function (ctx) { if (mounted(ctx.values).setup) mounted(ctx.values).setup(ctx); },
    draw: function (ctx) { mounted(ctx.values).draw(ctx); },
    readouts: function (c, values) { return mounted(values).readouts(c, values); },
    warnings: function (c, values) { return mounted(values).warnings(c, values) || []; },
    measure: freeMeasure,
    renderExtra: function (host, rows, values) {
      var part = mounted(values);
      if (part.renderExtra) part.renderExtra(host, rows, values);
    },
    onTick: function (dt, ctx) {
      var part = mounted(ctx.values);
      if (part.onTick) part.onTick(dt, ctx);
    },
    onParam: function (key, ctx) {
      var part = mounted(ctx.values);
      if (part.onParam) part.onParam(key, ctx);
    },
    onReset: function (ctx) {
      resetAll();
      if (ctx && ctx.values) {
        var part = mounted(ctx.values);
        if (part.onReset) part.onReset(ctx);
      }
    },
    animated: function (values) {
      var part = mounted(values);
      return typeof part.animated === 'function' ? !!part.animated(values) : !!part.animated;
    }
  };
})();
