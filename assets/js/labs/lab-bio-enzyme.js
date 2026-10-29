/* 生物实验四：探究唾液淀粉酶对淀粉的消化作用 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['bio-enzyme'];
  var rt = {};

  var TUBE_X = [212, 436, 660], TUBE_W = 92, TUBE_TOP = 132, TUBE_BOT = 448;

  function waterColor(t) {
    var k = Math.max(0, Math.min(1, t / 100));
    var r = Math.round(206 + 26 * k), g = Math.round(232 - 60 * k), b = Math.round(244 - 70 * k);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function draw(ctx) {
    var stage = ctx.stage;
    var c = ctx.calc;
    stage.clear();

    /* 水浴 */
    stage.rect(110, 300, 700, 168, { rx: 12, class: 'chem-trough' });
    stage.rect(115, 326, 690, 136, { rx: 9, class: 'chem-water-hot', fill: waterColor(c.temp) });
    stage.line(115, 326, 805, 326, { class: 'chem-surface' });
    stage.text(460, 500, '水浴保温 ' + SL.fmt(c.temp, 0) + ' ℃ · 保温 ' + SL.fmt(c.minutes, 0) + ' min',
      { class: 'sim-note', 'text-anchor': 'middle' });

    /* 三支试管 */
    c.tubes.forEach(function (t, i) {
      var x = TUBE_X[i];
      stage.path('M' + x + ' ' + TUBE_TOP + ' L' + x + ' ' + (TUBE_BOT - 30) + ' Q' + x + ' ' + TUBE_BOT + ' ' +
        (x + TUBE_W / 2) + ' ' + TUBE_BOT + ' Q' + (x + TUBE_W) + ' ' + TUBE_BOT + ' ' + (x + TUBE_W) + ' ' + (TUBE_BOT - 30) +
        ' L' + (x + TUBE_W) + ' ' + TUBE_TOP, { class: 'chem-jar' });
      stage.line(x, TUBE_TOP, x + TUBE_W, TUBE_TOP, { class: 'chem-rim' });
      /* 管内液体：碘液检验后的颜色 */
      var liqTop = 250;
      stage.path('M' + (x + 3) + ' ' + liqTop + ' L' + (x + TUBE_W - 3) + ' ' + liqTop +
        ' L' + (x + TUBE_W - 3) + ' ' + (TUBE_BOT - 30) + ' Q' + (x + TUBE_W - 3) + ' ' + (TUBE_BOT - 3) + ' ' + (x + TUBE_W / 2) + ' ' + (TUBE_BOT - 3) +
        ' Q' + (x + 3) + ' ' + (TUBE_BOT - 3) + ' ' + (x + 3) + ' ' + (TUBE_BOT - 30) + ' Z',
        { class: 'chem-liquid', fill: t.iodine.color });
      stage.line(x + 3, liqTop, x + TUBE_W - 3, liqTop, { class: 'chem-surface' });
      /* 序号 */
      stage.circle(x + TUBE_W / 2, TUBE_TOP - 22, 15, { class: 'bio-tube-no' });
      stage.text(x + TUBE_W / 2, TUBE_TOP - 17, String(i + 1), { class: 'bio-tube-no-text', 'text-anchor': 'middle' });
      /* 说明 */
      stage.text(x + TUBE_W / 2, 470, t.label, { class: 'sim-note', 'text-anchor': 'middle' });
      stage.text(x + TUBE_W / 2, 152, t.iodine.text, {
        class: t.cleared ? 'chem-tag-ok' : 'chem-tag-no', 'text-anchor': 'middle'
      });
      /* 分解进程条 */
      var barY = 176;
      stage.rect(x + 8, barY, TUBE_W - 16, 10, { rx: 5, class: 'chem-track' });
      if (t.digested > 0) {
        stage.rect(x + 8, barY, (TUBE_W - 16) * t.digested, 10, { rx: 5, class: 'chem-track-fill' });
      }
    });

    /* 温度计 */
    var thX = 826;
    stage.rect(thX, 120, 18, 300, { rx: 9, class: 'chem-thermo' });
    var h = Math.max(0.02, c.temp / 100);
    stage.rect(thX + 3, 410 - 280 * h, 12, 280 * h, { rx: 6, class: 'chem-thermo-fill' });
    stage.circle(thX + 9, 424, 12, { class: 'chem-thermo-fill' });
    stage.text(thX + 9, 108, SL.fmt(c.temp, 0) + ' ℃', { class: 'sim-note', 'text-anchor': 'middle' });

    /* 结论徽标 */
    stage.rect(40, 36, 430, 46, { rx: 10, class: 'sim-badge ' + (c.digestedCount ? 'bal-ok' : 'bal-no') });
    stage.text(56, 65, '酶活性 ' + Math.round(c.activity * 100) + '%　已变清的试管 ' + c.digestedCount + ' / 3'
      + (c.denatured ? '　高温使酶失去活性' : ''),
      { class: 'sim-badge-text ' + (c.digestedCount ? 'bal-ok' : 'bal-no') });
  }

  var steps = [
    { need: function (c) { return c.optimal; } },
    { need: function (c) { return c.tubes[0].digested > 0.5; } },
    { need: function (c) { return c.tubes[0].cleared; } },
    { need: function (c) { return c.temp >= 70 && c.tubes[0].digested < 0.1; } },
    { need: function (c, v, ctx) { return !!ctx.state.allAnswered; } }
  ];
  meta.steps.forEach(function (step, i) {
    step.check = function (ctx) { return steps[i].need(ctx.calc, ctx.values, ctx); };
  });

  SL.labs['bio-enzyme'] = {
    id: 'bio-enzyme',
    kind: 'sim',
    meta: meta,
    rt: rt,
    reset: function () {},
    canvas: { w: 900, h: 520 },
    controls: [
      { key: 'temp', label: '水浴温度', type: 'range', min: 0, max: 100, step: 1, unit: '℃',
        note: '唾液淀粉酶最适温度约 37 ℃，超过 60 ℃ 会变性失活' },
      { key: 'minutes', label: '保温时间', type: 'range', min: 0, max: 20, step: 1, unit: 'min' }
    ],
    defaults: { temp: 37, minutes: 10 },
    calc: function (values) { return SL.bio.enzyme(values); },
    draw: draw,
    readouts: function (c) {
      return [
        { label: '水浴温度', value: c.temp, unit: '℃', digits: 0 },
        { label: '酶活性', value: c.activity * 100, unit: '%', digits: 0, accent: c.activity > 0.5,
          note: c.optimal ? '最适温度附近' : (c.denatured ? '已变性失活' : '偏离最适温度') },
        { label: '1 号管淀粉', value: c.tubes[0].starch * 100, unit: '%', digits: 0 },
        { label: '1 号管碘液', text: c.tubes[0].iodine.text },
        { label: '2 号管（煮沸唾液）', text: c.tubes[1].iodine.text },
        { label: '3 号管（清水）', text: c.tubes[2].iodine.text }
      ];
    },
    warnings: function (c) {
      var list = [];
      if (c.temp < 20) list.push({ type: 'state', message: '温度太低，酶的活性很弱，淀粉几乎不分解' });
      if (c.denatured) list.push({ type: 'state', message: '温度超过 60 ℃，唾液淀粉酶已经变性失活，再降温活性也回不来' });
      if (c.minutes < 2) list.push({ type: 'state', message: '保温时间太短，还没来得及充分分解，把时间调大一些' });
      return list;
    },
    measure: function (ctx) {
      var c = ctx.calc;
      return {
        group: ctx.rows.length + 1,
        temp: c.temp,
        minutes: c.minutes,
        activity: Math.round(c.activity * 100),
        t1: c.tubes[0].iodine.text,
        t2: c.tubes[1].iodine.text,
        t3: c.tubes[2].iodine.text,
        digested: c.digestedCount
      };
    },
    renderExtra: function (host, rows) {
      if (!host) return;
      var pts = [];
      for (var t = 0; t <= 100; t += 5) {
        pts.push({ x: t, y: Math.round(SL.bio.enzymeActivity(t) * 100) });
      }
      var plot = SL.sim.Plot(host, {
        w: 340, h: 210, xLabel: '温度 /℃', yLabel: '酶活性 /%', xMin: 0, yMin: 0, yMax: 105,
        foot: function () { return '曲线在 37 ℃ 附近最高，超过 60 ℃ 迅速降到 0'; }
      });
      var series = [{ name: '酶活性', color: '#c05621', points: pts }];
      if (rows && rows.length) {
        series.push({
          name: '实验点', color: '#2f855a', type: 'dots',
          points: rows.filter(function (r) { return r.temp != null; })
            .map(function (r) { return { x: Number(r.temp), y: Number(r.activity) }; })
        });
      }
      plot.setSeries(series);
    }
  };
})();
