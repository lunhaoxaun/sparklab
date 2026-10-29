/* 生物实验三：探究光合作用需要光和二氧化碳（绿叶在光下制造有机物） */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['bio-photo'];
  var rt = {};

  function sun(stage, x, y, on) {
    if (on) {
      stage.circle(x, y, 26, { class: 'bio-sun' });
      for (var i = 0; i < 8; i++) {
        var a = i * Math.PI / 4;
        stage.line(x + Math.cos(a) * 32, y + Math.sin(a) * 32, x + Math.cos(a) * 42, y + Math.sin(a) * 42,
          { class: 'bio-sun-ray' });
      }
      stage.text(x, y + 62, '光照', { class: 'sim-note', 'text-anchor': 'middle' });
    } else {
      stage.circle(x, y, 26, { class: 'bio-dark' });
      stage.text(x, y + 62, '黑暗处理', { class: 'sim-note', 'text-anchor': 'middle' });
    }
  }

  function drawPlant(stage, c) {
    /* 花盆 */
    stage.path('M176 380 L268 380 L254 462 L190 462 Z', { class: 'bio-pot' });
    stage.rect(170, 370, 104, 14, { rx: 4, class: 'bio-pot-rim' });
    /* 茎与叶 */
    stage.line(222, 380, 222, 250, { class: 'bio-stem' });
    stage.path('M222 330 Q180 316 158 288 Q196 288 222 306 Z', { class: 'bio-leaf' });
    stage.path('M222 300 Q264 286 286 258 Q248 258 222 276 Z', { class: 'bio-leaf' });
    stage.line(222, 380, 222, 250, { class: 'bio-stem' });
    /* 顶端叶片（含遮光纸片） */
    stage.path('M222 250 Q182 226 178 190 Q206 196 222 222 Q238 196 266 190 Q262 226 222 250 Z', { class: 'bio-leaf' });
    if (c.cover) {
      stage.path('M222 250 Q182 226 178 190 Q196 194 200 200 L200 244 Z', { class: 'bio-mask' });
      stage.text(168, 176, '黑纸遮光', { class: 'sim-note', 'text-anchor': 'middle' });
    } else {
      stage.text(178, 176, '整片照光', { class: 'sim-note', 'text-anchor': 'middle' });
    }
    stage.text(222, 484, c.co2 ? '清水（有二氧化碳）' : '氢氧化钠溶液（吸收二氧化碳）',
      { class: 'sim-note', 'text-anchor': 'middle' });
    /* 钟罩 */
    stage.path('M126 372 L126 250 Q126 176 222 176 Q318 176 318 250 L318 372',
      { class: c.co2 ? 'bio-bell' : 'bio-bell-bad' });
    stage.text(222, 164, c.co2 ? '透明钟罩' : '钟罩内二氧化碳被吸收',
      { class: c.co2 ? 'sim-note' : 'chem-tag-no', 'text-anchor': 'middle' });
  }

  function drawResult(stage, c) {
    var cx = 596, cy = 268, rx = 150, ry = 92;
    stage.text(cx, 148, '用碘液检验叶片', { class: 'chem-info-title', 'text-anchor': 'middle' });

    /* 叶片左右两半：左半遮光，右半见光 */
    stage.path('M' + cx + ' ' + (cy - ry) + ' A' + rx + ' ' + ry + ' 0 0 0 ' + cx + ' ' + (cy + ry) + ' Z',
      { class: 'bio-leaf-piece', fill: c.masked.color, stroke: '#8a7a5c' });
    stage.path('M' + cx + ' ' + (cy - ry) + ' A' + rx + ' ' + ry + ' 0 0 1 ' + cx + ' ' + (cy + ry) + ' Z',
      { class: 'bio-leaf-piece', fill: c.exposed.color, stroke: '#8a7a5c' });
    stage.line(cx, cy - ry, cx, cy + ry, { class: 'bio-leaf-rib' });

    stage.text(cx - rx * 0.45, cy + ry + 26, c.cover ? '遮光部分' : '（未遮光）',
      { class: 'sim-note', 'text-anchor': 'middle' });
    stage.text(cx + rx * 0.45, cy + ry + 26, '见光部分', { class: 'sim-note', 'text-anchor': 'middle' });
    stage.text(cx - rx * 0.45, cy + ry + 46, c.masked.text, { class: 'chem-tag-no', 'text-anchor': 'middle' });
    stage.text(cx + rx * 0.45, cy + ry + 46, c.exposed.text,
      { class: c.exposed.text.indexOf('不变蓝') === 0 ? 'chem-tag-no' : 'chem-tag-ok', 'text-anchor': 'middle' });

    /* 结论卡 */
    var ok = c.starch > 0.5;
    stage.rect(440, 40, 400, 56, { rx: 12, class: 'sim-badge ' + (ok ? 'bal-ok' : 'bal-no') });
    stage.text(456, 64, '淀粉积累：' + Math.round(c.starch * 100) + '%　' + (ok ? '光合作用已发生' : '没有明显淀粉'),
      { class: 'sim-badge-text ' + (ok ? 'bal-ok' : 'bal-no') });
    stage.text(456, 86, c.reason || '光照和二氧化碳都具备，叶片在光下制造了淀粉', { class: 'sim-note' });
  }

  function draw(ctx) {
    var stage = ctx.stage;
    var c = ctx.calc;
    stage.clear();
    stage.line(70, 492, 860, 492, { class: 'floor-line' });
    drawPlant(stage, c);
    drawResult(stage, c);
    sun(stage, 760, 150, c.light);
    stage.text(440, 128, '光照 ' + SL.fmt(c.hours, 1) + ' 小时', { class: 'sim-note', 'text-anchor': 'middle' });
    /* 箭头 */
    stage.path('M360 268 L404 268', { class: 'bio-arrow', 'marker-end': 'url(#sim-arrow)' });
  }

  var steps = [
    { need: function (c) { return c.rate === 1 && c.hours >= 1; } },
    { need: function (c) { return c.starch > 0.2; } },
    { need: function (c) { return c.cover && c.light && c.starch > 0.5; } },
    { need: function (c) { return c.light && !c.co2; } },
    { need: function (c, v, ctx) { return !!ctx.state.allAnswered; } }
  ];
  meta.steps.forEach(function (step, i) {
    step.check = function (ctx) { return steps[i].need(ctx.calc, ctx.values, ctx); };
  });

  SL.labs['bio-photo'] = {
    id: 'bio-photo',
    kind: 'sim',
    meta: meta,
    rt: rt,
    reset: function () {},
    canvas: { w: 900, h: 520 },
    controls: [
      { key: 'light', label: '给予光照', type: 'toggle', note: '关掉后在暗处处理一夜' },
      { key: 'co2', label: '钟罩内放清水（提供二氧化碳）', type: 'toggle', note: '关掉则放氢氧化钠溶液，把二氧化碳吸收掉' },
      { key: 'cover', label: '用黑纸遮住叶片的一部分', type: 'toggle' },
      { key: 'hours', label: '光照时间', type: 'range', min: 0, max: 8, step: 0.5, unit: 'h' }
    ],
    defaults: { light: true, co2: true, cover: true, hours: 4 },
    calc: function (values) { return SL.bio.photosynthesis(values); },
    draw: draw,
    readouts: function (c) {
      return [
        { label: '光照', text: c.light ? '有' : '无' },
        { label: '二氧化碳', text: c.co2 ? '有' : '被吸收' },
        { label: '光照时间', value: c.hours, unit: 'h', digits: 1 },
        { label: '淀粉积累', value: c.starch * 100, unit: '%', digits: 0, accent: c.starch > 0.5 },
        { label: '见光部分', text: c.exposed.text, accent: c.starch > 0.5 },
        { label: '遮光部分', text: c.masked.text }
      ];
    },
    warnings: function (c) {
      var list = [];
      if (!c.light) list.push({ type: 'state', message: '没有光照，光合作用不能进行，叶片检验时不会变蓝' });
      if (!c.co2) list.push({ type: 'state', message: '二氧化碳被氢氧化钠吸收，缺少原料，同样不能制造淀粉' });
      if (c.hours < 1 && c.rate) list.push({ type: 'state', message: '光照时间太短，积累的淀粉还不足以让碘液明显变色' });
      return list;
    },
    measure: function (ctx) {
      var c = ctx.calc;
      return {
        group: ctx.rows.length + 1,
        light: c.light ? '有' : '无',
        co2: c.co2 ? '有' : '被吸收',
        hours: c.hours,
        starch: Math.round(c.starch * 100),
        exposed: c.exposed.text,
        masked: c.masked.text
      };
    },
    renderExtra: function (host, rows) {
      if (!host) return;
      var valid = rows.filter(function (r) { return r.starch != null; });
      if (!valid.length) {
        host.innerHTML = '<div class="chart-empty">' + SL.icon('chart-line', '', 20) +
          '<span>记录几组不同光照时间的数据，这里会画出淀粉积累曲线</span></div>';
        return;
      }
      var plot = SL.sim.Plot(host, {
        w: 340, h: 200, xLabel: '光照时间 /h', yLabel: '淀粉积累 /%', xMin: 0, yMin: 0, yMax: 110,
        foot: function () { return '光照越充分，积累的淀粉越多，碘液颜色越深'; }
      });
      plot.setSeries([{
        name: '淀粉积累', color: '#2f855a',
        points: valid.map(function (r) { return { x: Number(r.hours), y: Number(r.starch) }; })
          .sort(function (a, b) { return a.x - b.x; })
      }]);
    }
  };
})();
