/* 生物实验一：练习使用显微镜 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['bio-microscope'];
  var rt = {};

  var FIELD = { cx: 636, cy: 268, r: 176 };

  /* ---------- 显微镜侧视图 ---------- */
  function drawBody(stage, c) {
    var lift = (c.focus - 50) * 0.35;          /* 粗准焦：镜筒上下移动 */
    var tubeTop = 96 - lift;

    /* 底座 + 镜柱 */
    stage.rect(96, 452, 190, 22, { rx: 11, class: 'bio-base' });
    stage.rect(150, 300, 34, 156, { rx: 10, class: 'bio-arm' });
    /* 载物台 */
    stage.rect(126, 322, 186, 14, { rx: 5, class: 'bio-stage' });
    stage.rect(228, 336, 16, 22, { rx: 4, class: 'bio-clip' });
    stage.text(292, 316, '载物台', { class: 'sim-note', 'text-anchor': 'end' });
    /* 反光镜 */
    stage.path('M214 400 L268 386 L268 412 L214 426 Z', { class: 'bio-mirror' });
    stage.line(240, 406, 240, 440, { class: 'bio-arm-line' });
    stage.text(276, 420, '反光镜', { class: 'sim-note', 'text-anchor': 'start' });

    /* 镜臂（斜向） */
    stage.path('M167 300 L167 200 Q167 186 181 186 L200 186', { class: 'bio-arm-line' });

    /* 镜筒与目镜 */
    stage.rect(172, tubeTop, 34, 116, { rx: 6, class: 'bio-tube' });
    stage.rect(166, tubeTop - 26, 46, 30, { rx: 6, class: 'bio-eyepiece' });
    stage.text(189, tubeTop - 34, '目镜 10×', { class: 'sim-note', 'text-anchor': 'middle' });

    /* 转换器与物镜 */
    var objY = tubeTop + 116;
    stage.rect(174, objY, 30, 12, { rx: 4, class: 'bio-nosepiece' });
    var objH = c.objective.mag >= 40 ? 54 : c.objective.mag >= 10 ? 42 : 30;
    stage.rect(178, objY + 12, 22, objH, { rx: 5, class: 'bio-objective' });
    stage.text(156, objY + 18 + objH / 2, c.objective.label, { class: 'chem-tag-ok', 'text-anchor': 'end' });

    /* 粗 / 细准焦螺旋 */
    stage.circle(140, 246, 17, { class: 'bio-knob' });
    stage.circle(140, 246, 7, { class: 'bio-knob-in' });
    stage.circle(140, 286, 11, { class: 'bio-knob bio-knob-fine' });
    stage.text(112, 250, '粗', { class: 'sim-note', 'text-anchor': 'end' });
    stage.text(112, 290, '细', { class: 'sim-note', 'text-anchor': 'end' });
    /* 玻片 */
    stage.rect(140, 336, 88, 8, { rx: 2, class: 'bio-slide' });
    stage.line(230, 338, 320, 306, { class: 'bio-arrow' });
    stage.text(324, 302, c.slide.label, { class: 'sim-note', 'text-anchor': 'start' });
  }

  /* ---------- 视野 ---------- */
  function drawField(stage, c) {
    var cx = FIELD.cx, cy = FIELD.cy, r = FIELD.r;
    var slide = c.slide;

    /* 目镜外框 */
    stage.circle(cx, cy, r + 12, { class: 'bio-eyepiece-ring' });
    stage.circle(cx, cy, r, { class: 'bio-field-bg' });

    /* 亮度：光圈与物镜共同决定 */
    var lum = SL.bio.clamp(c.brightness, 0.15, 1.6);
    stage.circle(cx, cy, r, { class: 'bio-field-light', opacity: SL.bio.clamp(lum * 0.5, 0.06, 0.6) });

    /* 细胞内层：带模糊滤镜 */
    var defs = stage.svg.querySelector('defs');
    var old = defs.querySelector('#bio-blur');
    if (old) old.parentNode.removeChild(old);
    var filter = SL.sim.svgEl('filter', { id: 'bio-blur', x: '-10%', y: '-10%', width: '120%', height: '120%' });
    filter.appendChild(SL.sim.svgEl('feGaussianBlur', { stdDeviation: c.blur }));
    defs.appendChild(filter);

    var clipId = 'bio-field-clip';
    var oldClip = defs.querySelector('#' + clipId);
    if (oldClip) oldClip.parentNode.removeChild(oldClip);
    var clip = SL.sim.svgEl('clipPath', { id: clipId });
    clip.appendChild(SL.sim.svgEl('circle', { cx: cx, cy: cy, r: r - 2 }));
    defs.appendChild(clip);

    var g = SL.sim.svgEl('g', { 'clip-path': 'url(#' + clipId + ')', filter: 'url(#bio-blur)' });
    stage.layer.appendChild(g);

    var n = c.cells;
    var cols = Math.ceil(Math.sqrt(n));
    var cellW = (r * 1.86) / cols;
    var startX = cx - (cols * cellW) / 2 + cellW / 2;
    var rows = Math.ceil(n / cols);
    var startY = cy - (rows * cellW) / 2 + cellW / 2;

    for (var i = 0; i < n; i++) {
      var col = i % cols, row = Math.floor(i / cols);
      var x = startX + col * cellW + (slide.shape === 'blob' ? (i % 3 - 1) * 6 : 0);
      var y = startY + row * cellW + (slide.shape === 'blob' ? (i % 2) * 8 : 0);
      var w = cellW * 0.86, h = cellW * 0.8;
      var cell;
      if (slide.shape === 'rect') {
        cell = SL.sim.svgEl('rect', {
          x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 4,
          fill: slide.color, stroke: slide.edge, 'stroke-width': 1.6
        });
      } else if (slide.shape === 'blob') {
        cell = SL.sim.svgEl('ellipse', {
          cx: x, cy: y, rx: w / 2, ry: h / 2.3,
          fill: slide.color, stroke: slide.edge, 'stroke-width': 1.6
        });
      } else {
        cell = SL.sim.svgEl('circle', {
          cx: x, cy: y, r: w / 2.5,
          fill: slide.color, stroke: slide.edge, 'stroke-width': 1.6
        });
      }
      g.appendChild(cell);
      /* 细胞核 */
      var nuc = SL.sim.svgEl('circle', {
        cx: x + (slide.shape === 'rect' ? w * 0.08 : 0), cy: y, r: Math.max(3, w * 0.13),
        fill: slide.nucleus, opacity: 0.85
      });
      g.appendChild(nuc);
      /* 叶绿体 */
      if (slide.structures.indexOf('叶绿体') !== -1) {
        for (var k = 0; k < 4; k++) {
          g.appendChild(SL.sim.svgEl('ellipse', {
            cx: x + Math.cos(k * 1.7 + i) * w * 0.3, cy: y + Math.sin(k * 1.7 + i) * h * 0.3,
            rx: Math.max(3, w * 0.1), ry: Math.max(2, h * 0.07), fill: '#7fb069', opacity: 0.9
          }));
        }
      }
      /* 液泡：大块浅色 */
      if (slide.structures.indexOf('液泡') !== -1 && slide.shape === 'rect') {
        g.appendChild(SL.sim.svgEl('rect', {
          x: x - w * 0.3, y: y - h * 0.28, width: w * 0.6, height: h * 0.56, rx: 6,
          fill: '#ffffff', opacity: 0.5
        }));
      }
    }

    /* 模糊时加一层雾，模拟没对准焦 */
    if (c.sharp < 0.6) {
      stage.circle(cx, cy, r, { class: 'bio-field-haze', opacity: (0.6 - c.sharp) * 0.9 });
    }

    /* 视野标注 */
    stage.text(cx, cy + r + 34, '放大 ' + c.mag + ' 倍 · 视野直径约 ' + c.field + ' mm',
      { class: 'sim-note', 'text-anchor': 'middle' });
    stage.text(cx, cy + r + 56, c.clear ? '视野清晰，可以观察细胞结构' : '视野模糊，转动准焦螺旋让它变清晰',
      { class: c.clear ? 'chem-tag-ok' : 'sim-note', 'text-anchor': 'middle' });
  }

  function draw(ctx) {
    var stage = ctx.stage;
    var c = ctx.calc;
    stage.clear();
    stage.line(60, 486, 420, 486, { class: 'floor-line' });
    drawBody(stage, c);
    drawField(stage, c);

    /* 参数提示（放在视野上方，避开显微镜的目镜标注） */
    stage.rect(424, 34, 400, 42, { rx: 10, class: 'sim-badge ' + (c.clear ? 'bal-ok' : 'bal-no') });
    stage.text(440, 60, '放大 ' + c.mag + '×　' + (c.aperture ? '大光圈' : '小光圈') + '　'
      + (c.clear ? '已对准焦距' : '焦距未对准'),
      { class: 'sim-badge-text ' + (c.clear ? 'bal-ok' : 'bal-no') });
  }

  var steps = [
    { need: function (c) { return c.aperture === 1; } },
    { need: function (c) { return c.focus > 0; } },
    { need: function (c) { return c.clear; } },
    { need: function (c) { return c.objective.mag >= 40 && c.clear; } },
    { need: function (c, v, ctx) { return !!ctx.state.allAnswered; } }
  ];
  meta.steps.forEach(function (step, i) {
    step.check = function (ctx) { return steps[i].need(ctx.calc, ctx.values, ctx); };
  });

  SL.labs['bio-microscope'] = {
    id: 'bio-microscope',
    kind: 'sim',
    meta: meta,
    rt: rt,
    reset: function () {},
    canvas: { w: 900, h: 520 },
    /* 供生物自由实验室复用同一套显微镜与视野绘制 */
    drawBody: drawBody,
    drawField: drawField,
    field: FIELD,
    controls: [
      { key: 'slide', label: '玻片标本', type: 'select', options: Object.keys(SL.bio.SLIDES).map(function (k) {
        return { value: k, label: SL.bio.SLIDES[k].label };
      }) },
      { key: 'objective', label: '物镜', type: 'buttons', options: [
        { value: 4, label: '4×' }, { value: 10, label: '10×' }, { value: 40, label: '40×' }
      ], note: '目镜固定 10×，总放大倍数 = 目镜 × 物镜' },
      { key: 'aperture', label: '光圈', type: 'buttons', options: [
        { value: 'small', label: '小光圈' }, { value: 'large', label: '大光圈' }
      ], note: '视野偏暗时换大光圈' },
      { key: 'coarse', label: '粗准焦螺旋', type: 'range', min: 0, max: 100, step: 1, unit: '',
        note: '先把镜筒降到最低，再慢慢升高找物像' },
      { key: 'fine', label: '细准焦螺旋', type: 'range', min: 0, max: 100, step: 1, unit: '',
        note: '物像出现后用细准焦调清楚' }
    ],
    defaults: { slide: 'onion', objective: 10, aperture: 'small', coarse: 0, fine: 50 },
    calc: function (values) { return SL.bio.microscope(values); },
    draw: draw,
    readouts: function (c) {
      return [
        { label: '放大倍数', value: c.mag, unit: '倍', digits: 0, accent: true, note: '10× × ' + c.objective.label },
        { label: '视野直径', value: c.field, unit: 'mm', digits: 2 },
        { label: '视野亮度', text: c.brightness > 1 ? '明亮' : c.brightness > 0.6 ? '适中' : '偏暗' },
        { label: '清晰度', text: c.clear ? '清晰' : '模糊', accent: c.clear },
        { label: '玻片', text: c.slide.label },
        { label: '可见结构', text: c.slide.structures.join('、') }
      ];
    },
    warnings: function (c) {
      var list = [];
      if (c.sharp < 0.35) list.push({ type: 'state', message: '视野里一片模糊：转动粗准焦螺旋，先让物镜靠近玻片再慢慢升高镜筒' });
      else if (!c.clear) list.push({ type: 'state', message: '物像已经出现但还不够清晰，用细准焦螺旋微调一下' });
      if (c.brightness < 0.5) list.push({ type: 'state', message: '视野太暗，换用大光圈或转动反光镜' });
      if (c.objective.mag === 40) list.push({ type: 'state', message: '换高倍镜后只能使用细准焦螺旋，不能再用粗准焦，以免压碎玻片' });
      return list;
    },
    measure: function (ctx) {
      var c = ctx.calc;
      if (!c.clear) {
        SL.toast('先把视野调清晰，再记录观察结果', 'warn');
        return null;
      }
      return {
        group: ctx.rows.length + 1,
        slide: c.slide.label,
        objective: c.objective.label,
        mag: c.mag,
        field: c.field,
        aperture: c.aperture ? '大光圈' : '小光圈',
        structures: c.slide.structures.join('、')
      };
    },
    renderExtra: function (host, rows) {
      if (!host) return;
      var valid = rows.filter(function (r) { return r.mag; });
      if (!valid.length) {
        host.innerHTML = '<div class="chart-empty">' + SL.icon('chart-line', '', 20) +
          '<span>换几个物镜各记录一次，这里会对比放大倍数与视野范围</span></div>';
        return;
      }
      var plot = SL.sim.Plot(host, {
        w: 340, h: 200, xLabel: '放大倍数', yLabel: '视野直径 /mm', xMin: 0, yMin: 0,
        foot: function () { return '放大倍数越大，看到的范围越小，看到的细胞越大'; }
      });
      plot.setSeries([{
        name: '视野直径', color: '#2f855a',
        points: valid.map(function (r) { return { x: Number(r.mag), y: Number(r.field) }; })
          .sort(function (a, b) { return a.x - b.x; }),
        type: 'dots'
      }]);
    }
  };
})();
