/* 实验五：测量滑轮组的机械效率 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['pulley'];
  var CX = 520, BEAM_Y = 74, GROUND = 470, PX_PER_M = 320;
  var rt = { lift: 0, dragging: false };

  function resetRt() { rt.lift = 0; rt.dragging = false; }

  function ropeXs(n) {
    var gap = 46;
    var list = [];
    for (var i = 0; i < n; i++) list.push(CX + (i - (n - 1) / 2) * gap);
    return list;
  }

  function draw(ctx) {
    var stage = ctx.stage;
    var v = ctx.values;
    var c = ctx.calc;
    var n = c.n;
    var xs = ropeXs(n);
    var rise = (rt.lift / (v.h || 1)) * (v.h * PX_PER_M);
    var blockY = 330 - rise;
    var tailDown = 210 + rise;

    stage.clear();

    /* 地面 */
    stage.line(60, GROUND, 860, GROUND, { class: 'floor-line' });

    /* 横梁 */
    stage.rect(CX - 160, BEAM_Y, 320, 15, { rx: 4, class: 'pulley-beam' });
    for (var hx = CX - 150; hx <= CX + 150; hx += 26) {
      stage.line(hx, BEAM_Y, hx - 12, BEAM_Y - 12, { class: 'pulley-hatch' });
    }
    stage.text(CX - 154, BEAM_Y + 22, '横梁（固定）', { class: 'sim-note', 'text-anchor': 'start' });

    /* 每个绳段：定滑轮 + 竖直绳 */
    xs.forEach(function (x, i) {
      stage.circle(x, BEAM_Y - 2, 15, { class: 'pulley-wheel' });
      stage.circle(x, BEAM_Y - 2, 4, { class: 'pulley-axle' });
      stage.line(x, BEAM_Y + 12, x, blockY, { class: 'rope' });
      if (i === 0) stage.text(x - 6, BEAM_Y + 34, '固定端', { class: 'sim-note', 'text-anchor': 'end' });
    });

    /* 拉力端：从最右定滑轮向下到手 */
    var tailX = xs[xs.length - 1] + 118;
    stage.path('M ' + xs[xs.length - 1] + ' ' + (BEAM_Y - 2) + ' L ' + tailX + ' ' + (BEAM_Y - 2) + ' L ' + tailX + ' ' + (120 + tailDown * 0.45),
      { class: 'rope rope-tail' });
    stage.circle(tailX, 120 + tailDown * 0.45 + 8, 9, { class: 'hand-grip' });
    stage.text(tailX + 18, 120 + tailDown * 0.45 + 12, '竖直向下匀速拉', { class: 'sim-note', 'text-anchor': 'start' });

    /* 动滑轮 */
    stage.rect(CX - 30, blockY - 34, 60, 44, { rx: 10, class: 'pulley-moving' });
    stage.circle(CX, blockY - 12, 15, { class: 'pulley-wheel pulley-wheel-moving' });
    stage.circle(CX, blockY - 12, 4, { class: 'pulley-axle' });
    stage.line(CX, blockY + 10, CX, blockY + 22, { class: 'lever-wire' });

    /* 钩码堆 */
    var count = Math.max(1, Math.round(v.loadN / 0.5));
    var blockH = 15;
    var totalH = count * (blockH + 3);
    stage.rect(CX - 22, blockY + 22, 44, totalH + 6, { rx: 4, class: 'load-box' });
    for (var i = 0; i < count; i++) {
      stage.line(CX - 22, blockY + 22 + i * (blockH + 3) + blockH, CX + 22, blockY + 22 + i * (blockH + 3) + blockH, { class: 'load-slot' });
    }
    stage.text(CX + 34, blockY + 22 + totalH / 2 + 4, 'G = ' + SL.fmt(v.loadN, 1) + ' N', { class: 'sim-note', 'text-anchor': 'start' });

    /* 已提升高度标注 */
    if (rise > 1) {
      var gx = CX - 96;
      stage.line(gx, 330, gx, blockY, { class: 'measure-line' });
      stage.line(gx - 5, 330, gx + 5, 330, { class: 'measure-cap' });
      stage.line(gx - 5, blockY, gx + 5, blockY, { class: 'measure-cap' });
      stage.text(gx - 9, (330 + blockY) / 2, 'h = ' + SL.fmt(rt.lift, 2) + ' m', { class: 'measure-label', 'text-anchor': 'end' });
    }

    /* 绳自由端移动距离 */
    if (rise > 1) {
      var sx = tailX + 74;
      stage.line(sx, 120, sx, 120 + rise * n, { class: 'measure-line measure-line-alt' });
      stage.line(sx - 5, 120, sx + 5, 120, { class: 'measure-cap measure-cap-alt' });
      stage.line(sx - 5, 120 + rise * n, sx + 5, 120 + rise * n, { class: 'measure-cap measure-cap-alt' });
      stage.text(sx + 6, 120 + rise * n / 2, 's = ' + SL.fmt(rt.lift * n, 2) + ' m', { class: 'measure-label measure-label-alt', 'text-anchor': 'start' });
    }

    /* 拉力箭头 */
    var arrowY = 120 + tailDown * 0.45;
    stage.line(tailX, arrowY + 40, tailX + 62, arrowY + 40, { class: 'force-arrow', 'marker-end': 'url(#sim-arrow-solid)' });
    stage.text(tailX, arrowY + 66, 'F = ' + SL.fmt(c.F, 2) + ' N', { class: 'force-label', 'text-anchor': 'middle' });

    /* 状态徽标 */
    stage.rect(24, 24, 372, 40, { rx: 10, class: 'sim-badge bal-ok' });
    stage.text(44, 49, n + ' 段绳承担物重　η = W有/W总 = ' + SL.fmt(c.eta, 1) + '%', { class: 'sim-badge-text bal-ok' });
  }

  /* 拖动钩码升降，改变已提升高度 */
  function bindDrag(ctx) {
    var stage = ctx.stage;
    var active = false;
    stage.svg.style.touchAction = 'none';
    stage.svg.addEventListener('pointerdown', function (evt) {
      var p = stage.toWorld(evt);
      var rise = (rt.lift / (ctx.values.h || 1)) * (ctx.values.h * PX_PER_M);
      var cy = 330 - rise + 60;
      if (Math.abs(p.x - CX) < 40 && Math.abs(p.y - cy) < 60) {
        active = true;
        stage.svg.setPointerCapture && stage.svg.setPointerCapture(evt.pointerId);
        evt.preventDefault();
      }
    });
    stage.svg.addEventListener('pointermove', function (evt) {
      if (!active) return;
      var p = stage.toWorld(evt);
      var risePx = SL.mech.clamp(330 - (p.y - 60), 0, ctx.values.h * PX_PER_M);
      rt.lift = (risePx / PX_PER_M);
      ctx.redraw();
      evt.preventDefault();
    });
    function end() { active = false; }
    stage.svg.addEventListener('pointerup', end);
    stage.svg.addEventListener('pointercancel', end);
  }

  var checks = [
    function (ctx) { return ctx.rows.length >= 1; },
    function (ctx) {
      return ctx.rows.filter(function (r) { return Number(r.load) >= 4 && Number(r.segments) === 2; }).length >= 1;
    },
    function (ctx) {
      return ctx.rows.filter(function (r) { return Number(r.segments) === 3; }).length >= 1;
    },
    function (ctx) { return !!ctx.state.allAnswered; }
  ];
  meta.steps.forEach(function (step, index) { step.check = checks[index]; });

  SL.labs['pulley'] = {
    id: 'pulley',
    kind: 'sim',
    meta: meta,
    rt: rt,
    reset: resetRt,
    canvas: { w: 900, h: 520 },
    controls: [
      { key: 'segments', label: '绕法（承担物重的绳段数）', type: 'buttons', options: [
        { value: 2, label: 'n = 2' }, { value: 3, label: 'n = 3' }, { value: 4, label: 'n = 4' }
      ], note: '段数越多越省力，但绳端移动距离也越大' },
      { key: 'loadN', label: '钩码总重 G', type: 'range', min: 0.5, max: 6, step: 0.5, unit: 'N' },
      { key: 'movingN', label: '动滑轮重 G动', type: 'buttons', options: [
        { value: 0.5, label: '0.5 N' }, { value: 1, label: '1.0 N' }
      ] },
      { key: 'h', label: '提升高度 h', type: 'range', min: 0.1, max: 0.5, step: 0.05, unit: 'm', digits: 2 }
    ],
    defaults: { segments: 2, loadN: 2, movingN: 0.5, h: 0.2, friction: 0.04 },
    calc: function (values) { return SL.mech.pulley(values); },
    setup: bindDrag,
    animated: { label: '匀速提升' },
    onTick: function (dt, ctx) {
      rt.lift = Math.min(rt.lift + 0.12 * dt, ctx.values.h);
      if (rt.lift >= ctx.values.h - 1e-6 && ctx.clock) ctx.clock.stop();
    },
    onReset: function () { rt.lift = 0; },
    draw: draw,
    readouts: function (c, v) {
      return [
        { label: '绳端拉力 F', value: c.F, unit: 'N', digits: 2, accent: true },
        { label: '绳端移动 s', value: rt.lift * c.n, unit: 'm', digits: 2, note: 's = n·h' },
        { label: '提升高度 h', value: rt.lift, unit: 'm', digits: 2 },
        { label: '有用功 W有', value: c.load * rt.lift, unit: 'J', digits: 2, note: 'W有 = G·h' },
        { label: '总功 W总', value: c.F * rt.lift * c.n, unit: 'J', digits: 2, note: 'W总 = F·s' },
        { label: '机械效率 η', value: c.eta, unit: '%', digits: 1, accent: true, note: 'W有 / W总' }
      ];
    },
    warnings: function () { return []; },
    measure: function (ctx) {
      var c = ctx.calc;
      var v = ctx.values;
      if (rt.lift < (v.h || 0.1) * 0.9) {
        SL.toast('请先把钩码提升到设定高度，再记录数据', 'warn');
        return null;
      }
      return {
        group: ctx.rows.length + 1,
        segments: c.n,
        load: v.loadN,
        moving: v.movingN,
        h: Number(rt.lift.toFixed(2)),
        force: Number(c.F.toFixed(2)),
        s: Number((rt.lift * c.n).toFixed(2)),
        wUse: Number((c.load * rt.lift).toFixed(2)),
        wTotal: Number((c.F * rt.lift * c.n).toFixed(2)),
        eta: Number(c.eta.toFixed(1))
      };
    },
    renderExtra: function (host, rows) {
      if (!host) return;
      var valid = rows.filter(function (r) { return r.eta != null; });
      if (!valid.length) {
        host.innerHTML = '<div class="chart-empty">' + SL.icon('chart-line', '', 20) + '<span>提升钩码并记录数据后，这里显示机械效率对比</span></div>';
        return;
      }
      var groups = {};
      valid.forEach(function (r) {
        var key = 'n=' + r.segments;
        groups[key] = groups[key] || [];
        groups[key].push(r);
      });
      host.innerHTML = '<div class="plot-card"><div class="plot-head"><span>机械效率对比</span><em>同一绕法看物重影响</em></div>' +
        Object.keys(groups).sort().map(function (key) {
          return '<div class="eta-group"><div class="eta-group-head">' + key + '</div>' +
            groups[key].map(function (r) {
              var w = SL.mech.clamp(r.eta, 0, 100);
              return '<div class="eta-row"><span class="eta-label">G=' + SL.fmt(r.load, 1) + 'N</span>' +
                '<span class="eta-track"><i style="width:' + w + '%"></i></span>' +
                '<span class="eta-value">' + SL.fmt(r.eta, 1) + '%</span></div>';
            }).join('') + '</div>';
        }).join('') + '</div>';
    }
  };
})();
