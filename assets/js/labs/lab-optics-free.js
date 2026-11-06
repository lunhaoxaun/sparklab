/* 光学自由实验室：光的反射 / 平面镜成像 / 凸透镜成像 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['optics-free'];

  function drawPlaneMirror(ctx) {
    var s = ctx.stage;
    var c = ctx.calc;
    var v = ctx.values;
    var MX = 520;
    var AXIS = 320;
    var objX = MX - c.u * 9;
    var imgX = MX + c.v * 9;
    var objTop = AXIS - c.h * 12;

    s.clear();
    s.rect(0, 430, 900, 90, { fill: '#f3f6fa' });

    /* 镜面 */
    s.rect(MX, 130, 12, 270, { fill: '#94a3b8', stroke: '#64748b', 'stroke-width': 1.2 });
    for (var hy = 138; hy < 396; hy += 18) {
      s.line(MX + 12, hy, MX + 28, hy + 14, { stroke: '#b6c3d0', 'stroke-width': 1 });
    }
    s.text(MX, 118, '平面镜', { class: 'sim-note', 'text-anchor': 'middle' });

    /* 物 */
    s.rect(objX - 3, AXIS, 6, 12, { fill: '#92400e' });
    s.line(objX, AXIS, objX, objTop, {
      stroke: '#b45309', 'stroke-width': 3, 'marker-end': 'url(#sim-arrow)'
    });
    s.text(objX, AXIS + 22, '物', { class: 'sim-note', 'text-anchor': 'middle' });
    s.text(objX, objTop - 10, 'h = ' + SL.fmt(c.h, 1) + ' cm', { class: 'sim-note', 'text-anchor': 'middle' });

    /* 虚像 */
    s.line(imgX, AXIS, imgX, objTop, {
      class: 'optics-image-virtual', stroke: '#0f766e', 'stroke-width': 2.4,
      'stroke-dasharray': '6 5', 'marker-end': 'url(#sim-arrow)'
    });
    s.text(imgX, objTop - 10, '虚像', { class: 'sim-note', 'text-anchor': 'middle' });
    s.line(imgX, AXIS + 12, imgX, AXIS + 22, { stroke: '#0f766e', 'stroke-width': 1, 'stroke-dasharray': '4 4' });

    /* 物距 / 像距 */
    s.line(objX, AXIS + 38, MX, AXIS + 38, { stroke: '#64748b', 'stroke-width': 1, 'stroke-dasharray': '5 4' });
    s.text((objX + MX) / 2, AXIS + 56, 'u = ' + SL.fmt(c.u, 1) + ' cm', { class: 'sim-note', 'text-anchor': 'middle' });
    s.line(MX, AXIS + 38, imgX, AXIS + 38, { stroke: '#0f766e', 'stroke-width': 1, 'stroke-dasharray': '5 4' });
    s.text((MX + imgX) / 2, AXIS + 56, 'v = ' + SL.fmt(c.v, 1) + ' cm', { class: 'sim-note', 'text-anchor': 'middle', fill: '#0f766e' });

    /* 观察者的视线 */
    var eye = { x: 796, y: 268 };
    s.circle(eye.x, eye.y, 10, { fill: '#f8fafc', stroke: '#64748b', 'stroke-width': 1.2 });
    s.circle(eye.x, eye.y, 4, { fill: '#334155' });
    s.text(eye.x, eye.y + 28, '眼睛', { class: 'sim-note', 'text-anchor': 'middle' });
    s.line(objX, objTop, MX, 290, { stroke: '#94a3b8', 'stroke-width': 1.2, 'stroke-dasharray': '4 4' });
    s.line(MX, 290, eye.x - 12, eye.y + 8, { stroke: '#94a3b8', 'stroke-width': 1.2, 'stroke-dasharray': '4 4' });

    /* 对称提示 */
    s.line(MX, AXIS, MX, AXIS + 76, { stroke: '#cbd5e1', 'stroke-width': 1 });
    s.text(MX, AXIS + 94, '镜面', { class: 'sim-note', 'text-anchor': 'middle' });

    s.rect(28, 24, 268, 36, { rx: 18, fill: '#0f766e', opacity: 0.12 });
    s.circle(48, 42, 6, { fill: '#0f766e' });
    s.text(62, 47, '正立、等大的虚像', { class: 'thermo-badge-text', fill: '#0f766e', 'font-weight': 600 });
    s.text(560, 58, '像与物关于镜面对称：v = u', { class: 'sim-note' });
    s.text(560, 82, '虚像不能用光屏承接', { class: 'sim-note' });
  }

  function renderPlaneInfo(host) {
    if (!host) return;
    host.innerHTML = '<div class="plot-card"><div class="plot-head"><span>平面镜成像特点</span><em>与物等大</em></div>' +
      '<div class="lens-rule-list">' +
      '<div>① 像与物大小相等（等大）</div>' +
      '<div>② 像与物到镜面的距离相等（v = u）</div>' +
      '<div>③ 像与物的连线与镜面垂直</div>' +
      '<div>④ 像是正立的虚像，不能用光屏承接</div>' +
      '</div></div>';
  }

  var planeMirrorPart = {
    id: 'plane-mirror',
    canvas: { w: 900, h: 520 },
    controls: [
      {
        key: 'distance', label: '物到镜面的距离 u', type: 'range',
        min: 5, max: 30, step: 1, unit: 'cm', digits: 0,
        note: '改变物距，像距会同步改变'
      },
      {
        key: 'height', label: '物体高度', type: 'range',
        min: 2, max: 8, step: 1, unit: 'cm', digits: 0
      }
    ],
    defaults: { distance: 15, height: 4 },
    rt: null,

    calc: function (values) { return SL.optics.planeMirror(values); },
    draw: drawPlaneMirror,

    readouts: function (c) {
      return [
        { label: '物距 u', value: c.u, unit: 'cm', digits: 1 },
        { label: '像距 v', value: c.v, unit: 'cm', digits: 1, accent: true },
        { label: '物高', value: c.h, unit: 'cm', digits: 1 },
        { label: '像高', value: c.imageH, unit: 'cm', digits: 1 },
        { label: '像的性质', text: '正立、等大的虚像' },
        { label: '能否用光屏承接', text: '不能' }
      ];
    },

    warnings: function () {
      return [{ type: 'ok', message: '像与物关于镜面对称，像的大小不随物距改变' }];
    },

    measure: function (ctx) {
      var c = ctx.calc;
      return {
        group: ctx.rows.length + 1,
        device: '平面镜成像',
        summary: '物距 ' + SL.fmt(c.u, 1) + ' cm ｜ 物高 ' + SL.fmt(c.h, 1) + ' cm',
        result: '像距 ' + SL.fmt(c.v, 1) + ' cm ｜ 像高 ' + SL.fmt(c.imageH, 1) + ' cm ｜ 正立等大虚像'
      };
    },

    renderExtra: function (host) { renderPlaneInfo(host); },

    animated: false,

    onReset: function () {}
  };

  var FREE_DEVICES = [
    { id: 'optics-reflection', label: '光的反射' },
    { id: 'plane-mirror', label: '平面镜成像' },
    { id: 'optics-lens', label: '凸透镜成像' }
  ];

  var PARTS = {
    'optics-reflection': SL.labs['optics-reflection'],
    'plane-mirror': planeMirrorPart,
    'optics-lens': SL.labs['optics-lens']
  };

  function mounted(values) { return PARTS[values.device] || PARTS['optics-reflection']; }

  var controls = [{
    key: 'device',
    label: '实验装置',
    type: 'buttons',
    options: FREE_DEVICES.map(function (d) { return { value: d.id, label: d.label }; }),
    note: '切换装置会换掉整套参数，已有记录仍在记录单里'
  }]
    .concat(SL.sim.byDevice('optics-reflection', SL.labs['optics-reflection'].controls))
    .concat(SL.sim.byDevice('plane-mirror', planeMirrorPart.controls))
    .concat(SL.sim.byDevice('optics-lens', SL.labs['optics-lens'].controls));

  var defaults = { device: 'optics-reflection' };
  FREE_DEVICES.forEach(function (d) {
    var src = PARTS[d.id] && PARTS[d.id].defaults || {};
    Object.keys(src).forEach(function (key) {
      if (key !== 'device') defaults[key] = src[key];
    });
  });

  function resetAll() {
    FREE_DEVICES.forEach(function (d) {
      if (PARTS[d.id] && PARTS[d.id].reset) PARTS[d.id].reset();
    });
  }

  function freeMeasure(ctx) {
    var v = ctx.values;
    var c = ctx.calc;
    if (v.device === 'plane-mirror') {
      return {
        group: ctx.rows.length + 1,
        device: '平面镜成像',
        summary: '物距 ' + SL.fmt(c.u, 1) + ' cm ｜ 物高 ' + SL.fmt(c.h, 1) + ' cm',
        result: '像距 ' + SL.fmt(c.v, 1) + ' cm ｜ 像高 ' + SL.fmt(c.imageH, 1) + ' cm ｜ 正立等大虚像'
      };
    }
    if (v.device === 'optics-lens') {
      return {
        group: ctx.rows.length + 1,
        device: '凸透镜成像',
        summary: 'f ' + SL.fmt(c.f, 0) + ' cm ｜ u ' + SL.fmt(c.u, 0) + ' cm',
        result: c.noImage ? '不成像（平行光）' : 'v ' + SL.fmt(Math.abs(c.v), 1) + ' cm ｜ ' + c.nature
      };
    }
    return {
      group: ctx.rows.length + 1,
      device: '光的反射',
      summary: '入射角 ' + SL.fmt(c.i, 0) + '°',
      result: '反射角 ' + SL.fmt(c.r, 0) + '° ｜ r = i'
    };
  }

  SL.labs['optics-free'] = {
    id: 'optics-free',
    kind: 'sim',
    meta: meta,
    canvas: { w: 900, h: 520 },
    controls: controls,
    defaults: defaults,
    freeDevices: FREE_DEVICES,
    parts: PARTS,
    rebuildOn: ['device'],
    rt: null,

    freeGuide: {
      title: '光学自由实验室',
      text: '反射、平面镜成像、凸透镜三套装置随时切换，入射角、物距、焦距全部开放、没有步骤限制。'
    },

    reset: resetAll,
    calc: function (values) { return mounted(values).calc(values); },
    draw: function (ctx) { mounted(ctx.values).draw(ctx); },
    readouts: function (c, values) { return mounted(values).readouts(c, values); },
    warnings: function (c, values) { return mounted(values).warnings(c, values) || []; },
    measure: freeMeasure,
    renderExtra: function (host, rows, values) {
      var part = mounted(values);
      if (part.renderExtra) part.renderExtra(host, rows, values);
    },
    onReset: function () { resetAll(); },
    animated: function (values) {
      var part = mounted(values);
      return typeof part.animated === 'function' ? !!part.animated(values) : !!part.animated;
    }
  };
})();
