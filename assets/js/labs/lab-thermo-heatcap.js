/* 比较不同物质的吸热能力（比热容） */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['thermo-heatcap'];
  var rt = null;
  var plotHost = null;
  var plotRef = null;

  function resetRt() {
    rt = { t: 0, ta: 20, tb: 20, curveA: [], curveB: [], sampleAt: 0 };
  }
  function ensureRt() { if (!rt) resetRt(); return rt; }

  function liquidColor(key) {
    return key === 'oil' ? '#eab308' : '#60a5fa';
  }

  function beaker(s, x, label, temp, color, mass) {
    var w = 160, top = 210, bottom = 378;
    s.path('M' + x + ' ' + top + ' L' + x + ' ' + (bottom + 2) +
      ' Q' + x + ' ' + (bottom + 12) + ' ' + (x + 12) + ' ' + (bottom + 12) +
      ' L' + (x + w - 12) + ' ' + (bottom + 12) +
      ' Q' + (x + w) + ' ' + (bottom + 12) + ' ' + (x + w) + ' ' + (bottom + 2) +
      ' L' + (x + w) + ' ' + top, {
      fill: 'url(#sim-glass)', stroke: '#9fb4c7', 'stroke-width': 2
    });
    var liquidTop = 260;
    s.rect(x + 3, liquidTop, w - 6, bottom - liquidTop, { fill: color, opacity: 0.18 });
    s.line(x + 3, liquidTop, x + w - 3, liquidTop, { stroke: color, 'stroke-width': 1.4, opacity: 0.7 });
    s.text(x + w / 2, top - 14, label + ' ' + mass + ' g', { class: 'sim-note', 'text-anchor': 'middle' });

    /* 温度计 */
    var cx = x + w / 2;
    s.rect(cx - 9, 118, 18, 220, { rx: 9, fill: '#f8fbff', stroke: '#9fb4c7', 'stroke-width': 1.2 });
    var topY = 328 - Math.max(0, Math.min(100, temp)) / 100 * 190;
    s.rect(cx - 4, topY, 8, 330 - topY, { fill: '#dc2626', opacity: 0.85 });
    s.circle(cx, 334, 9, { fill: '#dc2626' });
    s.text(cx, 108, SL.fmt(temp, 1) + ' ℃', { class: 'thermo-value', 'text-anchor': 'middle', 'font-weight': 700 });
  }

  function draw(ctx) {
    var s = ctx.stage;
    var c = ctx.calc;
    var v = ctx.values;
    s.clear();

    s.rect(0, 432, 900, 88, { fill: '#f3f6fa' });
    s.line(30, 432, 870, 432, { stroke: '#dbe3ec', 'stroke-width': 1.4 });

    beaker(s, 132, c.labelA, c.ta, liquidColor(v.materialA), v.mass);
    beaker(s, 472, c.labelB, c.tb, liquidColor(v.materialB), v.mass);

    /* 相同热源 */
    [132, 472].forEach(function (x) {
      s.rect(x + 34, 392, 92, 14, { rx: 4, fill: '#475569' });
      s.path('M' + (x + 44) + ' 388 q16 -10 32 0 t32 0', {
        fill: 'none', stroke: c.t > 0 ? '#f97316' : '#cbd5e1', 'stroke-width': 3.5
      });
      s.text(x + 80, 424, '相同热源 ' + v.power + ' W', { class: 'sim-note', 'text-anchor': 'middle' });
    });

    /* 升温对照条 */
    s.rect(690, 130, 176, 262, { rx: 12, fill: '#ffffff', stroke: '#e2e8f0', 'stroke-width': 1.2 });
    s.text(706, 158, '升高的温度 ΔT', { class: 'sim-note' });
    var maxDT = Math.max(10, c.dTA, c.dTB);
    [{
      x: 712, label: 'A ' + c.labelA, val: c.dTA, color: liquidColor(v.materialA)
    }, {
      x: 800, label: 'B ' + c.labelB, val: c.dTB, color: liquidColor(v.materialB)
    }].forEach(function (bar) {
      var h = bar.val / maxDT * 160;
      s.rect(bar.x, 352 - h, 44, h, { rx: 5, fill: bar.color, opacity: 0.75 });
      s.text(bar.x + 22, 344 - h, SL.fmt(bar.val, 1) + ' ℃', { class: 'thermo-value', 'text-anchor': 'middle', 'font-weight': 700 });
      s.text(bar.x + 22, 378, bar.label, { class: 'sim-note', 'text-anchor': 'middle' });
    });

    /* 顶部状态 */
    s.rect(28, 24, 250, 36, { rx: 18, fill: '#b45309', opacity: 0.12 });
    s.circle(48, 42, 6, { fill: '#b45309' });
    s.text(62, 47, c.t > 0 ? (c.slower + ' 升温更慢') : '相同质量、相同热源', {
      class: 'thermo-badge-text', fill: '#b45309', 'font-weight': 600
    });
    s.text(560, 58, '相同质量、相同热源，比较升温快慢', { class: 'sim-note' });
  }

  function renderPlot(host) {
    if (!host) return;
    var r = ensureRt();
    if (plotHost !== host || !host.querySelector('.plot-svg')) {
      host.innerHTML = '<div class="plot-card"><div class="plot-head"><span>升温曲线对照</span>' +
        '<em>' + r.curveA.length + ' 个采样点</em></div><div class="plot-svg"></div></div>';
      plotHost = host;
      plotRef = SL.sim.Plot(host.querySelector('.plot-svg'), {
        w: 360, h: 210, xLabel: '加热时间 t/s', yLabel: '温度 T/℃', yMin: 0, yMax: 100,
        foot: function () { return '相同时间内，食用油升高的温度约为水的 2 倍'; }
      });
    }
    /* 曲线名跟随当前材料，避免切材料后图例过期 */
    plotRef.setSeries([
      { name: 'A', color: '#60a5fa', points: r.curveA },
      { name: 'B', color: '#eab308', points: r.curveB }
    ]);
  }

  resetRt();

  SL.labs['thermo-heatcap'] = {
    id: 'thermo-heatcap',
    kind: 'sim',
    meta: meta,
    canvas: { w: 900, h: 520 },
    controls: [
      {
        key: 'materialA', label: 'A 杯中的物质', type: 'select',
        options: [{ value: 'water', label: '水' }, { value: 'oil', label: '食用油' }],
        note: '默认用水做参照'
      },
      {
        key: 'materialB', label: 'B 杯中的物质', type: 'select',
        options: [{ value: 'water', label: '水' }, { value: 'oil', label: '食用油' }],
        note: '换成食用油后升温会明显变快'
      },
      {
        key: 'mass', label: '每杯质量', type: 'range',
        min: 50, max: 200, step: 25, unit: 'g', digits: 0,
        note: '两杯质量必须相同才公平'
      },
      {
        key: 'power', label: '每个热源的功率', type: 'range',
        min: 100, max: 600, step: 50, unit: 'W', digits: 0
      }
    ],
    defaults: { materialA: 'water', materialB: 'oil', mass: 100, power: 300 },
    rt: null,

    reset: resetRt,

    calc: function (values) {
      return SL.thermo.heatCapacity(values, ensureRt());
    },

    draw: draw,

    readouts: function (c) {
      return [
        { label: 'A 杯温度', value: c.ta, unit: '℃', digits: 1 },
        { label: 'B 杯温度', value: c.tb, unit: '℃', digits: 1 },
        { label: 'ΔtA', value: c.dTA, unit: '℃', digits: 1 },
        { label: 'ΔtB', value: c.dTB, unit: '℃', digits: 1 },
        { label: 'ΔtB/ΔtA', value: c.ratio, digits: 2, accent: true },
        { label: '升温更慢', text: c.slower }
      ];
    },

    warnings: function (c) {
      if (c.t <= 0) return [{ type: 'state', message: '点击左栏「播放」开始加热，比较两杯的升温快慢' }];
      if (c.ta >= 95 || c.tb >= 95) return [{ type: 'state', message: '温度已接近 95 ℃，可以停止加热并记录数据' }];
      return [];
    },

    measure: function (ctx) {
      var c = ctx.calc;
      return {
        group: ctx.rows.length + 1,
        materialA: c.labelA,
        materialB: c.labelB,
        mass: ctx.values.mass,
        power: ctx.values.power,
        time: Number(c.t.toFixed(1)),
        dTA: Number(c.dTA.toFixed(1)),
        dTB: Number(c.dTB.toFixed(1)),
        ratio: Number(c.ratio.toFixed(2))
      };
    },

    renderExtra: renderPlot,

    onTick: function (dt, ctx) {
      var r = ensureRt();
      SL.thermo.tickHeatCapacity(dt, ctx.values, r);
      if (r.t - r.sampleAt >= 1) {
        r.sampleAt = Math.floor(r.t);
        r.curveA.push({ x: Math.round(r.t * 10) / 10, y: Number(r.ta.toFixed(2)) });
        r.curveB.push({ x: Math.round(r.t * 10) / 10, y: Number(r.tb.toFixed(2)) });
        if (r.curveA.length > 240) {
          r.curveA.shift();
          r.curveB.shift();
        }
        renderPlot(SL.$('#extra-host'));
      }
    },

    animated: true,

    onParam: function (key) {
      if (key === 'materialA' || key === 'materialB') {
        resetRt();
        renderPlot(SL.$('#extra-host'));
      }
    },

    onReset: function () {
      resetRt();
      plotHost = null;
      plotRef = null;
    }
  };

  if (meta.steps && meta.steps.length) {
    meta.steps[0].check = function (ctx) {
      return ctx.values.materialA === 'water' && ctx.values.materialB === 'oil' && ctx.values.mass === 100;
    };
    meta.steps[1].check = function (ctx) {
      return ensureRt().t >= 10;
    };
    meta.steps[2].check = function (ctx) {
      return ctx.rows.length >= 2;
    };
    meta.steps[3].check = function (ctx) {
      return ctx.state.allAnswered;
    };
  }
})();
