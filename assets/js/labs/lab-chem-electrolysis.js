/* 化学实验三：电解水 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['chem-electrolysis'];
  var rt = { t: 0, vH: 0, vO: 0 };

  function resetRt() { rt.t = 0; rt.vH = 0; rt.vO = 0; }

  var TUBE_TOP = 176, TUBE_BOTTOM = 424, MAX = 40;

  function tube(stage, x, w, vol, gasLabel, polarity, gasColor) {
    var h = TUBE_BOTTOM - TUBE_TOP;
    var level = TUBE_TOP + (vol / MAX) * h;      /* 气体在顶部，水面从顶往下走 */
    stage.rect(x, TUBE_TOP, w, h, { rx: 12, class: 'chem-jar' });
    /* 剩余液体 */
    stage.rect(x + 3, level, w - 6, TUBE_BOTTOM - level - 3, { rx: 10, class: 'chem-water' });
    /* 气体区域淡色 */
    stage.rect(x + 3, TUBE_TOP + 3, w - 6, Math.max(0, level - TUBE_TOP - 3), { rx: 10, class: 'chem-gas', fill: gasColor });
    stage.line(x + 3, level, x + w - 3, level, { class: 'chem-surface' });
    /* 刻度 */
    for (var k = 1; k <= 4; k++) {
      var gy = TUBE_TOP + h * k / 5;
      stage.line(x + w - 12, gy, x + w - 3, gy, { class: 'beaker-tick' });
    }
    stage.text(x + w / 2, TUBE_TOP - 34, polarity, { class: 'sim-note', 'text-anchor': 'middle' });
    stage.text(x + w / 2, TUBE_TOP - 12, gasLabel, { class: 'chem-gas-label', 'text-anchor': 'middle' });
    stage.text(x + w + 10, TUBE_TOP + 28, SL.fmt(vol, 1) + ' mL', { class: 'chem-tag-ok', 'text-anchor': 'start' });
  }

  function draw(ctx) {
    var stage = ctx.stage;
    var c = ctx.calc;
    var t = ctx.clock ? ctx.clock.t : 0;
    stage.clear();

    stage.line(70, 502, 850, 502, { class: 'floor-line' });

    /* 电解槽 */
    var CX = 250, CW = 420, CTOP = 268, CBOT = 468;
    stage.rect(CX, CTOP, CW, CBOT - CTOP, { rx: 10, class: 'chem-trough' });
    stage.rect(CX + 5, CTOP + 24, CW - 10, CBOT - CTOP - 30, { rx: 8, class: 'chem-water' });
    stage.line(CX + 5, CTOP + 24, CX + CW - 5, CTOP + 24, { class: 'chem-surface' });
    stage.text(CX + CW / 2, CBOT + 26, c.electrolyte + '（增强导电性，本身不参加反应）', { class: 'sim-note', 'text-anchor': 'middle' });

    /* 两支刻度管 */
    var HX = 322, OX = 522;
    tube(stage, HX, 56, c.vH, '氢气 H₂', '接电源负极', '#dfeefb');
    tube(stage, OX, 56, c.vO, '氧气 O₂', '接电源正极', '#f7f0e2');

    /* 电极 */
    stage.rect(HX + 12, 396, 32, 60, { rx: 4, class: 'chem-electrode' });
    stage.rect(OX + 12, 396, 32, 60, { rx: 4, class: 'chem-electrode' });

    /* 气泡 */
    if (c.rate > 0) {
      [[HX + 28, 1], [OX + 28, 0.7]].forEach(function (pair, idx) {
        var bx = pair[0];
        var cap = idx === 0 ? c.vH : c.vO;
        if (cap >= MAX) return;
        for (var i = 0; i < 5; i++) {
          var top = TUBE_TOP + (cap / MAX) * (TUBE_BOTTOM - TUBE_TOP);
          var span = Math.max(24, 396 - top);
          var by = 396 - ((t * 55 * pair[1] + i * 23) % span);
          stage.circle(bx + (i % 3 - 1) * 7, by, 2 + (i % 2) * 1.4, { class: 'chem-bubble' });
        }
      });
    }

    /* 电源与导线：从槽外侧绕到电极底部，避免穿过刻度管 */
    stage.rect(352, 36, 216, 56, { rx: 10, class: 'chem-supply' });
    stage.text(460, 56, '直流电源', { class: 'chem-supply-text', 'text-anchor': 'middle' });
    stage.text(384, 80, '−', { class: 'chem-pole-neg', 'text-anchor': 'middle' });
    stage.text(536, 80, '＋', { class: 'chem-pole-pos', 'text-anchor': 'middle' });
    stage.text(460, 82, SL.fmt(c.voltage, 1) + ' V', { class: 'chem-supply-text', 'text-anchor': 'middle' });
    stage.path('M366 92 L366 112 L236 112 L236 486 L350 486 L350 460', { class: 'chem-wire' });
    stage.path('M554 92 L554 112 L684 112 L684 486 L566 486 L566 460', { class: 'chem-wire' });

    /* 比例标注 */
    if (c.vO > 0.5) {
      stage.rect(40, 300, 190, 104, { rx: 10, class: 'sim-badge bal-ok' });
      stage.text(54, 326, 'V(H₂) : V(O₂)', { class: 'sim-badge-text bal-ok' });
      stage.text(54, 356, SL.fmt(c.vH, 1) + ' : ' + SL.fmt(c.vO, 1), { class: 'chem-tag-ok' });
      stage.text(54, 382, '≈ ' + SL.fmt(c.splitRatio, 1) + ' : 1（理论 2 : 1）', { class: 'sim-note' });
    }
    if (c.rate <= 0) {
      stage.rect(40, 300, 190, 62, { rx: 10, class: 'sim-badge bal-no' });
      stage.text(54, 326, '电压低于分解电压', { class: 'sim-badge-text bal-no' });
      stage.text(54, 350, '水几乎不分解', { class: 'sim-note' });
    }
  }

  function onTick(dt, ctx) {
    var c = ctx.calc;
    if (c.rate <= 0) return;
    rt.t += dt;
    rt.vO = Math.min(MAX, rt.vO + c.rate * dt / 2);
    rt.vH = Math.min(MAX, rt.vH + c.rate * dt);
    if (rt.vO >= MAX && rt.vH >= MAX && ctx.clock) ctx.clock.stop();
  }

  var steps = [
    { need: function (c) { return c.rate > 0; } },
    { need: function (c) { return c.vO >= 5; } },
    { need: function (c) { return c.vO >= 20; } },
    { need: function (c) { return c.splitRatio > 0 && Math.abs(c.splitRatio - 2) < 0.25; } },
    { need: function (c, v, ctx) { return !!ctx.state.allAnswered; } }
  ];
  meta.steps.forEach(function (step, i) {
    step.check = function (ctx) { return steps[i].need(ctx.calc, ctx.values, ctx); };
  });

  SL.labs['chem-electrolysis'] = {
    id: 'chem-electrolysis',
    kind: 'sim',
    meta: meta,
    rt: rt,
    reset: resetRt,
    canvas: { w: 900, h: 520 },
    animated: true,
    controls: [
      { key: 'voltage', label: '电压', type: 'range', min: 0, max: 12, step: 0.5, unit: 'V',
        note: '水的分解电压约 1.5 V，低于它几乎不反应' },
      { key: 'electrolyte', label: '电解液', type: 'buttons', options: [
        { value: 'h2so4', label: '稀硫酸' }, { value: 'naoh', label: '氢氧化钠溶液' }
      ] }
    ],
    defaults: { voltage: 6, electrolyte: 'h2so4' },
    calc: function (values) { return SL.chem.electrolysis(values, rt); },
    onTick: onTick,
    onReset: resetRt,
    draw: draw,
    readouts: function (c) {
      return [
        { label: '通电时间', value: c.t, unit: 's', digits: 1 },
        { label: '氢气体积 V(H₂)', value: c.vH, unit: 'mL', digits: 1, accent: true, note: '负极' },
        { label: '氧气体积 V(O₂)', value: c.vO, unit: 'mL', digits: 1, accent: true, note: '正极' },
        { label: '体积比', text: c.splitRatio ? c.splitRatio + ' : 1' : '—', note: '理论值 2 : 1' },
        { label: '产气速率', value: c.rate, unit: 'mL/s', digits: 2 },
        { label: '电解液', text: c.electrolyte }
      ];
    },
    warnings: function (c) {
      var list = [];
      if (c.rate <= 0) list.push({ type: 'state', message: '电压低于水的分解电压，几乎看不到气泡，把电压调高一些' });
      if (c.vO >= c.max - 0.5) list.push({ type: 'state', message: '刻度管已经收集满，点击「复位」可以重新开始' });
      return list;
    },
    measure: function (ctx) {
      var c = ctx.calc;
      if (c.vO < 1) {
        SL.toast('先点「播放」通电一段时间，收集到气体再记录', 'warn');
        return null;
      }
      return {
        group: ctx.rows.length + 1,
        voltage: c.voltage,
        electrolyte: c.electrolyte,
        t: SL.chem.round(c.t, 1),
        vH: SL.chem.round(c.vH, 1),
        vO: SL.chem.round(c.vO, 1),
        ratio: c.splitRatio
      };
    },
    renderExtra: function (host, rows) {
      if (!host) return;
      var valid = rows.filter(function (r) { return r.vH != null; });
      if (!valid.length) {
        host.innerHTML = '<div class="chart-empty">' + SL.icon('chart-line', '', 20) +
          '<span>记录几组数据，这里会画出 H₂ 与 O₂ 的体积关系</span></div>';
        return;
      }
      var plot = SL.sim.Plot(host, {
        w: 340, h: 200, xLabel: 'V(O₂) /mL', yLabel: 'V(H₂) /mL', xMin: 0, yMin: 0,
        foot: function () { return '所有点都落在同一条直线上，斜率约为 2'; }
      });
      plot.setSeries([
        { name: '实测', color: '#1f6fb2', points: valid.map(function (r) { return { x: Number(r.vO), y: Number(r.vH) }; }), type: 'dots' },
        { name: '2 : 1 理论线', color: '#c98a2e', dashed: true, points: (function () {
          var mx = Math.max.apply(null, valid.map(function (r) { return Number(r.vO); }).concat([1]));
          return [{ x: 0, y: 0 }, { x: mx, y: mx * 2 }];
        })() }
      ]);
    }
  };
})();
