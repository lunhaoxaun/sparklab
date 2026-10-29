/* 实验四：探究杠杆的平衡条件 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['lever'];
  var PX = 450, PY = 250, STEP = 54, MAXARM = 5, BAR_Y = 244;

  var rt = { angle: 0, target: 0, raf: null, group: null, log: [], dragSide: null };

  function resetRt() {
    if (rt.raf) window.cancelAnimationFrame(rt.raf);
    rt.raf = null;
    rt.angle = 0;
    rt.target = 0;
    rt.group = null;
    rt.log = [];
    rt.dragSide = null;
  }

  function px(arm, side) { return PX + (side === 'left' ? -arm : arm) * STEP; }

  function rotatePoint(x, y, deg) {
    var a = deg * Math.PI / 180;
    var dx = x - PX, dy = y - PY;
    return { x: PX + dx * Math.cos(a) - dy * Math.sin(a), y: PY + dx * Math.sin(a) + dy * Math.cos(a) };
  }

  function unrotate(x, y, deg) {
    var a = -deg * Math.PI / 180;
    var dx = x - PX, dy = y - PY;
    return { x: PX + dx * Math.cos(a) - dy * Math.sin(a), y: PY + dx * Math.sin(a) + dy * Math.cos(a) };
  }

  function applyAngle() {
    if (rt.group) rt.group.setAttribute('transform', 'rotate(' + rt.angle.toFixed(2) + ' ' + PX + ' ' + PY + ')');
  }

  function settle() {
    var diff = rt.target - rt.angle;
    if (Math.abs(diff) < 0.25) {
      rt.angle = rt.target;
      applyAngle();
      rt.raf = null;
      return;
    }
    rt.angle += diff * 0.25;
    applyAngle();
    rt.raf = window.requestAnimationFrame(settle);
  }

  function drawHook(parent, x, count, side) {
    var top = BAR_Y + 15;
    parent.appendChild(SL.sim.svgEl('line', { class: 'lever-wire', x1: x, y1: BAR_Y + 8, x2: x, y2: top }));
    for (var i = 0; i < count; i++) {
      var y = top + i * 21;
      parent.appendChild(SL.sim.svgEl('rect', {
        class: 'hook-block' + (side === 'left' ? ' hook-left' : ''),
        x: x - 17, y: y, width: 34, height: 19, rx: 4
      }));
      parent.appendChild(SL.sim.svgEl('line', { class: 'hook-notch', x1: x - 6, y1: y + 5, x2: x + 6, y2: y + 5 }));
    }
    return top + count * 21;
  }

  function drawArm(parent, side, arm, colorClass) {
    var x = px(arm, side);
    var y = BAR_Y - 26;
    parent.appendChild(SL.sim.svgEl('line', { class: 'arm-guide ' + colorClass, x1: PX, y1: y, x2: x, y2: y }));
    parent.appendChild(SL.sim.svgEl('line', { class: 'arm-cap ' + colorClass, x1: PX, y1: y - 5, x2: PX, y2: y + 5 }));
    parent.appendChild(SL.sim.svgEl('line', { class: 'arm-cap ' + colorClass, x1: x, y1: y - 5, x2: x, y2: y + 5 }));
    parent.appendChild(SL.sim.svgEl('text', {
      class: 'arm-label ' + colorClass, x: (PX + x) / 2, y: y - 7, 'text-anchor': 'middle'
    })).textContent = 'L=' + arm * 5 + 'cm';
  }

  function draw(ctx) {
    var stage = ctx.stage;
    var v = ctx.values;
    var c = ctx.calc;

    rt.target = c.angle;
    stage.clear();

    /* 桌面 */
    stage.line(60, 470, 840, 470, { class: 'floor-line' });

    /* 支架 */
    stage.poly(PX + ',' + (PY + 16) + ' ' + (PX - 34) + ',470 ' + (PX + 34) + ',470', { class: 'stand-body' });
    stage.rect(PX - 62, 468, 124, 11, { rx: 4, class: 'stand-base' });
    stage.line(PX, 300, PX, 468, { class: 'stand-pole' });

    /* 水平参考线 */
    stage.line(120, PY, 860, PY, { class: 'level-guide' });
    stage.text(854, PY - 12, '水平参考线', { class: 'level-label', 'text-anchor': 'end' });

    var g = stage.g('lever-rotating');
    rt.group = g;

    /* 杠杆本体 */
    g.appendChild(SL.sim.svgEl('rect', { class: 'lever-bar', x: PX - MAXARM * STEP - 16, y: BAR_Y, width: MAXARM * STEP * 2 + 32, height: 14, rx: 7 }));
    g.appendChild(SL.sim.svgEl('rect', { class: 'lever-bar-inner', x: PX - MAXARM * STEP - 16, y: BAR_Y + 4, width: MAXARM * STEP * 2 + 32, height: 3 }));

    /* 刻度 */
    for (var i = -MAXARM; i <= MAXARM; i++) {
      var x = PX + i * STEP;
      var major = i !== 0;
      g.appendChild(SL.sim.svgEl('line', {
        class: 'lever-tick', x1: x, y1: BAR_Y, x2: x, y2: BAR_Y - (major ? 9 : 0)
      }));
      if (major) {
        var t = SL.sim.svgEl('text', { class: 'lever-num', x: x, y: BAR_Y - 13, 'text-anchor': 'middle' });
        t.textContent = Math.abs(i);
        g.appendChild(t);
      }
    }

    /* 支点 */
    g.appendChild(SL.sim.svgEl('circle', { class: 'pivot', cx: PX, cy: PY + 7, r: 8 }));
    g.appendChild(SL.sim.svgEl('circle', { class: 'pivot-dot', cx: PX, cy: PY + 7, r: 3 }));

    /* 力臂标注 */
    drawArm(g, 'left', v.leftArm, 'arm-left');
    drawArm(g, 'right', v.rightArm, 'arm-right');

    /* 钩码 */
    var leftX = px(v.leftArm, 'left');
    var rightX = px(v.rightArm, 'right');
    var leftBottom = drawHook(g, leftX, v.leftCount, 'left');
    var rightBottom = drawHook(g, rightX, v.rightCount, 'right');

    /* 力的示意箭头（向下） */
    g.appendChild(SL.sim.svgEl('line', {
      class: 'force-arrow force-left', x1: leftX, y1: leftBottom + 4, x2: leftX, y2: leftBottom + 34,
      'marker-end': 'url(#sim-arrow-solid)'
    }));
    g.appendChild(SL.sim.svgEl('line', {
      class: 'force-arrow force-right', x1: rightX, y1: rightBottom + 4, x2: rightX, y2: rightBottom + 34,
      'marker-end': 'url(#sim-arrow-solid)'
    }));
    var fl = SL.sim.svgEl('text', { class: 'force-label', x: leftX + 6, y: leftBottom + 26 });
    fl.textContent = 'F₁ = ' + SL.fmt(c.f1, 1) + ' N';
    g.appendChild(fl);
    var fr = SL.sim.svgEl('text', { class: 'force-label', x: rightX + 6, y: rightBottom + 26 });
    fr.textContent = 'F₂ = ' + SL.fmt(c.f2, 1) + ' N';
    g.appendChild(fr);

    /* 拖动提示 */
    g.appendChild(SL.sim.svgEl('circle', { class: 'drag-ring', cx: leftX, cy: BAR_Y + 26, r: 22 }));
    g.appendChild(SL.sim.svgEl('circle', { class: 'drag-ring', cx: rightX, cy: BAR_Y + 26, r: 22 }));

    applyAngle();
    if (rt.raf == null && Math.abs(rt.target - rt.angle) > 0.25) rt.raf = window.requestAnimationFrame(settle);

    /* 状态徽标 */
    var badge = c.balanced
      ? { cls: 'bal-ok', text: '杠杆水平平衡　F₁L₁ = F₂L₂ = ' + SL.fmt(c.m1, 1) + ' N·cm' }
      : { cls: 'bal-no', text: (c.m1 > c.m2 ? '左端下沉' : '右端下沉') + '　力矩差 ' + SL.fmt(Math.abs(c.diff), 1) + ' N·cm' };
    var bg = stage.rect(24, 24, 380, 40, { rx: 10, class: 'sim-badge ' + badge.cls });
    bg.setAttribute('fill-opacity', '1');
    stage.text(44, 49, badge.text, { class: 'sim-badge-text ' + badge.cls });

    if (c.balanced) {
      var key = [v.leftCount, v.leftArm, v.rightCount, v.rightArm].join('-');
      if (rt.log.indexOf(key) === -1) rt.log.push(key);
    }
  }

  /* 指针拖动：命中钩码所在格点即可左右移动 */
  function bindDrag(ctx) {
    var stage = ctx.stage;
    var dragging = null;

    stage.svg.style.touchAction = 'none';
    stage.svg.addEventListener('pointerdown', function (evt) {
      var p = stage.toWorld(evt);
      var leftP = rotatePoint(px(ctx.values.leftArm, 'left'), BAR_Y + 26, rt.angle);
      var rightP = rotatePoint(px(ctx.values.rightArm, 'right'), BAR_Y + 26, rt.angle);
      var dl = Math.hypot(p.x - leftP.x, p.y - leftP.y);
      var dr = Math.hypot(p.x - rightP.x, p.y - rightP.y);
      if (Math.min(dl, dr) > 34) return;
      dragging = dl <= dr ? 'left' : 'right';
      stage.svg.setPointerCapture && stage.svg.setPointerCapture(evt.pointerId);
      evt.preventDefault();
    });

    stage.svg.addEventListener('pointermove', function (evt) {
      if (!dragging) return;
      var p = stage.toWorld(evt);
      var q = unrotate(p.x, p.y, rt.angle);
      var arm = SL.mech.clamp(Math.round(Math.abs(q.x - PX) / STEP), 1, MAXARM);
      var key = dragging === 'left' ? 'leftArm' : 'rightArm';
      if (ctx.values[key] !== arm) ctx.set(key, arm);
      evt.preventDefault();
    });

    function end() { dragging = null; }
    stage.svg.addEventListener('pointerup', end);
    stage.svg.addEventListener('pointercancel', end);
  }

  var checks = [
    function (ctx) { return ctx.calc.balanced; },
    function () { return rt.log.length >= 2; },
    function (ctx) {
      return ctx.rows.filter(function (r) { return r.state === '平衡'; }).length >= 3;
    },
    function (ctx) { return !!ctx.state.allAnswered; }
  ];
  meta.steps.forEach(function (step, index) { step.check = checks[index]; });

  SL.labs['lever'] = {
    id: 'lever',
    kind: 'sim',
    meta: meta,
    rt: rt,
    reset: resetRt,
    canvas: { w: 900, h: 520 },
    controls: [
      { key: 'leftCount', label: '左侧钩码个数', type: 'range', min: 1, max: 4, step: 1, unit: '个' },
      { key: 'leftArm', label: '左侧悬挂位置', type: 'range', min: 1, max: 5, step: 1, unit: '格', note: '每格 5 cm，也可直接拖动钩码' },
      { key: 'rightCount', label: '右侧钩码个数', type: 'range', min: 1, max: 4, step: 1, unit: '个' },
      { key: 'rightArm', label: '右侧悬挂位置', type: 'range', min: 1, max: 5, step: 1, unit: '格', note: '左右力矩相等时杠杆水平平衡' }
    ],
    defaults: { leftCount: 2, leftArm: 3, rightCount: 3, rightArm: 2, hookMass: 50 },
    calc: function (values) { return SL.mech.lever(values); },
    setup: function (ctx) { bindDrag(ctx); },
    draw: draw,
    readouts: function (c) {
      return [
        { label: '左端拉力 F₁', value: c.f1, unit: 'N', digits: 1 },
        { label: '左力臂 L₁', value: c.l1 * 5, unit: 'cm', digits: 0 },
        { label: '左力矩 F₁L₁', value: c.m1, unit: 'N·cm', digits: 1, accent: true },
        { label: '右端拉力 F₂', value: c.f2, unit: 'N', digits: 1 },
        { label: '右力臂 L₂', value: c.l2 * 5, unit: 'cm', digits: 0 },
        { label: '右力矩 F₂L₂', value: c.m2, unit: 'N·cm', digits: 1, accent: true }
      ];
    },
    warnings: function (c) {
      if (c.balanced) return [];
      return [{
        type: 'state',
        message: '杠杆不平衡：' + SL.fmt(c.m1, 1) + ' N·cm ' + (c.m1 > c.m2 ? '>' : '<') + ' ' + SL.fmt(c.m2, 1) + ' N·cm'
      }];
    },
    measure: function (ctx) {
      var c = ctx.calc;
      var v = ctx.values;
      return {
        group: ctx.rows.length + 1,
        leftCount: v.leftCount,
        leftArm: v.leftArm * 5,
        leftTorque: Number(c.m1.toFixed(1)),
        rightCount: v.rightCount,
        rightArm: v.rightArm * 5,
        rightTorque: Number(c.m2.toFixed(1)),
        state: c.balanced ? '平衡' : '不平衡'
      };
    },
    renderExtra: function (host, rows) {
      if (!host) return;
      var balanced = rows.filter(function (r) { return r.state === '平衡'; });
      host.innerHTML = '<div class="plot-card"><div class="plot-head"><span>F₁L₁ 与 F₂L₂ 对照</span>' +
        '<em>' + balanced.length + ' 组平衡数据</em></div>' +
        (balanced.length
          ? '<div class="torque-pairs">' + balanced.map(function (r) {
            return '<div class="torque-row"><span>' + r.leftCount + ' 个 × ' + r.leftArm + ' cm = <b>' + SL.fmt(r.leftTorque, 1) + '</b></span>' +
              '<i>≈</i><span>' + r.rightCount + ' 个 × ' + r.rightArm + ' cm = <b>' + SL.fmt(r.rightTorque, 1) + '</b></span></div>';
          }).join('') + '</div>'
          : '<div class="chart-empty">' + SL.icon('chart-line', '', 20) + '<span>把杠杆调平后记录数据，这里会显示力矩对照</span></div>') +
        '</div>';
    }
  };
})();
