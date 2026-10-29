/* 化学实验四：酸碱中和反应与指示剂 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['chem-acidbase'];
  var rt = {};

  var PH_COLORS = [
    [0, '#d8342a'], [2, '#e2642a'], [4, '#e8a32a'], [6, '#d8c832'],
    [7, '#4fae6a'], [8, '#2f9fa8'], [10, '#2f6fbf'], [12, '#4a49b5'], [14, '#6b3fa0']
  ];

  function phColor(ph) {
    var i = 0;
    while (i < PH_COLORS.length - 1 && ph > PH_COLORS[i + 1][0]) i++;
    var a = PH_COLORS[i], b = PH_COLORS[Math.min(i + 1, PH_COLORS.length - 1)];
    return Math.abs(ph - a[0]) < 0.01 ? a[1] : b[1];
  }

  function drop(stage, x, y, color) {
    stage.path('M' + x + ' ' + y + ' q-5 9 0 14 q5 -5 0 -14 z', { fill: color, opacity: 0.9 });
  }

  function draw(ctx) {
    var stage = ctx.stage;
    var c = ctx.calc;
    stage.clear();

    stage.line(80, 470, 840, 470, { class: 'floor-line' });

    /* 铁架台 */
    stage.rect(196, 456, 128, 12, { rx: 4, class: 'stand-base' });
    stage.line(220, 456, 220, 96, { class: 'stand-pole' });
    stage.line(220, 150, 392, 150, { class: 'stand-pole' });
    stage.rect(386, 141, 18, 18, { rx: 4, class: 'chem-valve' });

    /* 滴定管：正对锥形瓶口 */
    var BX = 397, BTOP = 74, BBOT = 250;
    stage.rect(BX, BTOP, 26, BBOT - BTOP, { rx: 6, class: 'chem-jar' });
    var filled = 1 - Math.min(1, c.added / 40);
    stage.rect(BX + 2, BTOP + 4, 22, (BBOT - BTOP - 12) * filled, { rx: 5, class: 'chem-liquid', fill: '#eaf2f8' });
    for (var k = 1; k <= 6; k++) {
      var gy = BTOP + k * 26;
      stage.line(BX - 10, gy, BX, gy, { class: 'beaker-tick' });
      stage.text(BX - 14, gy + 4, String(k * 5), { class: 'sim-note', 'text-anchor': 'end' });
    }
    stage.circle(BX + 13, BBOT + 12, 7, { class: 'chem-valve' });
    stage.text(BX + 13, BTOP - 12, '氢氧化钠溶液', { class: 'sim-note', 'text-anchor': 'middle' });

    /* 锥形瓶 */
    var FX = 360, FBASE = 448, FTOP = 330;
    stage.path('M' + (FX + 34) + ' ' + FTOP + ' L' + (FX + 34) + ' ' + (FTOP - 34) + ' L' + (FX + 66) + ' ' + (FTOP - 34) +
      ' L' + (FX + 66) + ' ' + FTOP + ' L' + (FX + 130) + ' ' + FBASE + ' Q' + (FX + 134) + ' ' + (FBASE + 10) + ' ' + (FX + 122) + ' ' + (FBASE + 10) +
      ' L' + (FX - 22) + ' ' + (FBASE + 10) + ' Q' + (FX - 34) + ' ' + (FBASE + 10) + ' ' + (FX - 30) + ' ' + FBASE + ' Z',
      { class: 'chem-flask' });
    /* 瓶内液体 */
    var liqTop = 386;
    stage.path('M' + (FX + 18) + ' ' + liqTop + ' L' + (FX + 92) + ' ' + liqTop + ' L' + (FX + 130) + ' ' + FBASE +
      ' Q' + (FX + 134) + ' ' + (FBASE + 10) + ' ' + (FX + 122) + ' ' + (FBASE + 10) + ' L' + (FX - 22) + ' ' + (FBASE + 10) +
      ' Q' + (FX - 34) + ' ' + (FBASE + 10) + ' ' + (FX - 30) + ' ' + FBASE + ' Z',
      { class: 'chem-liquid', fill: c.liquidColor });
    stage.line(FX + 18, liqTop, FX + 92, liqTop, { class: 'chem-surface' });
    stage.text(FX + 50, FBASE + 34, '锥形瓶：20 mL 稀盐酸', { class: 'sim-note', 'text-anchor': 'middle' });

    /* 正在滴加 */
    if (c.added > 0) {
      drop(stage, BX + 13, BBOT + 24, c.liquidColor);
      stage.text(BX + 44, BBOT + 16, '已滴入 ' + SL.fmt(c.added, 1) + ' mL', { class: 'chem-tag-ok', 'text-anchor': 'start' });
    }

    /* pH 色带 */
    var SX = 664, STOP = 110, SBOT = 420;
    for (var i = 0; i < 140; i++) {
      var p = 14 - i / 10;
      stage.rect(SX, STOP + i * (SBOT - STOP) / 140, 26, (SBOT - STOP) / 140 + 1, { fill: phColor(p) });
    }
    [0, 2, 4, 6, 7, 8, 10, 12, 14].forEach(function (v) {
      var y = STOP + (14 - v) / 14 * (SBOT - STOP);
      stage.text(SX + 34, y + 4, String(v), { class: 'sim-note', 'text-anchor': 'start' });
    });
    var py = STOP + (14 - c.ph) / 14 * (SBOT - STOP);
    stage.path('M' + (SX - 4) + ' ' + (py - 7) + ' L' + (SX - 20) + ' ' + py + ' L' + (SX - 4) + ' ' + (py + 7) + ' Z',
      { class: 'chem-ph-marker' });
    stage.text(SX + 13, STOP - 14, 'pH 试纸比色', { class: 'sim-note', 'text-anchor': 'middle' });

    /* 状态徽标 */
    var ok = c.neutralized;
    stage.rect(40, 40, 336, 44, { rx: 10, class: 'sim-badge ' + (ok ? 'bal-ok' : 'bal-no') });
    stage.text(56, 68, 'pH = ' + SL.fmt(c.ph, 2) + '　' + c.state + '　' + c.colorText,
      { class: 'sim-badge-text ' + (ok ? 'bal-ok' : 'bal-no') });
    stage.text(40, 106, c.equation, { class: 'sim-note', 'text-anchor': 'start' });
    if (c.heat > 0) stage.text(40, 130, '放出热量约 ' + SL.fmt(c.heat, 1) + ' J（中和反应是放热反应）', { class: 'sim-note' });
  }

  var steps = [
    { need: function (c, v) { return v.indicator && v.indicator !== 'none'; } },
    { need: function (c) { return c.added > 0; } },
    { need: function (c) { return c.ph > 3 && c.ph < 11; } },
    { need: function (c) { return c.neutralized; } },
    { need: function (c, v, ctx) { return !!ctx.state.allAnswered; } }
  ];
  meta.steps.forEach(function (step, i) {
    step.check = function (ctx) { return steps[i].need(ctx.calc, ctx.values, ctx); };
  });

  SL.labs['chem-acidbase'] = {
    id: 'chem-acidbase',
    kind: 'sim',
    meta: meta,
    rt: rt,
    reset: function () {},
    canvas: { w: 900, h: 520 },
    controls: [
      { key: 'indicator', label: '指示剂', type: 'buttons', options: [
        { value: 'none', label: '不加' }, { value: 'litmus', label: '紫色石蕊' }, { value: 'phenolphthalein', label: '无色酚酞' }
      ] },
      { key: 'acidConc', label: '稀盐酸浓度', type: 'range', min: 0.02, max: 0.40, step: 0.01, unit: 'mol/L', digits: 2 },
      { key: 'baseConc', label: '氢氧化钠浓度', type: 'range', min: 0.02, max: 0.40, step: 0.01, unit: 'mol/L', digits: 2 },
      { key: 'added', label: '滴入氢氧化钠体积', type: 'range', min: 0, max: 40, step: 0.5, unit: 'mL', digits: 1,
        note: '锥形瓶里是 20 mL 稀盐酸' }
    ],
    defaults: { indicator: 'phenolphthalein', acidConc: 0.10, baseConc: 0.10, added: 0 },
    calc: function (values) { return SL.chem.acidBase(values); },
    draw: draw,
    readouts: function (c) {
      return [
        { label: '溶液 pH', value: c.ph, digits: 2, accent: true },
        { label: '反应状态', text: c.state, accent: c.neutralized },
        { label: '指示剂颜色', text: c.colorText },
        { label: '已滴入', value: c.added, unit: 'mL', digits: 1 },
        { label: 'n(HCl)', value: c.nAcid, unit: 'mmol', digits: 2 },
        { label: 'n(NaOH)', value: c.nBase, unit: 'mmol', digits: 2 }
      ];
    },
    warnings: function (c) {
      var list = [];
      if (c.ph < 2) list.push({ type: 'state', message: '溶液酸性很强，还没开始中和，继续滴加氢氧化钠' });
      if (c.ph > 12) list.push({ type: 'state', message: '碱已经明显过量，溶液显强碱性' });
      if (c.neutralized) list.push({ type: 'ok', message: '恰好完全反应：n(HCl) = n(NaOH)，溶液呈中性' });
      return list;
    },
    measure: function (ctx) {
      var c = ctx.calc;
      if (c.added <= 0) {
        SL.toast('先滴入一些氢氧化钠溶液再记录', 'warn');
        return null;
      }
      return {
        group: ctx.rows.length + 1,
        acidConc: SL.chem.round(c.acidConc, 2),
        baseConc: SL.chem.round(c.baseConc, 2),
        added: SL.chem.round(c.added, 1),
        ph: SL.chem.round(c.ph, 2),
        state: c.state,
        indicator: c.indicator,
        color: c.colorText
      };
    },
    renderExtra: function (host, rows) {
      if (!host) return;
      var valid = rows.filter(function (r) { return r.ph != null; });
      if (!valid.length) {
        host.innerHTML = '<div class="chart-empty">' + SL.icon('chart-line', '', 20) +
          '<span>多记录几组数据，这里会画出 pH 随滴加体积变化的曲线</span></div>';
        return;
      }
      var plot = SL.sim.Plot(host, {
        w: 340, h: 200, xLabel: 'V(NaOH) /mL', yLabel: 'pH',
        xMin: 0, yMin: 0, yMax: 14,
        foot: function () { return '曲线在恰好中和处最陡，pH 会迅速越过 7'; }
      });
      plot.setSeries([{
        name: 'pH', color: '#2f6fbf',
        points: valid.map(function (r) { return { x: Number(r.added), y: Number(r.ph) }; })
          .sort(function (a, b) { return a.x - b.x; })
      }]);
    }
  };
})();
