/* 探究凸透镜成像的规律 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['optics-lens'];
  var S = 6;          /* 光具座：6 px / cm */
  var HS = 12;        /* 物高：12 px / cm */
  var L = 450;
  var AXIS = 300;

  function drawArrow(s, x1, y1, x2, y2, attrs) {
    var conf = Object.assign({
      stroke: '#0f172a', 'stroke-width': 2.4, 'marker-end': 'url(#sim-arrow)'
    }, attrs || {});
    return s.line(x1, y1, x2, y2, conf);
  }

  function draw(ctx) {
    var s = ctx.stage;
    var c = ctx.calc;
    var v = ctx.values;
    s.clear();

    s.rect(0, 430, 900, 90, { fill: '#f3f6fa' });

    /* 光具座 */
    s.rect(60, 392, 800, 12, { rx: 3, fill: '#cbd5e1' });
    for (var gx = 90; gx <= 840; gx += 30) {
      s.line(gx, 392, gx, 384, { stroke: '#94a3b8', 'stroke-width': 1 });
    }
    s.text(64, 416, '光具座（每格 5 cm）', { class: 'sim-note' });

    /* 主光轴 */
    s.line(60, AXIS, 860, AXIS, { stroke: '#94a3b8', 'stroke-width': 1.2, 'stroke-dasharray': '5 5' });
    s.text(846, AXIS - 8, '主光轴', { class: 'sim-note', 'text-anchor': 'end' });

    /* 透镜 */
    s.path('M' + L + ' 206 Q' + (L + 30) + ' ' + AXIS + ' ' + L + ' 394 Q' + (L - 30) + ' ' + AXIS + ' ' + L + ' 206 Z', {
      class: 'optics-lens', fill: '#bfdbfe', opacity: 0.55, stroke: '#3b82f6', 'stroke-width': 2
    });
    s.line(L, 200, L, 400, { stroke: '#60a5fa', 'stroke-width': 1.2, opacity: 0.55 });
    s.text(L, 188, '凸透镜', { class: 'sim-note', 'text-anchor': 'middle' });

    /* 焦点 / 二倍焦距 */
    [['F', -1, c.f], ['2F', -1, 2 * c.f], ['F′', 1, c.f], ['2F′', 1, 2 * c.f]].forEach(function (m) {
      var x = L + m[1] * m[2] * S;
      if (x < 60 || x > 860) return;
      s.line(x, AXIS - 7, x, AXIS + 7, { stroke: '#0f766e', 'stroke-width': 2 });
      s.text(x, AXIS + 22, m[0], { class: 'optics-focus-label', 'text-anchor': 'middle' });
    });

    /* 物体 */
    var ox = L - c.u * S;
    var oy = AXIS - c.height * HS;
    s.rect(ox - 3, AXIS, 6, 12, { fill: '#92400e' });
    drawArrow(s, ox, AXIS, ox, oy, { stroke: '#b45309', 'stroke-width': 3 });
    s.text(ox, AXIS + 22, '物', { class: 'sim-note', 'text-anchor': 'middle' });
    s.text(ox, oy - 10, 'h = ' + SL.fmt(c.height, 1) + ' cm', { class: 'sim-note', 'text-anchor': 'middle' });

    /* 三条特殊光线 */
    var f2x = L + c.f * S;
    var f1x = L - c.f * S;
    var rightEnd = 856;

    /* 1. 平行主光轴 → 过焦点 F′ */
    s.line(ox, oy, L, oy, { class: 'optics-ray', stroke: '#ef4444', 'stroke-width': 2 });
    var slope1 = (AXIS - oy) / (f2x - L);
    s.line(L, oy, rightEnd, oy + slope1 * (rightEnd - L), {
      class: 'optics-ray', stroke: '#ef4444', 'stroke-width': 2, 'marker-end': 'url(#sim-arrow)'
    });

    /* 2. 过光心 → 方向不变 */
    s.line(ox, oy, L, AXIS, { class: 'optics-ray', stroke: '#059669', 'stroke-width': 2 });
    var slope2 = (AXIS - oy) / (L - ox);
    s.line(L, AXIS, rightEnd, AXIS + slope2 * (rightEnd - L), {
      class: 'optics-ray', stroke: '#059669', 'stroke-width': 2, 'marker-end': 'url(#sim-arrow)'
    });

    /* 3. 过焦点 F → 平行主光轴（u > f 时成立） */
    if (!c.noImage && c.u > c.f) {
      var yAtLens = AXIS + (oy - AXIS) * (L - f1x) / (ox - f1x);
      s.line(ox, oy, L, yAtLens, { class: 'optics-ray', stroke: '#7c3aed', 'stroke-width': 2 });
      s.line(L, yAtLens, rightEnd, yAtLens, {
        class: 'optics-ray', stroke: '#7c3aed', 'stroke-width': 2, 'marker-end': 'url(#sim-arrow)'
      });
    }

    /* 像 */
    if (!c.noImage) {
      var ix = L + c.v * S;
      var iy = c.real ? AXIS + c.imageH * HS : AXIS - c.imageH * HS;
      var inView = ix >= 60 && ix <= 850 && iy >= 70 && iy <= 410;
      if (inView) {
        if (c.real) {
          drawArrow(s, ix, AXIS, ix, iy, { class: 'optics-image', stroke: '#0f766e', 'stroke-width': 3 });
          s.text(ix, iy + (iy > AXIS ? 22 : -10), '实像', { class: 'sim-note', 'text-anchor': 'middle' });
        } else {
          s.line(ix, AXIS, ix, iy, {
            class: 'optics-image-virtual', stroke: '#0f766e', 'stroke-width': 2.4,
            'stroke-dasharray': '6 5', 'marker-end': 'url(#sim-arrow)'
          });
          s.text(ix, iy - 10, '虚像', { class: 'sim-note', 'text-anchor': 'middle' });
          /* 反向延长线 */
          s.line(L, oy, ix, iy, {
            stroke: '#94a3b8', 'stroke-width': 1.4, 'stroke-dasharray': '6 5'
          });
          s.line(L, AXIS, ix, iy, {
            stroke: '#94a3b8', 'stroke-width': 1.4, 'stroke-dasharray': '6 5'
          });
        }
        s.text(ix, AXIS + (c.real ? -12 : 26), 'v = ' + SL.fmt(Math.abs(c.v), 1) + ' cm', {
          class: 'sim-note', 'text-anchor': 'middle'
        });
      } else {
        s.text(848, 132, '像距 v = ' + SL.fmt(Math.abs(c.v), 1) + ' cm', {
          class: 'sim-note', 'text-anchor': 'end'
        });
        s.text(848, 154, '像已超出光具座范围', { class: 'sim-note', 'text-anchor': 'end' });
      }
    }

    /* 状态徽标 */
    s.rect(28, 24, 268, 36, { rx: 18, fill: '#0f766e', opacity: 0.12 });
    s.circle(48, 42, 6, { fill: '#0f766e' });
    s.text(62, 47, c.nature, { class: 'thermo-badge-text', fill: '#0f766e', 'font-weight': 600 });
    s.text(560, 58, 'f = ' + SL.fmt(c.f, 0) + ' cm ｜ u = ' + SL.fmt(c.u, 0) + ' cm', { class: 'sim-note' });
    s.text(560, 82, c.noImage ? 'u = f：折射光线平行射出，不成像' : 'u ' + c.position + ' 时：' + c.nature, { class: 'sim-note' });
  }

  function renderRules(host, values) {
    if (!host) return;
    var cases = [
      { key: 'u>2f', pos: 'u > 2f', text: '倒立、缩小的实像', use: '照相机' },
      { key: 'u=2f', pos: 'u = 2f', text: '倒立、等大的实像', use: '测焦距' },
      { key: 'f<u<2f', pos: 'f < u < 2f', text: '倒立、放大的实像', use: '投影仪' },
      { key: 'u=f', pos: 'u = f', text: '不成像（平行光）', use: '—' },
      { key: 'u<f', pos: 'u < f', text: '正立、放大的虚像', use: '放大镜' }
    ];
    values = values || {};
    var cur = SL.optics.classify(values.u == null ? 30 : values.u, values.focal == null ? 10 : values.focal, null);
    host.innerHTML = '<div class="plot-card"><div class="plot-head"><span>凸透镜成像规律</span><em>当前：' +
      cur.position + '</em></div><table class="lens-rule-table">' +
      '<thead><tr><th>物距</th><th>像的性质</th><th>应用</th></tr></thead><tbody>' +
      cases.map(function (c) {
        return '<tr class="' + (c.key === cur.key ? 'active' : '') + '"><td>' + c.pos + '</td><td>' + c.text + '</td><td>' + c.use + '</td></tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  SL.labs['optics-lens'] = {
    id: 'optics-lens',
    kind: 'sim',
    meta: meta,
    canvas: { w: 900, h: 520 },
    controls: [
      {
        key: 'focal', label: '凸透镜焦距 f', type: 'range',
        min: 5, max: 20, step: 1, unit: 'cm', digits: 0,
        note: '焦距由透镜本身决定，换透镜才会改变'
      },
      {
        key: 'u', label: '物距 u', type: 'range',
        min: 5, max: 60, step: 1, unit: 'cm', digits: 0,
        note: '比较 u 与 f、2f 的大小关系'
      },
      {
        key: 'height', label: '物体高度', type: 'range',
        min: 2, max: 10, step: 1, unit: 'cm', digits: 0
      }
    ],
    defaults: { focal: 10, u: 30, height: 4 },
    rt: null,

    calc: function (values) { return SL.optics.lens(values); },
    draw: draw,

    readouts: function (c) {
      return [
        { label: '焦距 f', value: c.f, unit: 'cm', digits: 0 },
        { label: '物距 u', value: c.u, unit: 'cm', digits: 0 },
        { label: '像距 v', text: c.noImage ? '不成像' : SL.fmt(Math.abs(c.v), 1) + ' cm', accent: true },
        { label: '放大率 |v/u|', text: c.noImage ? '—' : SL.fmt(c.m, 2) },
        { label: '像的性质', text: c.nature },
        { label: '像的正倒', text: c.noImage ? '—' : (c.upright ? '正立' : '倒立') }
      ];
    },

    warnings: function (c) {
      if (c.noImage) return [{ type: 'state', message: 'u = f：折射光线平行射出，光屏上得不到像' }];
      if (!c.real) return [{ type: 'state', message: 'u < f：成正立、放大的虚像，虚像不能用光屏承接' }];
      if (Math.abs(c.v) > 60) return [{ type: 'state', message: '像距很大，需要把光屏移到较远的位置' }];
      return [];
    },

    measure: function (ctx) {
      var c = ctx.calc;
      return {
        group: ctx.rows.length + 1,
        focal: c.f,
        u: c.u,
        v: c.noImage ? '—' : Number(Math.abs(c.v).toFixed(1)),
        magnification: c.noImage ? '—' : Number(c.m.toFixed(2)),
        imageNature: c.nature
      };
    },

    renderExtra: function (host, rows, values) { renderRules(host, values); },

    animated: false,

    onReset: function () {}
  };

  if (meta.steps && meta.steps.length) {
    meta.steps[0].check = function (ctx) {
      return ctx.rows.some(function (r) {
        return Number(r.u) > 2 * Number(r.focal) && parseFloat(r.magnification) < 1;
      });
    };
    meta.steps[1].check = function (ctx) {
      return ctx.rows.some(function (r) {
        return Number(r.u) > Number(r.focal) && Number(r.u) < 2 * Number(r.focal);
      });
    };
    meta.steps[2].check = function (ctx) {
      return ctx.rows.some(function (r) {
        return Number(r.u) < Number(r.focal) && String(r.imageNature).indexOf('虚像') >= 0;
      });
    };
    meta.steps[3].check = function (ctx) {
      return ctx.state.allAnswered;
    };
  }
})();
