/* 探究光的反射规律 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['optics-reflection'];
  var rt = null;
  var plotHost = null;
  var plotRef = null;

  function resetRt() { rt = { changed: false, folded: false }; }
  function ensureRt() { if (!rt) resetRt(); return rt; }

  function arcPoints(cx, cy, r, a1, a2) {
    var pts = [];
    var steps = 24;
    for (var i = 0; i <= steps; i++) {
      var a = (a1 + (a2 - a1) * i / steps) * Math.PI / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts.map(function (p) { return Math.round(p[0] * 10) / 10 + ' ' + Math.round(p[1] * 10) / 10; }).join(' L');
  }

  function drawProtractor(s) {
    var O = { x: 450, y: 400 };
    s.path('M' + arcPoints(O.x, O.y, 322, 180, 360), {
      fill: 'none', stroke: '#cbd5e1', 'stroke-width': 1.2, opacity: 0.9
    });
    for (var deg = 0; deg <= 180; deg += 10) {
      var a = (180 + deg) * Math.PI / 180;
      var x1 = O.x + 312 * Math.cos(a);
      var y1 = O.y + 312 * Math.sin(a);
      var x2 = O.x + 322 * Math.cos(a);
      var y2 = O.y + 322 * Math.sin(a);
      s.line(x1, y1, x2, y2, { stroke: '#cbd5e1', 'stroke-width': 1 });
    }
    s.text(O.x, 74, '量角器零刻度对准法线', { class: 'sim-note', 'text-anchor': 'middle' });
  }

  function draw(ctx) {
    var s = ctx.stage;
    var c = ctx.calc;
    var v = ctx.values;
    var O = { x: 450, y: 400 };
    var L = 262;
    var rad = c.i * Math.PI / 180;

    s.clear();
    s.rect(0, 430, 900, 90, { fill: '#f3f6fa' });

    /* 平面镜 */
    s.rect(112, 400, 676, 12, { fill: '#94a3b8', stroke: '#64748b', 'stroke-width': 1.2 });
    for (var hx = 120; hx < 788; hx += 18) {
      s.line(hx, 412, hx + 14, 428, { stroke: '#b6c3d0', 'stroke-width': 1 });
    }
    s.text(450, 448, '平面镜', { class: 'sim-note', 'text-anchor': 'middle' });

    /* 法线 */
    s.line(O.x, 84, O.x, 400, { class: 'optics-normal', stroke: '#94a3b8', 'stroke-width': 1.4, 'stroke-dasharray': '6 5' });
    s.text(O.x + 8, 96, '法线 N', { class: 'sim-note' });

    drawProtractor(s);

    /* 入射光线 */
    var ix = O.x - L * Math.sin(rad);
    var iy = O.y - L * Math.cos(rad);
    s.line(ix, iy, O.x, O.y, {
      class: 'optics-ray', stroke: '#dc2626', 'stroke-width': 2.4,
      'marker-end': 'url(#sim-arrow-solid)'
    });
    s.circle(ix, iy, 5, { fill: '#dc2626', opacity: 0.8 });
    s.text(ix - 6, iy - 12, '入射光线', { class: 'sim-note', 'text-anchor': 'end' });

    /* 反射光线 */
    if (c.reflectedVisible) {
      var rx = O.x + L * Math.sin(rad);
      var ry = O.y - L * Math.cos(rad);
      s.line(O.x, O.y, rx, ry, {
        class: 'optics-ray-reflected', stroke: '#2563eb', 'stroke-width': 2.4,
        'marker-end': 'url(#sim-arrow)'
      });
      s.text(rx + 8, ry - 10, '反射光线', { class: 'sim-note' });
    } else {
      s.rect(452, 236, 244, 150, {
        fill: '#e2e8f0', opacity: 0.55, stroke: '#94a3b8', 'stroke-width': 1.2, 'stroke-dasharray': '6 5'
      });
      s.text(574, 314, '光屏右半面已向后翻折', { class: 'sim-note', 'text-anchor': 'middle' });
      s.text(574, 336, '反射光线不在这个平面内', { class: 'sim-note', 'text-anchor': 'middle' });
    }

    /* O 点 */
    s.circle(O.x, O.y, 5, { fill: '#0f172a' });
    s.text(O.x + 10, O.y - 8, 'O', { class: 'sim-note', 'font-weight': 600 });

    /* 角度弧 */
    var inv = -90 - c.i;
    var ref = -90 + c.i;
    s.path('M' + arcPoints(O.x, O.y, 82, -90, inv), {
      fill: 'none', stroke: '#dc2626', 'stroke-width': 2, opacity: 0.65
    });
    s.path('M' + arcPoints(O.x, O.y, 82, -90, ref), {
      fill: 'none', stroke: '#2563eb', 'stroke-width': 2, opacity: 0.65
    });
    var midI = (-90 + inv) / 2 * Math.PI / 180;
    var midR = (-90 + ref) / 2 * Math.PI / 180;
    s.text(O.x + 108 * Math.cos(midI), O.y + 108 * Math.sin(midI), 'i = ' + SL.fmt(c.i, 0) + '°', {
      class: 'optics-angle-label', fill: '#dc2626', 'text-anchor': 'middle'
    });
    s.text(O.x + 108 * Math.cos(midR), O.y + 108 * Math.sin(midR), 'r = ' + SL.fmt(c.r, 0) + '°', {
      class: 'optics-angle-label', fill: '#2563eb', 'text-anchor': 'middle'
    });

    /* 徽标 */
    s.rect(28, 24, 220, 36, { rx: 18, fill: '#2563eb', opacity: 0.12 });
    s.circle(48, 42, 6, { fill: '#2563eb' });
    s.text(62, 47, 'i = r = ' + SL.fmt(c.i, 0) + '°', {
      class: 'thermo-badge-text', fill: '#2563eb', 'font-weight': 600
    });
    s.text(560, 58, '入射光线与反射光线分居法线两侧', { class: 'sim-note' });
    s.text(560, 82, '反射角等于入射角：r = i', { class: 'sim-note' });
  }

  function renderPlot(host, rows) {
    if (!host) return;
    if (plotHost !== host || !host.querySelector('.plot-svg')) {
      host.innerHTML = '<div class="plot-card"><div class="plot-head"><span>入射角—反射角</span>' +
        '<em>数据点应落在 r = i 上</em></div><div class="plot-svg"></div></div>';
      plotHost = host;
      plotRef = SL.sim.Plot(host.querySelector('.plot-svg'), {
        w: 360, h: 210, xLabel: '入射角 i/°', yLabel: '反射角 r/°',
        xMin: 0, xMax: 90, yMin: 0, yMax: 90,
        foot: function () { return '所有实验点都落在直线 r = i 上'; }
      });
    }
    var pts = (rows || []).map(function (r) {
      return { x: Number(r.incidence), y: Number(r.reflection) };
    });
    plotRef.setSeries([
      { name: '实验点', type: 'dots', points: pts, color: '#2563eb' },
      { name: 'r = i', dashed: true, points: [{ x: 0, y: 0 }, { x: 90, y: 90 }], color: '#94a3b8' }
    ]);
  }

  resetRt();

  SL.labs['optics-reflection'] = {
    id: 'optics-reflection',
    kind: 'sim',
    meta: meta,
    canvas: { w: 900, h: 520 },
    controls: [
      {
        key: 'incidence', label: '入射角 i', type: 'range',
        min: 10, max: 80, step: 1, unit: '°', digits: 0,
        note: '入射角是入射光线与法线的夹角'
      },
      {
        key: 'fold', label: '把光屏右半面向后翻折', type: 'toggle',
        note: '翻折后观察反射光线是否还出现在光屏上'
      }
    ],
    defaults: { incidence: 45, fold: false },
    rt: null,

    reset: resetRt,
    calc: function (values) { return SL.optics.reflection(values); },
    draw: draw,

    readouts: function (c) {
      return [
        { label: '入射角 i', value: c.i, unit: '°', digits: 0 },
        { label: '反射角 r', value: c.r, unit: '°', digits: 0, accent: true },
        { label: '入射光线与反射光线夹角', value: c.deviation, unit: '°', digits: 0 },
        { label: '是否三线共面', text: c.coplanar ? '是' : '否（光屏已翻折）' },
        { label: '反射光线', text: c.reflectedVisible ? '可见' : '不可见' }
      ];
    },

    warnings: function (c) {
      if (c.fold) return [{ type: 'state', message: '光屏翻折后看不到反射光线，说明三线在同一平面内' }];
      if (c.i >= 80) return [{ type: 'state', message: '入射角接近 90°，反射光线几乎贴着镜面射出' }];
      return [];
    },

    measure: function (ctx) {
      var c = ctx.calc;
      return {
        group: ctx.rows.length + 1,
        incidence: c.i,
        reflection: c.r,
        deviation: Number(c.deviation.toFixed(1)),
        relation: 'r = i'
      };
    },

    renderExtra: function (host, rows) { renderPlot(host, rows); },

    onParam: function (key, ctx) {
      var r = ensureRt();
      if (key === 'incidence') r.changed = true;
      if (key === 'fold') {
        r.folded = !!ctx.values.fold;
        if (r.folded) renderPlot(SL.$('#extra-host'), ctx.rows);
      }
    },

    animated: false,

    onReset: function () {
      resetRt();
      plotHost = null;
      plotRef = null;
    }
  };

  if (meta.steps && meta.steps.length) {
    meta.steps[0].check = function () {
      return ensureRt().changed;
    };
    meta.steps[1].check = function (ctx) {
      return ctx.rows.length >= 3;
    };
    meta.steps[2].check = function () {
      return ensureRt().folded;
    };
    meta.steps[3].check = function (ctx) {
      return ctx.state.allAnswered;
    };
  }
})();
