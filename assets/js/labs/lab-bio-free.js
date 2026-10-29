/* 生物自由实验室：显微镜自由观察台
   玻片、目镜、物镜、光圈、准焦全部开放，可随时记录任意视野。绘制委托给 lab-bio-microscope。 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['bio-free'];
  var rt = {};

  function draw(ctx) {
    var stage = ctx.stage;
    var c = ctx.calc;
    var base = SL.labs['bio-microscope'];
    stage.clear();
    stage.line(60, 486, 420, 486, { class: 'floor-line' });
    base.drawBody(stage, c);
    base.drawField(stage, c);

    /* 底部状态条：放大倍数 + 清晰度 */
    stage.rect(40, 464, 520, 44, { rx: 12, class: 'sim-badge ' + (c.clear ? 'bal-ok' : 'bal-no') });
    stage.text(56, 492, '目镜 ' + c.eyepiece + '× × 物镜 ' + c.objective.label + ' = 总放大 ' + c.mag
      + ' 倍　' + (c.clear ? '视野清晰' : '视野模糊'),
      { class: 'sim-badge-text ' + (c.clear ? 'bal-ok' : 'bal-no') });
  }

  SL.labs['bio-free'] = {
    id: 'bio-free',
    kind: 'sim',
    meta: meta,
    rt: rt,
    reset: function () {},
    canvas: { w: 900, h: 520 },
    controls: [
      { key: 'slide', label: '玻片标本', type: 'select', options: Object.keys(SL.bio.SLIDES).map(function (k) {
        return { value: k, label: SL.bio.SLIDES[k].label };
      }) },
      { key: 'eyepiece', label: '目镜', type: 'buttons', options: [
        { value: 5, label: '5×' }, { value: 10, label: '10×' }, { value: 16, label: '16×' }
      ] },
      { key: 'objective', label: '物镜', type: 'buttons', options: [
        { value: 4, label: '4×' }, { value: 10, label: '10×' }, { value: 40, label: '40×' }
      ] },
      { key: 'aperture', label: '光圈', type: 'buttons', options: [
        { value: 'small', label: '小光圈' }, { value: 'large', label: '大光圈' }
      ] },
      { key: 'coarse', label: '粗准焦螺旋', type: 'range', min: 0, max: 100, step: 1, unit: '' },
      { key: 'fine', label: '细准焦螺旋', type: 'range', min: 0, max: 100, step: 1, unit: '' }
    ],
    defaults: { slide: 'onion', eyepiece: 10, objective: 10, aperture: 'large', coarse: 56, fine: 50 },
    calc: function (values) { return SL.bio.microscope(values); },
    draw: draw,
    readouts: function (c) {
      return [
        { label: '总放大倍数', value: c.mag, unit: '倍', digits: 0, accent: true, note: c.eyepiece + '× × ' + c.objective.label },
        { label: '视野直径', value: c.field, unit: 'mm', digits: 2 },
        { label: '视野细胞数', value: c.cells, unit: '个', digits: 0 },
        { label: '亮度', text: c.brightness > 1 ? '明亮' : c.brightness > 0.6 ? '适中' : '偏暗' },
        { label: '清晰度', text: c.clear ? '清晰' : '模糊', accent: c.clear },
        { label: '可见结构', text: c.slide.structures.join('、') }
      ];
    },
    warnings: function (c) {
      var list = [];
      if (!c.clear) list.push({ type: 'state', message: '视野还模糊，调粗准焦找物像，再用细准焦调清楚' });
      if (c.brightness < 0.5) list.push({ type: 'state', message: '视野偏暗，换用大光圈' });
      return list;
    },
    measure: function (ctx) {
      var c = ctx.calc;
      if (!c.clear) {
        SL.toast('先把视野调清晰再记录', 'warn');
        return null;
      }
      return {
        group: ctx.rows.length + 1,
        device: c.mag + '× 显微镜',
        summary: c.slide.label + ' · ' + (c.aperture ? '大光圈' : '小光圈'),
        result: '视野直径 ' + c.field + ' mm，可见 ' + c.slide.structures.join('、')
      };
    }
  };
})();
