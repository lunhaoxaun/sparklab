/* 化学自由实验室：任意两种试剂混合，实时给出颜色、气泡、沉淀与化学方程式 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['chem-free'];
  var rt = {};

  function reagentOptions() {
    return Object.keys(SL.chem.REAGENTS).map(function (id) {
      return { value: id, label: SL.chem.REAGENTS[id].label };
    });
  }

  function bottle(stage, x, y, color, label, tilt) {
    var g = tilt ? -12 : 12;
    stage.path('M' + (x - 26) + ' ' + (y + 74) + ' q-4 -22 8 -34 l0 -26 l34 0 l0 26 q12 12 8 34 z',
      { class: 'chem-reagent-bottle', transform: 'rotate(' + g + ' ' + x + ' ' + (y + 40) + ')' });
    stage.rect(x - 8, y + 6, 16, 12, { rx: 3, class: 'chem-stopper', transform: 'rotate(' + g + ' ' + x + ' ' + (y + 40) + ')' });
    stage.path('M' + (x - 18) + ' ' + (y + 46) + ' l36 0 l0 0', { class: 'chem-none' });
    stage.text(x, y + 96, label, { class: 'sim-note', 'text-anchor': 'middle' });
    stage.circle(x, y + 48, 12, { fill: color, opacity: 0.85 });
  }

  function draw(ctx) {
    var stage = ctx.stage;
    var c = ctx.calc;
    stage.clear();

    stage.line(80, 470, 840, 470, { class: 'floor-line' });

    var RA = SL.chem.REAGENTS[c.a] || SL.chem.REAGENTS.hcl;
    var RB = SL.chem.REAGENTS[c.b] || SL.chem.REAGENTS.naoh;

    /* 两支试剂 */
    bottle(stage, 150, 250, RA.color, RA.label, true);
    bottle(stage, 262, 258, RB.color, RB.label, false);

    /* 大试管 */
    var TX = 400, TTOP = 170, TBOT = 452, TW = 78;
    stage.path('M' + TX + ' ' + TTOP + ' L' + TX + ' ' + (TBOT - 34) + ' Q' + TX + ' ' + TBOT + ' ' + (TX + TW / 2) + ' ' + TBOT +
      ' Q' + (TX + TW) + ' ' + TBOT + ' ' + (TX + TW) + ' ' + (TBOT - 34) + ' L' + (TX + TW) + ' ' + TTOP,
      { class: 'chem-jar' });
    stage.path('M' + TX + ' ' + TTOP + ' L' + (TX + TW) + ' ' + TTOP, { class: 'chem-rim' });

    /* 混合液 */
    var LTOP = 306;
    stage.path('M' + (TX + 3) + ' ' + LTOP + ' L' + (TX + TW - 3) + ' ' + LTOP + ' L' + (TX + TW - 3) + ' ' + (TBOT - 34) +
      ' Q' + (TX + TW - 3) + ' ' + (TBOT - 3) + ' ' + (TX + TW / 2) + ' ' + (TBOT - 3) +
      ' Q' + (TX + 3) + ' ' + (TBOT - 3) + ' ' + (TX + 3) + ' ' + (TBOT - 34) + ' Z',
      { class: 'chem-liquid', fill: c.liquid });
    stage.line(TX + 3, LTOP, TX + TW - 3, LTOP, { class: 'chem-surface' });

    /* 气泡 */
    if (c.bubbles > 0) {
      for (var i = 0; i < 9; i++) {
        var bx = TX + 14 + (i * 17) % (TW - 28);
        var by = TBOT - 40 - ((i * 37) % 110);
        var r = 2 + c.bubbles * 2.2 + (i % 3);
        stage.circle(bx, by, r, { class: 'chem-bubble' });
      }
      stage.text(TX + TW + 24, 330, '产生气泡', { class: 'chem-tag-ok', 'text-anchor': 'start' });
    }
    /* 沉淀 */
    if (c.precipitate) {
      for (var p = 0; p < 14; p++) {
        var px = TX + 10 + (p * 23) % (TW - 20);
        var py = TBOT - 12 - (p % 4) * 9;
        stage.circle(px, py, 4 + (p % 3), { fill: c.precipitate, opacity: 0.9 });
      }
      stage.text(TX + TW + 24, 360, '出现沉淀', { class: 'chem-tag-ok', 'text-anchor': 'start' });
    }
    /* 铁钉与置换 */
    if (c.coating) {
      stage.rect(TX + 20, 340, 14, 96, { rx: 4, class: 'chem-nail' });
      stage.rect(TX + 20, 380, 14, 52, { rx: 4, fill: c.coating, opacity: 0.9 });
      stage.text(TX + TW + 24, 390, '表面析出红色物质', { class: 'chem-tag-ok', 'text-anchor': 'start' });
    }
    if (c.heat) {
      for (var h = 0; h < 3; h++) {
        stage.path('M' + (TX + 14 + h * 24) + ' 300 q8 -14 0 -26', { class: 'chem-heat-wave' });
      }
      stage.text(TX + TW + 24, 420, '放热，试管温热', { class: 'sim-note', 'text-anchor': 'start' });
    }

    /* 右侧信息卡 */
    var IX = 548, IW = 320;
    stage.rect(IX, 92, IW, 118, { rx: 12, class: 'chem-info-card' });
    stage.text(IX + 16, 120, '实验现象', { class: 'chem-info-title', 'text-anchor': 'start' });
    wrapText(stage, c.phenomenon, IX + 16, 146, IW - 32, 22);

    stage.rect(IX, 222, IW, 104, { rx: 12, class: 'chem-info-card' });
    stage.text(IX + 16, 250, '化学方程式', { class: 'chem-info-title', 'text-anchor': 'start' });
    wrapText(stage, c.equation, IX + 16, 278, IW - 32, 22);

    stage.rect(IX, 338, IW, 76, { rx: 12, class: 'chem-info-card' });
    stage.text(IX + 16, 366, '反应类型', { class: 'chem-info-title', 'text-anchor': 'start' });
    stage.text(IX + 16, 396, c.type + (c.reacted ? '（有新物质生成）' : ''), { class: 'sim-note', 'text-anchor': 'start' });

    if (c.indicatorText) {
      stage.rect(IX, 426, IW, 44, { rx: 12, class: 'chem-info-card' });
      stage.text(IX + 16, 454, c.indicatorText, { class: 'sim-note', 'text-anchor': 'start' });
    }

    /* 顶部标题 */
    stage.text(40, 48, RA.label + '　+　' + RB.label, { class: 'chem-mix-title', 'text-anchor': 'start' });
  }

  function wrapText(stage, str, x, y, maxW, lh) {
    var words = String(str).split('');
    var line = '';
    var ny = y;
    for (var i = 0; i < words.length; i++) {
      var test = line + words[i];
      if (test.length * 12.4 > maxW && line) {
        stage.text(x, ny, line, { class: 'chem-info-text', 'text-anchor': 'start' });
        line = words[i];
        ny += lh;
      } else {
        line = test;
      }
    }
    if (line) stage.text(x, ny, line, { class: 'chem-info-text', 'text-anchor': 'start' });
  }

  SL.labs['chem-free'] = {
    id: 'chem-free',
    kind: 'sim',
    meta: meta,
    rt: rt,
    reset: function () {},
    canvas: { w: 900, h: 520 },
    controls: [
      { key: 'reagentA', label: '试剂 A', type: 'select', options: reagentOptions() },
      { key: 'reagentB', label: '试剂 B', type: 'select', options: reagentOptions() },
      { key: 'indicator', label: '再加指示剂', type: 'buttons', options: [
        { value: 'none', label: '不加' }, { value: 'litmus', label: '紫色石蕊' }, { value: 'phenolphthalein', label: '无色酚酞' }
      ], note: '指示剂可以帮你判断溶液的酸碱性' }
    ],
    defaults: { reagentA: 'hcl', reagentB: 'na2co3', indicator: 'none' },
    calc: function (values) { return SL.chem.freeMix(values); },
    draw: draw,
    readouts: function (c) {
      return [
        { label: '试剂 A', text: c.aLabel },
        { label: '试剂 B', text: c.bLabel },
        { label: '实验现象', text: c.phenomenon, accent: c.reacted },
        { label: '反应类型', text: c.type },
        { label: '生成气体', text: c.bubbles > 0 ? '有' : '无' },
        { label: '生成沉淀', text: c.precipitate ? '有' : '无' }
      ];
    },
    warnings: function (c) {
      if (c.reacted) return [{ type: 'ok', message: '发生了化学反应：' + c.equation }];
      return [{ type: 'state', message: '这两种物质混合后没有明显变化，换一组试剂试试' }];
    },
    measure: function (ctx) {
      var c = ctx.calc;
      return {
        group: ctx.rows.length + 1,
        device: c.aLabel + ' + ' + c.bLabel,
        summary: c.indicator === 'none' ? c.type : c.type + '；' + c.indicatorText,
        result: c.phenomenon
      };
    }
  };
})();
