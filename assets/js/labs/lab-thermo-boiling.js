/* 探究水沸腾时温度变化的特点 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['thermo-boiling'];
  var rt = null;
  var plotRef = null;
  var plotHost = null;

  function resetRt() {
    rt = { t: 0, temp: 20, vapor: 0, heat: 0, curve: [], maxTemp: 20, plateauT: 0, touched: false, sampleAt: 0 };
  }

  function ensureRt() { if (!rt) resetRt(); return rt; }

  function tempColor(temp) {
    var k = Math.max(0, Math.min(1, temp / 100));
    return 'rgb(' + Math.round(96 + 120 * k) + ',' + Math.round(165 - 60 * k) + ',' + Math.round(220 - 120 * k) + ')';
  }

  function yOfTemp(temp) {
    return 400 - Math.max(-5, Math.min(120, temp)) / 120 * 250;
  }

  function drawThermo(x, yTop, yBottom, temp) {
    var top = yBottom - 26 - Math.max(0, Math.min(1, temp / 120)) * (yBottom - 26 - yTop);
    return { top: top, color: tempColor(temp) };
  }

  function draw(ctx) {
    var s = ctx.stage;
    var c = ctx.calc;
    var v = ctx.values;
    s.clear();

    /* 台面 */
    s.rect(0, 430, 900, 90, { fill: '#f3f6fa' });
    s.line(40, 430, 860, 430, { stroke: '#dbe3ec', 'stroke-width': 1.4 });

    /* 电热器 */
    s.rect(262, 402, 238, 16, { rx: 4, class: 'thermo-heater-base', fill: '#475569' });
    s.rect(282, 418, 198, 12, { rx: 3, fill: '#334155' });
    var heatOn = c.t > 0 && c.phase !== '已汽化';
    s.path('M292 398 q18 -12 36 0 t36 0 t36 0 t36 0 t36 0', {
      class: 'thermo-coil', fill: 'none', stroke: heatOn ? '#f97316' : '#cbd5e1', 'stroke-width': 4
    });
    if (heatOn) {
      s.circle(381, 390, 64, { fill: 'url(#sim-glow)', opacity: 0.75 });
    }
    s.text(381, 456, '电热器 ' + v.power + ' W', { class: 'sim-note', 'text-anchor': 'middle' });

    /* 烧杯 */
    s.path('M300 208 L300 382 Q300 392 312 392 L450 392 Q462 392 462 382 L462 208', {
      class: 'thermo-beaker', fill: 'url(#sim-glass)', stroke: '#9fb4c7', 'stroke-width': 2
    });
    s.rect(300, 382, 162, 10, { fill: '#b7c8d8' });
    var waterTop = 252;
    s.rect(303, waterTop, 156, 386 - waterTop, {
      class: 'thermo-water', fill: 'url(#sim-liquid)', stroke: 'none'
    });
    var cWater = tempColor(c.temp);
    s.rect(303, waterTop, 156, 386 - waterTop, { fill: cWater, opacity: 0.16 });
    s.line(303, waterTop, 459, waterTop, { stroke: '#8ec5e3', 'stroke-width': 1.4 });
    s.text(381, 236, '水 ' + v.mass + ' g', { class: 'sim-note', 'text-anchor': 'middle' });
    if (v.cover) {
      s.path('M296 208 L466 208 L450 200 L312 200 Z', { fill: '#dbe6f0', stroke: '#94a9bd', 'stroke-width': 1.2 });
      s.text(381, 192, '盖子（减少散热）', { class: 'sim-note', 'text-anchor': 'middle' });
    }

    /* 温度计 */
    s.rect(386, 96, 18, 248, { rx: 9, fill: '#f8fbff', stroke: '#9fb4c7', 'stroke-width': 1.4 });
    var th = drawThermo(386, 106, 338, c.temp);
    s.rect(391, th.top, 8, 340 - th.top, { fill: th.color, opacity: 0.9 });
    s.circle(395, 344, 10, { fill: th.color });
    for (var tt = 0; tt <= 120; tt += 20) {
      var ty = 400 - tt / 120 * 250;
      s.line(406, ty, 416, ty, { stroke: '#a9bccd', 'stroke-width': 1 });
      s.text(420, ty + 4, String(tt), { class: 'thermo-tick' });
    }
    s.text(395, 84, '温度计', { class: 'sim-note', 'text-anchor': 'middle' });

    /* 气泡与白汽 */
    if (c.reached) {
      var phaseT = c.t;
      for (var i = 0; i < 9; i++) {
        var bx = 318 + (i * 37 + Math.sin(phaseT * 1.6 + i) * 8) % 130;
        var by = 372 - ((phaseT * 36 + i * 26) % 116);
        s.circle(bx, by, 3 + (i % 3), { fill: '#ffffff', opacity: 0.55 });
      }
      for (var k = 0; k < 4; k++) {
        var sx = 342 + k * 28;
        var lift = (phaseT * 18 + k * 34) % 70;
        s.path('M' + sx + ' 236 q-10 -18 0 -34 t0 -30', {
          fill: 'none', stroke: '#e2e8f0', 'stroke-width': 2.2, opacity: 0.55 - lift / 200
        });
      }
    }

    /* 状态徽标 */
    var badgeColor = c.phase === '已汽化' ? '#64748b' : c.reached ? '#c2410c' : '#2563eb';
    s.rect(28, 24, 214, 36, { rx: 18, fill: badgeColor, opacity: 0.12 });
    s.circle(48, 42, 6, { fill: badgeColor });
    s.text(62, 47, c.phase + ' · ' + SL.fmt(c.temp, 1) + ' ℃', { class: 'thermo-badge-text', fill: badgeColor, 'font-weight': 600 });

    /* 温度标尺 */
    s.rect(690, 118, 54, 292, { rx: 8, fill: '#f8fbff', stroke: '#dbe3ec', 'stroke-width': 1.2 });
    var barBottom = 396;
    var barTop = barBottom - Math.max(0, Math.min(120, c.temp)) / 120 * 262;
    s.rect(700, barTop, 18, barBottom - barTop, { fill: tempColor(c.temp), opacity: 0.85 });
    for (var g = 0; g <= 120; g += 20) {
      var gy = barBottom - g / 120 * 262;
      s.line(722, gy, 732, gy, { stroke: '#b8c6d4', 'stroke-width': 1 });
      s.text(737, gy + 4, String(g), { class: 'thermo-tick' });
    }
    s.text(717, 104, '℃', { class: 'sim-note', 'text-anchor': 'middle' });
    s.text(717, 430, '沸点 100 ℃', { class: 'sim-note', 'text-anchor': 'middle' });

    /* 关键读数卡片 */
    s.rect(560, 118, 104, 112, { rx: 10, fill: '#ffffff', stroke: '#e2e8f0', 'stroke-width': 1.2 });
    s.text(570, 142, '加热时间', { class: 'sim-note' });
    s.text(570, 168, SL.fmt(c.t, 1) + ' s', { class: 'thermo-value', 'font-weight': 700 });
    s.text(570, 196, '累计吸热', { class: 'sim-note' });
    s.text(570, 220, SL.fmt(c.absorbed / 1000, 1) + ' kJ', { class: 'thermo-value', 'font-weight': 700 });

    s.text(560, 62, '沸腾前：温度持续升高', { class: 'sim-note' });
    s.text(560, 84, '沸腾时：继续吸热，温度不变', { class: 'sim-note' });
  }

  function curveSeries() {
    var r = ensureRt();
    return [{ name: '水温', color: '#c2410c', points: r.curve }];
  }

  function renderPlot(host) {
    if (!host) return;
    var r = ensureRt();
    if (plotHost !== host || !host.querySelector('.plot-svg')) {
      host.innerHTML = '<div class="plot-card"><div class="plot-head"><span>温度—时间图像</span>' +
        '<em>' + r.curve.length + ' 个采样点</em></div><div class="plot-svg"></div></div>';
      plotHost = host;
      plotRef = SL.sim.Plot(host.querySelector('.plot-svg'), {
        w: 360, h: 210, xLabel: '加热时间 t/s', yLabel: '温度 T/℃', yMin: 0, yMax: 120,
        foot: function () {
          return '平台出现在 100 ℃：沸腾时吸热但温度不变';
        }
      });
    }
    plotRef.setSeries(curveSeries());
  }

  function measure(ctx) {
    var c = ctx.calc;
    return {
      group: ctx.rows.length + 1,
      power: ctx.values.power,
      mass: ctx.values.mass,
      time: Number(SL.fmt(c.t, 1)),
      temp: Number(c.temp.toFixed(1)),
      state: c.phase
    };
  }

  resetRt();

  SL.labs['thermo-boiling'] = {
    id: 'thermo-boiling',
    kind: 'sim',
    meta: meta,
    canvas: { w: 900, h: 520 },
    controls: [
      {
        key: 'power', label: '加热功率', type: 'range',
        min: 200, max: 900, step: 50, unit: 'W', digits: 0,
        note: '功率越大，升温越快，但沸点不变'
      },
      {
        key: 'mass', label: '水的质量', type: 'range',
        min: 50, max: 200, step: 25, unit: 'g', digits: 0,
        note: '质量越大，加热到沸腾需要的时间越长'
      },
      {
        key: 'cover', label: '给烧杯加盖子', type: 'toggle',
        note: '减少散热，有效加热功率更高'
      }
    ],
    defaults: { power: 500, mass: 100, cover: false },
    rt: null,

    reset: resetRt,

    calc: function (values) {
      return SL.thermo.boiling(values, ensureRt());
    },

    draw: draw,

    readouts: function (c) {
      return [
        { label: '水的温度', value: c.temp, unit: '℃', digits: 1, accent: true },
        { label: '加热时间', value: c.t, unit: 's', digits: 1 },
        { label: '累计吸热', value: c.absorbed / 1000, unit: 'kJ', digits: 1 },
        { label: '当前状态', text: c.phase },
        { label: '水的沸点', value: 100, unit: '℃', digits: 0 },
        { label: '剩余水量', value: c.remaining, unit: 'g', digits: 0 }
      ];
    },

    warnings: function (c) {
      if (c.t <= 0) return [{ type: 'state', message: '点击左栏「播放」开始加热，观察温度变化' }];
      if (c.phase === '已汽化') return [{ type: 'state', message: '水已全部汽化，温度开始上升，实验可以结束了' }];
      if (c.reached && c.phase === '沸腾中') {
        return [{ type: 'ok', message: '已到沸点：继续吸热，温度保持 100 ℃ 不变' }];
      }
      if (c.temp > 95) return [{ type: 'state', message: '快要沸腾了，注意观察气泡的变化' }];
      return [];
    },

    measure: measure,

    renderExtra: function (host) {
      renderPlot(host);
    },

    onTick: function (dt, ctx) {
      var r = ensureRt();
      SL.thermo.tickBoiling(dt, ctx.values, r);
      if (r.t - r.sampleAt >= 1) {
        r.sampleAt = Math.floor(r.t);
        r.curve.push({ x: Math.round(r.t * 10) / 10, y: Number(r.temp.toFixed(2)) });
        if (r.curve.length > 240) r.curve.shift();
        renderPlot(SL.$('#extra-host'));
      }
    },

    animated: true,

    onReset: function () {
      resetRt();
      plotHost = null;
      plotRef = null;
    }
  };

  /* ---------- 引导步骤判定 ---------- */
  if (meta.steps && meta.steps.length) {
    meta.steps[0].check = function (ctx) {
      return ensureRt().t >= 5 && ctx.calc.temp > 30;
    };
    meta.steps[1].check = function (ctx) {
      return ctx.calc.maxTemp >= 99.5;
    };
    meta.steps[2].check = function (ctx) {
      return ensureRt().plateauT >= 5;
    };
    meta.steps[3].check = function (ctx) {
      return ctx.rows.length >= 2 && ctx.state.allAnswered;
    };
  }
})();
