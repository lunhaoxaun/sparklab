/* 化学实验一：氧气的实验室制取与性质 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['chem-oxygen'];
  var rt = { vol: 0, bubbles: [] };

  function resetRt() { rt.vol = 0; rt.bubbles = []; }

  /* ---------- 发生装置：固液常温型 ---------- */
  function drawSolidLiquid(stage, c, t) {
    /* 铁架台 */
    stage.rect(70, 460, 130, 12, { rx: 4, class: 'stand-base' });
    stage.line(96, 460, 96, 150, { class: 'stand-pole' });
    stage.line(96, 250, 130, 250, { class: 'stand-pole' });

    /* 锥形瓶 */
    stage.path('M196 300 L196 250 L264 250 L264 300 L300 452 Q302 462 292 462 L168 462 Q158 462 160 452 Z',
      { class: 'chem-flask' });
    /* 瓶内液体（过氧化氢溶液） */
    var liq = 400 - Math.min(28, rt.vol * 0.02);
    stage.path('M172 ' + liq + ' L288 ' + liq + ' L300 452 Q302 462 292 462 L168 462 Q158 462 160 452 Z',
      { class: 'chem-liquid', fill: '#cfe3f2' });
    if (c.speed > 3) {
      for (var i = 0; i < 5; i++) {
        var bx = 190 + i * 22 + Math.sin(t * 2 + i) * 3;
        var by = 440 - ((t * 60 + i * 37) % 70);
        stage.circle(bx, by, 2 + (i % 3), { class: 'chem-bubble' });
      }
    }
    /* 双孔橡皮塞 + 分液漏斗 + 导管 */
    stage.rect(194, 240, 72, 12, { rx: 3, class: 'chem-stopper' });
    /* 分液漏斗：上粗下细的梨形，下端带活塞 */
    stage.path('M206 150 L250 150 L250 190 Q250 205 234 211 L234 262 L222 262 L222 211 Q206 205 206 190 Z',
      { class: 'chem-funnel' });
    stage.rect(206, 138, 44, 14, { rx: 4, class: 'chem-stopper' });
    stage.circle(228, 230, 7, { class: 'chem-valve' });
    /* 导管：瓶口 → 上方 → 右侧 → 绕到集气瓶口下方 */
    stage.path('M258 246 L258 112 L470 112 L470 442 L634 442 L634 414', { class: 'chem-tube' });
    stage.text(140, 320, '过氧化氢溶液', { class: 'sim-note', 'text-anchor': 'middle' });
    stage.text(228, 128, '分液漏斗', { class: 'sim-note', 'text-anchor': 'middle' });
  }

  /* ---------- 发生装置：固体加热型 ---------- */
  function drawSolidHeat(stage, c, t) {
    stage.rect(70, 460, 130, 12, { rx: 4, class: 'stand-base' });
    stage.line(96, 460, 96, 170, { class: 'stand-pole' });
    stage.line(96, 300, 140, 300, { class: 'stand-pole' });

    /* 试管（口略向下倾斜） */
    stage.path('M144 300 L276 262 Q292 258 296 272 L296 288 Q292 300 276 298 L144 336 Q132 338 132 320 Q130 306 144 300 Z',
      { class: 'chem-flask' });
    /* 固体药品 */
    stage.path('M150 314 L240 288 L246 300 L156 326 Z', { class: 'chem-solid', fill: '#8e6ec8' });
    /* 棉花 */
    stage.circle(252, 280, 7, { class: 'chem-cotton' });
    stage.circle(266, 277, 6, { class: 'chem-cotton' });

    /* 酒精灯 */
    stage.path('M168 462 L172 420 Q198 412 224 420 L228 462 Z', { class: 'chem-lamp' });
    stage.rect(190, 404, 14, 14, { rx: 3, class: 'chem-lamp-cap' });
    var lit = !!c.heat;
    if (lit) {
      var sway = Math.sin(t * 5) * 2;
      stage.path('M197 402 Q' + (186 + sway) + ' 380 197 356 Q' + (208 + sway) + ' 380 197 402 Z', { class: 'chem-flame' });
      stage.path('M197 398 Q192 384 197 370 Q202 384 197 398 Z', { class: 'chem-flame-inner' });
    }
    stage.text(198, 480, lit ? '酒精灯（加热中）' : '酒精灯（未点燃）', { class: 'sim-note', 'text-anchor': 'middle' });
    stage.text(200, 246, '高锰酸钾 / 氯酸钾', { class: 'sim-note', 'text-anchor': 'middle' });
    /* 导管 */
    stage.path('M296 280 L380 280 L380 112 L470 112 L470 442 L634 442 L634 414', { class: 'chem-tube' });
  }

  /* ---------- 水槽与集气瓶 ---------- */
  function drawCollect(stage, c) {
    var TROUGH = { x: 424, y: 330, w: 440, h: 140 };
    stage.rect(TROUGH.x, TROUGH.y, TROUGH.w, TROUGH.h, { rx: 8, class: 'chem-trough' });
    stage.rect(TROUGH.x + 5, TROUGH.y + 26, TROUGH.w - 10, TROUGH.h - 32, { rx: 6, class: 'chem-water' });
    stage.line(TROUGH.x + 5, TROUGH.y + 26, TROUGH.x + TROUGH.w - 5, TROUGH.y + 26, { class: 'chem-surface' });
    stage.text(TROUGH.x + TROUGH.w / 2, TROUGH.y + TROUGH.h + 22, '水槽（排水法收集）', { class: 'sim-note', 'text-anchor': 'middle' });

    var BX = 566, BW = 138, TOP = 148, BOTTOM = 420;
    var upright = c.full || (c.test && c.test !== 'none');

    if (!upright) {
      /* 倒扣：瓶口朝下浸在水里，气体从顶部积起来把水压下去 */
      stage.rect(BX, TOP, BW, BOTTOM - TOP, { rx: 10, class: 'chem-jar' });
      var level = TOP + c.filled * (BOTTOM - TOP - 6);
      stage.rect(BX + 4, level, BW - 8, BOTTOM - level - 4, { rx: 6, class: 'chem-water' });
      stage.line(BX + 4, level, BX + BW - 4, level, { class: 'chem-surface' });
      /* 气泡从瓶口升到气液界面 */
      if (c.speed > 0 && c.filled < 1) {
        for (var i = 0; i < 6; i++) {
          var by = BOTTOM - 6 - ((performanceNow() * 0.055 + i * 46) % Math.max(30, BOTTOM - level - 10));
          stage.circle(BX + 30 + i * 16, by, 2.4 + (i % 3) * 0.8, { class: 'chem-bubble' });
        }
      }
      stage.text(BX + BW / 2, TOP - 12, '集气瓶（倒扣）', { class: 'sim-note', 'text-anchor': 'middle' });
    } else {
      /* 正放在桌面上，做性质检验 */
      stage.rect(BX, 236, BW, 224, { rx: 10, class: 'chem-jar' });
      stage.rect(BX + 4, 400, BW - 8, 56, { rx: 6, class: 'chem-water' });
      stage.line(BX + 4, 400, BX + BW - 4, 400, { class: 'chem-surface' });
      stage.line(BX, 236, BX + BW, 236, { class: 'chem-rim' });
      stage.text(BX + BW / 2, 226, '集气瓶（正放检验）', { class: 'sim-note', 'text-anchor': 'middle' });

      if (c.test === 'ember') {
        stage.line(BX + BW / 2, 130, BX + BW / 2, 300, { class: 'chem-stick' });
        if (c.vol >= 60) {
          stage.path('M' + (BX + BW / 2 - 12) + ' 300 Q' + (BX + BW / 2) + ' 268 ' + (BX + BW / 2 + 12) + ' 300 Q' + (BX + BW / 2) + ' 316 ' + (BX + BW / 2 - 12) + ' 300 Z',
            { class: 'chem-flame' });
          stage.text(BX + BW + 12, 292, '木条复燃', { class: 'chem-tag-ok', 'text-anchor': 'start' });
        } else {
          stage.text(BX + BW + 12, 292, '无明显变化', { class: 'sim-note', 'text-anchor': 'start' });
        }
        stage.text(BX + BW / 2, 118, '带火星的木条', { class: 'sim-note', 'text-anchor': 'middle' });
      } else if (c.test === 'sulfur') {
        stage.line(BX + BW / 2, 150, BX + BW / 2, 330, { class: 'chem-stick' });
        stage.circle(BX + BW / 2, 336, 9, { class: 'chem-spoon' });
        if (c.vol >= 60) {
          stage.path('M' + (BX + BW / 2) + ' 336 Q' + (BX + BW / 2 - 22) + ' 300 ' + (BX + BW / 2) + ' 262 Q' + (BX + BW / 2 + 22) + ' 300 ' + (BX + BW / 2) + ' 336 Z',
            { class: 'chem-flame-sulfur' });
          stage.text(BX + BW + 12, 300, '明亮的蓝紫色火焰', { class: 'chem-tag-ok', 'text-anchor': 'start' });
        } else {
          stage.text(BX + BW + 12, 300, '无明显变化', { class: 'sim-note', 'text-anchor': 'start' });
        }
        stage.text(BX + BW / 2, 138, '燃烧匙中的硫', { class: 'sim-note', 'text-anchor': 'middle' });
      }
    }
    /* 收集进度 */
    var barX = 736, barY = 164, barH = 152;
    stage.rect(barX, barY, 14, barH, { rx: 7, class: 'chem-track' });
    stage.rect(barX, barY + barH * (1 - c.filled), 14, barH * c.filled, { rx: 7, class: 'chem-track-fill' });
    stage.text(barX + 7, barY - 10, SL.fmt(c.vol, 0), { class: 'chem-tag-ok', 'text-anchor': 'middle' });
    stage.text(barX + 7, barY + barH + 22, 'mL', { class: 'sim-note', 'text-anchor': 'middle' });
  }

  var now = 0;
  function performanceNow() { return now; }

  function draw(ctx) {
    var stage = ctx.stage;
    var c = ctx.calc;
    var t = ctx.clock && ctx.clock.t ? ctx.clock.t : 0;
    now = t * 1000;
    stage.clear();

    stage.line(40, 476, 880, 476, { class: 'floor-line' });
    if (c.device === 'solid-heat') drawSolidHeat(stage, c, t);
    else drawSolidLiquid(stage, c, t);
    drawCollect(stage, c);

    /* 方程式条 */
    stage.rect(40, 28, 470, 42, { rx: 10, class: 'sim-badge ' + (c.reacts ? 'bal-ok' : 'bal-no') });
    stage.text(56, 55, c.equation, { class: 'sim-badge-text ' + (c.reacts ? 'bal-ok' : 'bal-no') });

    var tip = c.reacts
      ? '产气速率 ' + SL.fmt(c.speed, 1) + ' mL/s'
      : (c.device === 'solid-heat' ? '还没有加热，固体不分解' : '没有加二氧化锰，反应很慢');
    stage.text(40, 90, tip, { class: 'sim-note', 'text-anchor': 'start' });
  }

  function onTick(dt, ctx) {
    var c = ctx.calc;
    if (!c.reacts) return;
    rt.vol = Math.min(SL.chem.BOTTLE_ML, rt.vol + c.speed * dt);
    if (rt.vol >= SL.chem.BOTTLE_ML) {
      rt.vol = SL.chem.BOTTLE_ML;
      if (ctx.clock) ctx.clock.stop();
    }
  }

  var steps = [
    { need: function (c) { return c.reacts; } },
    { need: function (c) { return c.vol >= 60; } },
    { need: function (c) { return c.full; } },
    { need: function (c, v) { return v.test && v.test !== 'none' && c.vol >= 60; } },
    { need: function (c, v, ctx) { return !!ctx.state.allAnswered; } }
  ];
  meta.steps.forEach(function (step, i) {
    step.check = function (ctx) { return steps[i].need(ctx.calc, ctx.values, ctx); };
  });

  SL.labs['chem-oxygen'] = {
    id: 'chem-oxygen',
    kind: 'sim',
    meta: meta,
    rt: rt,
    reset: resetRt,
    canvas: { w: 900, h: 520 },
    animated: true,
    controls: [
      { key: 'reagent', label: '制取药品', type: 'buttons', options: [
        { value: 'h2o2', label: '过氧化氢' }, { value: 'kmno4', label: '高锰酸钾' }, { value: 'kclo3', label: '氯酸钾' }
      ], note: '三种药品的装置与反应不同' },
      { key: 'catalyst', label: '加二氧化锰（催化剂）', type: 'toggle' },
      { key: 'heat', label: '点燃酒精灯加热', type: 'toggle' },
      { key: 'test', label: '性质检验', type: 'buttons', options: [
        { value: 'none', label: '未检验' }, { value: 'ember', label: '带火星木条' }, { value: 'sulfur', label: '燃烧的硫' }
      ], note: '收集到 60 mL 以上再检验效果才明显' }
    ],
    defaults: { reagent: 'h2o2', catalyst: true, heat: false, test: 'none' },
    calc: function (values) {
      var c = SL.chem.oxygen(values, rt);
      c.heat = !!values.heat;
      return c;
    },
    onTick: onTick,
    onReset: resetRt,
    draw: draw,
    readouts: function (c) {
      return [
        { label: '产气速率', value: c.speed, unit: 'mL/s', digits: 1, accent: true },
        { label: '已收集 O₂', value: c.vol, unit: 'mL', digits: 0 },
        { label: '集气瓶容量', value: c.capacity, unit: 'mL', digits: 0, note: '集满后可做性质检验' },
        { label: '收集纯度', value: c.purity, unit: '%', digits: 0, note: '排水法收集' },
        { label: '是否集满', text: c.full ? '已集满' : '未集满' },
        { label: '木条现象', text: c.ember }
      ];
    },
    warnings: function (c) {
      var list = [];
      if (!c.reacts) {
        list.push({ type: 'state', message: c.device === 'solid-heat'
          ? '这种药品需要加热才能分解，先点燃酒精灯' : '不加二氧化锰时过氧化氢分解很慢' });
      }
      if (c.vol >= c.capacity) list.push({ type: 'state', message: '集气瓶已集满，把导管移出水面再停止加热（防止倒吸）' });
      return list;
    },
    measure: function (ctx) {
      var c = ctx.calc;
      if (!c.reacts) {
        SL.toast('现在还没有氧气产生，先把反应条件调好', 'warn');
        return null;
      }
      if (c.vol < 1) {
        SL.toast('先点「播放」收集一会儿氧气再记录', 'warn');
        return null;
      }
      return {
        group: ctx.rows.length + 1,
        reagent: c.label,
        speed: SL.chem.round(c.speed, 1),
        vol: SL.chem.round(c.vol, 0),
        purity: c.purity,
        full: c.full ? '是' : '否',
        test: c.test === 'ember' ? '带火星木条' : c.test === 'sulfur' ? '燃烧的硫' : '未检验',
        phenomenon: c.test === 'ember' ? c.ember : c.test === 'sulfur' ? c.sulfur : '—'
      };
    },
    renderExtra: function (host, rows) {
      if (!host) return;
      var valid = rows.filter(function (r) { return r.vol != null; });
      if (!valid.length) {
        host.innerHTML = '<div class="chart-empty">' + SL.icon('chart-line', '', 20) +
          '<span>记录几组不同药品的数据，这里会对比产气速率</span></div>';
        return;
      }
      var plot = SL.sim.Plot(host, {
        w: 340, h: 200, xLabel: '组次', yLabel: '速率 /(mL·s⁻¹)',
        xMin: 0, yMin: 0,
        foot: function () { return '催化剂只改变速率，不改变生成氧气的总量'; }
      });
      plot.setSeries([{
        name: '产气速率', color: '#0d8f6f',
        points: valid.map(function (r, i) { return { x: i + 1, y: Number(r.speed) }; }),
        type: 'dots'
      }]);
    }
  };
})();
