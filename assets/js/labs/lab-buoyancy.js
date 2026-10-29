/* 实验六：探究浮力的大小与排开液体所受重力的关系（阿基米德原理） */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['buoyancy'];
  var SURFACE = 342, BEAKER_X = 300, BEAKER_W = 260, BEAKER_BOTTOM = 470;
  var BEAKER_TOP = SURFACE - 58;
  var BLOCK = 62;
  var rt = {};

  var LIQUIDS = {
    water: { rho: 1.0, label: '水', fill: '#7fc4e8' },
    salt: { rho: 1.1, label: '盐水', fill: '#67b6c9' },
    alcohol: { rho: 0.8, label: '酒精', fill: '#a9cfe0' }
  };

  var SOLIDS = {
    alu: { rho: 2.7, label: '铝', fill: '#b8c2cc', edge: '#8b97a3' },
    iron: { rho: 7.9, label: '铁', fill: '#9aa4b0', edge: '#6d7681' },
    wood: { rho: 0.6, label: '木块', fill: '#d9b382', edge: '#b08a56' }
  };

  function resetRt() { rt.lift = 0; }

  function draw(ctx) {
    var stage = ctx.stage;
    var v = ctx.values;
    var c = ctx.calc;
    var liquid = LIQUIDS[v.liquid] || LIQUIDS.water;
    var solid = SOLIDS[v.solid] || SOLIDS.alu;
    var ratio = c.ratio;

    /* 液面随排开体积略微上升 */
    var surface = SURFACE - ratio * 9;
    var blockTop = surface - BLOCK + ratio * BLOCK;
    var blockLeft = BEAKER_X + BEAKER_W / 2 - BLOCK / 2;

    stage.clear();

    /* 桌面 */
    stage.line(60, BEAKER_BOTTOM + 2, 860, BEAKER_BOTTOM + 2, { class: 'floor-line' });

    /* 铁架台 */
    stage.rect(168, BEAKER_BOTTOM - 6, 150, 12, { rx: 4, class: 'stand-base' });
    stage.line(180, BEAKER_BOTTOM - 6, 180, 56, { class: 'stand-pole' });
    stage.line(180, 56, 250, 56, { class: 'stand-pole' });

    /* 弹簧测力计 */
    var gaugeX = 236, gaugeTop = 66, gaugeH = 176;
    stage.rect(gaugeX, gaugeTop, 54, gaugeH, { rx: 10, class: 'gauge-body' });
    stage.rect(gaugeX + 6, gaugeTop + 8, 42, gaugeH - 16, { rx: 7, class: 'gauge-face' });
    var maxN = Math.max(6, Math.ceil(c.gObject));
    for (var n = 0; n <= maxN; n++) {
      var gy = gaugeTop + gaugeH - 22 - (n / maxN) * (gaugeH - 52);
      stage.line(gaugeX + 8, gy, gaugeX + (n % 1 === 0 ? 24 : 18), gy, { class: 'gauge-tick' });
      stage.text(gaugeX + 28, gy + 4, String(n), { class: 'gauge-num', 'text-anchor': 'start' });
    }
    var pointerY = gaugeTop + gaugeH - 22 - (c.reading / maxN) * (gaugeH - 52);
    stage.line(gaugeX + 8, pointerY, gaugeX + 44, pointerY, { class: 'gauge-pointer' });
    stage.text(gaugeX + 27, gaugeTop - 10, '弹簧测力计', { class: 'sim-note', 'text-anchor': 'middle' });
    stage.text(gaugeX + 27, gaugeTop + gaugeH + 18, SL.fmt(c.reading, 2) + ' N', { class: 'gauge-read', 'text-anchor': 'middle' });

    /* 挂钩与细线 */
    stage.circle(gaugeX + 27, gaugeTop + gaugeH + 4, 6, { class: 'gauge-hook' });
    stage.line(gaugeX + 27, gaugeTop + gaugeH + 10, BEAKER_X + BEAKER_W / 2, blockTop, { class: 'hang-wire' });

    /* 烧杯 */
    stage.rect(BEAKER_X, BEAKER_TOP, BEAKER_W, BEAKER_BOTTOM - BEAKER_TOP, { rx: 8, class: 'beaker-glass' });
    stage.rect(BEAKER_X + 4, surface, BEAKER_W - 8, BEAKER_BOTTOM - surface - 2, { rx: 5, class: 'beaker-liquid', fill: liquid.fill });
    stage.line(BEAKER_X + 4, surface, BEAKER_X + BEAKER_W - 4, surface, { class: 'beaker-surface' });
    stage.line(BEAKER_X, BEAKER_TOP, BEAKER_X + BEAKER_W, BEAKER_TOP, { class: 'beaker-rim' });
    /* 液面刻度 */
    for (var k = 1; k <= 4; k++) {
      var ly = surface + k * 26;
      if (ly > BEAKER_BOTTOM - 8) break;
      stage.line(BEAKER_X + BEAKER_W - 34, ly, BEAKER_X + BEAKER_W - 8, ly, { class: 'beaker-tick' });
    }
    stage.text(BEAKER_X + BEAKER_W / 2, BEAKER_BOTTOM + 24,
      liquid.label + '（ρ = ' + SL.fmt(liquid.rho, 1) + ' g/cm³）', { class: 'sim-note', 'text-anchor': 'middle' });

    /* 物块（浸入部分被液体覆盖，用裁剪表现） */
    var clipId = 'clip-submerged';
    var defs = stage.svg.querySelector('defs');
    var old = defs.querySelector('#' + clipId);
    if (old) old.remove();
    var clip = SL.sim.svgEl('clipPath', { id: clipId });
    var clipRect = SL.sim.svgEl('rect', { x: blockLeft - 2, y: surface, width: BLOCK + 4, height: BEAKER_BOTTOM - surface });
    clip.appendChild(clipRect);
    defs.appendChild(clip);

    stage.rect(blockLeft, blockTop, BLOCK, BLOCK, { rx: 5, class: 'solid-block', fill: solid.fill, stroke: solid.edge });
    stage.rect(blockLeft, blockTop, BLOCK, BLOCK, {
      rx: 5, class: 'solid-block-wet', fill: solid.fill, stroke: solid.edge, 'clip-path': 'url(#' + clipId + ')'
    });
    stage.text(blockLeft + BLOCK / 2, blockTop + BLOCK / 2 + 5, solid.label, { class: 'solid-label', 'text-anchor': 'middle' });
    stage.circle(blockLeft + BLOCK / 2, blockTop + 2, 4, { class: 'hang-ring' });

    /* 浮力箭头 */
    if (c.fBuoy > 0.01) {
      var bx = blockLeft + BLOCK + 26;
      var by = Math.max(blockTop + 12, surface + 40);
      stage.line(bx, by + 46, bx, by, { class: 'force-arrow force-up', 'marker-end': 'url(#sim-arrow-solid)' });
      stage.text(bx + 8, by + 20, 'F浮 = ' + SL.fmt(c.fBuoy, 2) + ' N', { class: 'force-label', 'text-anchor': 'start' });
    }
    /* 重力箭头 */
    stage.line(blockLeft - 26, blockTop + 6, blockLeft - 26, blockTop + 6 + 34, { class: 'force-arrow force-down', 'marker-end': 'url(#sim-arrow-solid)' });
    stage.text(blockLeft - 34, blockTop + 26, 'G = ' + SL.fmt(c.gObject, 2) + ' N', { class: 'force-label', 'text-anchor': 'end' });

    /* 排开液体体积标注 */
    stage.text(BEAKER_X + BEAKER_W + 24, SURFACE + 8, 'V排 = ' + SL.fmt(c.vDisplaced, 0) + ' cm³', { class: 'sim-note', 'text-anchor': 'start' });

    /* 状态徽标 */
    var ok = Math.abs(c.fBuoy - c.gDisplaced) < 1e-6;
    stage.rect(24, 24, 400, 40, { rx: 10, class: 'sim-badge ' + (ok ? 'bal-ok' : 'bal-no') });
    stage.text(44, 49, 'F浮 = ' + SL.fmt(c.fBuoy, 2) + ' N　G排 = ' + SL.fmt(c.gDisplaced, 2) + ' N　' + c.state,
      { class: 'sim-badge-text ' + (ok ? 'bal-ok' : 'bal-no') });

    /* 拖动提示环 */
    stage.circle(blockLeft + BLOCK / 2, blockTop + BLOCK / 2, BLOCK * 0.75, { class: 'drag-ring' });
  }

  function bindDrag(ctx) {
    var stage = ctx.stage;
    var active = false;
    var startY = 0;
    var startRatio = 0;
    stage.svg.style.touchAction = 'none';
    stage.svg.addEventListener('pointerdown', function (evt) {
      var p = stage.toWorld(evt);
      var ratio = ctx.values.submerge;
      var surface = SURFACE - ratio * 9;
      var top = surface - BLOCK + ratio * BLOCK;
      if (Math.abs(p.x - (BEAKER_X + BEAKER_W / 2)) < BLOCK && p.y > top - 20 && p.y < top + BLOCK + 20) {
        active = true;
        startY = p.y;
        startRatio = ratio;
        stage.svg.setPointerCapture && stage.svg.setPointerCapture(evt.pointerId);
        evt.preventDefault();
      }
    });
    stage.svg.addEventListener('pointermove', function (evt) {
      if (!active) return;
      var p = stage.toWorld(evt);
      var next = SL.mech.clamp(startRatio + (p.y - startY) / BLOCK, 0, 1);
      ctx.set('submerge', Math.round(next * 100) / 100);
      evt.preventDefault();
    });
    function end() { active = false; }
    stage.svg.addEventListener('pointerup', end);
    stage.svg.addEventListener('pointercancel', end);
  }

  var checks = [
    function (ctx) { return ctx.calc.ratio > 0.05; },
    function (ctx) {
      return ctx.rows.filter(function (r) { return Number(r.submerge) >= 0.98; }).length >= 1;
    },
    function (ctx) {
      var liquids = {};
      ctx.rows.forEach(function (r) { if (Number(r.submerge) > 0.98) liquids[r.liquid] = true; });
      return Object.keys(liquids).length >= 2;
    },
    function (ctx) { return !!ctx.state.allAnswered; }
  ];
  meta.steps.forEach(function (step, index) { step.check = checks[index]; });

  SL.labs['buoyancy'] = {
    id: 'buoyancy',
    kind: 'sim',
    meta: meta,
    rt: rt,
    reset: resetRt,
    canvas: { w: 900, h: 520 },
    controls: [
      { key: 'liquid', label: '液体种类', type: 'buttons', options: [
        { value: 'water', label: '水 1.0' }, { value: 'salt', label: '盐水 1.1' }, { value: 'alcohol', label: '酒精 0.8' }
      ] },
      { key: 'solid', label: '物体材料', type: 'buttons', options: [
        { value: 'alu', label: '铝 2.7' }, { value: 'iron', label: '铁 7.9' }, { value: 'wood', label: '木 0.6' }
      ], note: '数字为密度，单位 g/cm³' },
      { key: 'volume', label: '物体体积', type: 'range', min: 50, max: 150, step: 10, unit: 'cm³' },
      { key: 'submerge', label: '浸入程度', type: 'range', min: 0, max: 1, step: 0.02, unit: '', format: function (v) {
        return Math.round(v * 100) + ' %';
      }, note: '也可直接上下拖动烧杯中的物块' }
    ],
    defaults: { liquid: 'water', solid: 'alu', volume: 100, submerge: 0.5,
      liquidRho: 1.0, solidRho: 2.7 },
    calc: function (values) {
      var values2 = Object.assign({}, values);
      values2.liquidRho = (LIQUIDS[values.liquid] || LIQUIDS.water).rho;
      values2.solidRho = (SOLIDS[values.solid] || SOLIDS.alu).rho;
      return SL.mech.buoyancy(values2);
    },
    setup: bindDrag,
    draw: draw,
    readouts: function (c) {
      return [
        { label: '物重 G', value: c.gObject, unit: 'N', digits: 2, note: 'ρ物 · g · V' },
        { label: '排开液体体积 V排', value: c.vDisplaced, unit: 'cm³', digits: 0 },
        { label: '浮力 F浮', value: c.fBuoy, unit: 'N', digits: 2, accent: true, note: 'ρ液 · g · V排' },
        { label: '排开液体重 G排', value: c.gDisplaced, unit: 'N', digits: 2, accent: true },
        { label: '测力计示数 F', value: c.reading, unit: 'N', digits: 2, note: 'F = G − F浮' },
        { label: '物体状态', text: c.state }
      ];
    },
    warnings: function (c) {
      var list = [];
      if (c.ratio <= 0.02) list.push({ type: 'state', message: '物体尚未浸入液体，此时 F浮 = 0' });
      if (c.floats && c.ratio >= c.equilibriumRatio) list.push({ type: 'state', message: '物体密度小于液体，物体漂浮，测力计示数为 0' });
      return list;
    },
    measure: function (ctx) {
      var c = ctx.calc;
      var v = ctx.values;
      if (c.ratio < 0.02) {
        SL.toast('物体还没有浸入液体，先让它浸入再记录', 'warn');
        return null;
      }
      var liquid = LIQUIDS[v.liquid] || LIQUIDS.water;
      var solid = SOLIDS[v.solid] || SOLIDS.alu;
      return {
        group: ctx.rows.length + 1,
        liquid: liquid.label,
        solid: solid.label,
        volume: v.volume,
        submerge: Number(c.ratio.toFixed(2)),
        vDisplaced: Number(c.vDisplaced.toFixed(0)),
        gObject: Number(c.gObject.toFixed(2)),
        fBuoy: Number(c.fBuoy.toFixed(2)),
        gDisplaced: Number(c.gDisplaced.toFixed(2)),
        reading: Number(c.reading.toFixed(2)),
        state: c.state
      };
    },
    renderExtra: function (host, rows) {
      if (!host) return;
      var valid = rows.filter(function (r) { return r.vDisplaced != null; });
      if (!valid.length) {
        host.innerHTML = '<div class="chart-empty">' + SL.icon('chart-line', '', 20) + '<span>记录几组浸入程度不同的数据，这里会画出 F浮–V排 图像</span></div>';
        return;
      }
      var byLiquid = {};
      valid.forEach(function (r) {
        byLiquid[r.liquid] = byLiquid[r.liquid] || [];
        byLiquid[r.liquid].push({ x: Number(r.vDisplaced), y: Number(r.fBuoy) });
      });
      var colors = { '水': '#1f6fb2', '盐水': '#16a3a3', '酒精': '#c98a2e' };
      var plot = SL.sim.Plot(host, {
        w: 340, h: 200, xLabel: 'V排 /cm³', yLabel: 'F浮 /N',
        xMin: 0, yMin: 0,
        foot: function () { return '同种液体下，F浮 与 V排 成正比'; }
      });
      plot.setSeries(Object.keys(byLiquid).map(function (k) {
        return { name: k, color: colors[k] || '#1f6fb2', points: byLiquid[k].sort(function (a, b) { return a.x - b.x; }) };
      }));
    }
  };
})();
