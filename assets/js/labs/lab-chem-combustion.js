/* 化学实验二：探究燃烧的条件 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['chem-combustion'];
  var rt = {};

  function flame(stage, x, y, scale, cls) {
    var s = scale || 1;
    stage.path('M' + x + ' ' + y + ' Q' + (x - 13 * s) + ' ' + (y - 26 * s) + ' ' + x + ' ' + (y - 48 * s) +
      ' Q' + (x + 13 * s) + ' ' + (y - 26 * s) + ' ' + x + ' ' + y + ' Z', { class: cls || 'chem-flame' });
    stage.path('M' + x + ' ' + (y - 4) + ' Q' + (x - 7 * s) + ' ' + (y - 20 * s) + ' ' + x + ' ' + (y - 32 * s) +
      ' Q' + (x + 7 * s) + ' ' + (y - 20 * s) + ' ' + x + ' ' + (y - 4) + ' Z', { class: 'chem-flame-inner' });
  }

  function draw(ctx) {
    var stage = ctx.stage;
    var c = ctx.calc;
    var t = ctx.clock ? ctx.clock.t : 0;
    stage.clear();

    stage.line(120, 470, 800, 470, { class: 'floor-line' });

    /* 烧杯与热水 */
    var BX = 300, BW = 300, TOP = 236, BOTTOM = 460;
    stage.rect(BX, TOP, BW, BOTTOM - TOP, { rx: 10, class: 'beaker-glass' });
    stage.rect(BX + 5, 268, BW - 10, BOTTOM - 273, { rx: 6, class: 'chem-water-hot', fill: hotColor(c.temp) });
    stage.line(BX + 5, 268, BX + BW - 5, 268, { class: 'beaker-surface' });
    stage.line(BX, TOP, BX + BW, TOP, { class: 'beaker-rim' });
    stage.text(BX + BW / 2, BOTTOM + 24, '热水（' + SL.fmt(c.temp, 0) + ' ℃）', { class: 'sim-note', 'text-anchor': 'middle' });

    /* 铜片架在烧杯口 */
    stage.rect(BX - 34, TOP - 12, BW + 68, 12, { rx: 4, class: 'chem-copper' });
    stage.text(BX - 44, TOP - 20, '铜片', { class: 'sim-note', 'text-anchor': 'end' });

    /* 铜片上的白磷 */
    var wx = BX + 84;
    stage.path('M' + (wx - 16) + ' ' + (TOP - 12) + ' q16 -14 32 0 z', { class: 'chem-phosphorus' });
    stage.text(wx, TOP - 46, '白磷', { class: 'sim-note', 'text-anchor': 'middle' });
    if (c.plateWhite) {
      flame(stage, wx, TOP - 16, 1 + Math.sin(t * 6) * 0.06);
      for (var s = 0; s < 4; s++) {
        stage.circle(wx - 8 + s * 6, TOP - 60 - ((t * 22 + s * 11) % 26), 3 + s * 0.6, { class: 'chem-smoke' });
      }
    }

    /* 铜片上的红磷 */
    var rx = BX + 214;
    stage.path('M' + (rx - 18) + ' ' + (TOP - 12) + ' q18 -11 36 0 z', { class: 'chem-phosphorus-red' });
    stage.text(rx, TOP - 46, '红磷', { class: 'sim-note', 'text-anchor': 'middle' });
    if (c.plateRed) flame(stage, rx, TOP - 16, 0.9);

    /* 水中的白磷 + 通氧气的钟罩 */
    var uw = BX + 150;
    var uy = 396;
    stage.path('M' + (uw - 46) + ' 268 L' + (uw - 46) + ' 424 Q' + (uw - 46) + ' 436 ' + (uw - 34) + ' 436 L' +
      (uw + 34) + ' 436 Q' + (uw + 46) + ' 436 ' + (uw + 46) + ' 424 L' + (uw + 46) + ' 268',
      { class: 'chem-bell' });
    stage.path('M' + (uw - 18) + ' ' + (uy + 8) + ' q18 -13 36 0 z', { class: 'chem-phosphorus' });
    stage.text(uw, 256, '钟罩', { class: 'sim-note', 'text-anchor': 'middle' });
    stage.text(uw + 62, uy - 4, '水中的白磷', { class: 'sim-note', 'text-anchor': 'start' });
    /* 通氧气管 */
    if (c.air) {
      stage.path('M' + (uw + 46) + ' 330 L' + (uw + 120) + ' 330 L' + (uw + 120) + ' 210', { class: 'chem-tube' });
      for (var i = 0; i < 5; i++) {
        stage.circle(uw - 10 + i * 6, uy - 4 - ((t * 40 + i * 14) % 40), 2.4, { class: 'chem-bubble' });
      }
      stage.text(uw + 126, 206, '通入氧气', { class: 'sim-note', 'text-anchor': 'start' });
    }
    if (c.waterWhite) {
      flame(stage, uw, uy + 6, 0.62);
      stage.text(uw + 62, uy + 26, '水下燃烧', { class: 'chem-tag-ok', 'text-anchor': 'start' });
    }

    /* 温度计 */
    var thX = BX + BW + 56;
    stage.rect(thX, 150, 16, 250, { rx: 8, class: 'chem-thermo' });
    var h = Math.max(0.02, (c.temp - 20) / 80);
    stage.rect(thX + 3, 396 - 240 * h, 10, 240 * h, { rx: 5, class: 'chem-thermo-fill' });
    stage.circle(thX + 8, 404, 11, { class: 'chem-thermo-fill' });
    stage.text(thX + 8, 140, SL.fmt(c.temp, 0) + ' ℃', { class: 'sim-note', 'text-anchor': 'middle' });

    /* 三个条件指示灯 */
    var y0 = 40;
    var conds = [
      { ok: true, text: '可燃物（白磷 / 红磷）' },
      { ok: c.plateWhite || c.plateRed || c.waterWhite, text: '与氧气接触' },
      { ok: c.heatEnough, text: '温度达到着火点（白磷 40 ℃）' }
    ];
    conds.forEach(function (cd, i) {
      var y = y0 + i * 38;
      stage.rect(40, y, 300, 30, { rx: 8, class: 'sim-badge ' + (cd.ok ? 'bal-ok' : 'bal-no') });
      stage.text(56, y + 21, (cd.ok ? '✓ ' : '· ') + cd.text, { class: 'sim-badge-text ' + (cd.ok ? 'bal-ok' : 'bal-no') });
    });
    stage.text(40, y0 + 132, c.heatEnough ? '白磷已过着火点，能否燃烧就看有没有氧气' : '水温还不够，白磷达不到着火点',
      { class: 'sim-note', 'text-anchor': 'start' });
  }

  function hotColor(t) {
    var k = Math.max(0, Math.min(1, (t - 20) / 80));
    var r = Math.round(200 + 40 * k), g = Math.round(232 - 80 * k), b = Math.round(244 - 60 * k);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  var steps = [
    { need: function (c) { return c.temp >= 40; } },
    { need: function (c) { return c.plateWhite && !c.plateRed; } },
    { need: function (c) { return c.waterWhite; } },
    { need: function (c, v, ctx) { return !!ctx.state.allAnswered; } }
  ];
  meta.steps.forEach(function (step, i) {
    step.check = function (ctx) { return steps[i].need(ctx.calc, ctx.values, ctx); };
  });

  SL.labs['chem-combustion'] = {
    id: 'chem-combustion',
    kind: 'sim',
    meta: meta,
    rt: rt,
    reset: function () {},
    canvas: { w: 900, h: 520 },
    animated: true,
    controls: [
      { key: 'temp', label: '水温', type: 'range', min: 20, max: 100, step: 5, unit: '℃',
        note: '白磷着火点 40 ℃，红磷 240 ℃' },
      { key: 'air', label: '向水中的白磷通氧气', type: 'toggle', note: '钟罩里的水隔绝了空气' }
    ],
    defaults: { temp: 25, air: false },
    calc: function (values) {
      var c = SL.chem.combustion(values);
      c.vol = 0;
      return c;
    },
    draw: draw,
    readouts: function (c) {
      return [
        { label: '水温', value: c.temp, unit: '℃', digits: 0 },
        { label: '铜片上的白磷', text: c.plateWhiteState, accent: c.plateWhite },
        { label: '铜片上的红磷', text: c.plateRedState },
        { label: '水中的白磷', text: c.waterWhiteState, accent: c.waterWhite },
        { label: '正在燃烧', value: c.burningCount, unit: '处', digits: 0 }
      ];
    },
    warnings: function (c) {
      var list = [];
      if (!c.heatEnough) list.push({ type: 'state', message: '水温低于 40 ℃，白磷还没达到着火点，不会燃烧' });
      if (c.heatEnough && !c.air && !c.plateWhite) list.push({ type: 'state', message: '温度够了，但水中的白磷没有接触氧气，仍然不燃烧' });
      return list;
    },
    measure: function (ctx) {
      var c = ctx.calc;
      return {
        group: ctx.rows.length + 1,
        temp: c.temp,
        air: c.air ? '已通氧气' : '未通氧气',
        plateWhite: c.plateWhite ? '燃烧' : '不燃烧',
        plateRed: c.plateRed ? '燃烧' : '不燃烧',
        waterWhite: c.waterWhite ? '燃烧' : '不燃烧',
        burning: c.burningCount
      };
    }
  };
})();
