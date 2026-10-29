/* 生物实验二：观察动、植物细胞的结构 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['bio-cell'];
  var rt = {};

  /* 植物细胞里各结构的位置（画布 900×520，细胞中心约在 350,268） */
  var PLANT = {
    cx: 340, cy: 258, w: 448, h: 330,
    nucleus: { x: 400, y: 224, r: 48 },
    vacuole: { x: 252, y: 292, rx: 104, ry: 82 },
    chloroplast: [
      { x: 220, y: 200, rx: 16, ry: 9 }, { x: 300, y: 176, rx: 15, ry: 8 },
      { x: 452, y: 320, rx: 16, ry: 9 }, { x: 430, y: 168, rx: 13, ry: 8 },
      { x: 200, y: 330, rx: 14, ry: 8 }
    ],
    mito: [
      { x: 480, y: 240, rx: 18, ry: 8, rot: -18 }, { x: 236, y: 246, rx: 17, ry: 8, rot: 24 },
      { x: 352, y: 372, rx: 16, ry: 7, rot: 6 }
    ]
  };

  var ANIMAL = {
    cx: 340, cy: 258, w: 400, h: 310,
    nucleus: { x: 340, y: 250, r: 56 },
    mito: [
      { x: 452, y: 200, rx: 18, ry: 8, rot: -24 }, { x: 240, y: 340, rx: 17, ry: 8, rot: 18 }
    ]
  };

  function pickable(node, key, ctx, label) {
    node.style.cursor = 'pointer';
    node.addEventListener('click', function (evt) {
      evt.stopPropagation();
      ctx.set('picked', key);
    });
    return node;
  }

  function drawLabels(stage, c, geo) {
    var S = SL.bio.STRUCTURES;
    var rows = c.list.map(function (k) { return { key: k, name: S[k].name }; });
    var x = 700, y = 92;
    stage.rect(x - 20, y - 34, 216, rows.length * 30 + 56, { rx: 14, class: 'chem-info-card' });
    stage.text(x - 4, y - 12, c.typeLabel + '的结构', { class: 'chem-info-title', 'text-anchor': 'start' });
    rows.forEach(function (r, i) {
      var yy = y + 16 + i * 30;
      var on = r.key === c.picked;
      if (on) stage.rect(x - 12, yy - 15, 196, 24, { rx: 7, class: 'bio-chip-on' });
      stage.circle(x, yy - 4, 4, { class: 'bio-dot' + (on ? ' is-on' : '') });
      stage.text(x + 14, yy, r.name, { class: on ? 'bio-chip-text-on' : 'chem-info-text', 'text-anchor': 'start' });
    });
  }

  function draw(ctx) {
    var stage = ctx.stage;
    var c = ctx.calc;
    var plant = c.type === 'plant';
    var g = plant ? PLANT : ANIMAL;
    var hi = c.picked;
    stage.clear();

    /* ---- 细胞轮廓 ---- */
    var wallNode, membNode;
    if (plant) {
      wallNode = stage.rect(g.cx - g.w / 2, g.cy - g.h / 2, g.w, g.h, {
        rx: 26, class: 'bio-cell-wall' + (hi === 'wall' ? ' is-on' : '')
      });
      pickable(wallNode, 'wall', ctx);
    }
    var inner = plant ? 12 : 4;
    membNode = stage.rect(g.cx - g.w / 2 + inner, g.cy - g.h / 2 + inner, g.w - inner * 2, g.h - inner * 2, {
      rx: plant ? 20 : 72, class: 'bio-cell-membrane' + (hi === 'membrane' ? ' is-on' : '')
    });
    pickable(membNode, 'membrane', ctx);
    var cyto = stage.rect(g.cx - g.w / 2 + inner + 8, g.cy - g.h / 2 + inner + 8, g.w - inner * 2 - 16, g.h - inner * 2 - 16, {
      rx: plant ? 16 : 64, class: 'bio-cell-cyto' + (hi === 'cytoplasm' ? ' is-on' : '')
    });
    pickable(cyto, 'cytoplasm', ctx);

    /* ---- 液泡 ---- */
    if (plant) {
      var v = g.vacuole;
      var vac = SL.sim.svgEl('ellipse', {
        cx: v.x, cy: v.y, rx: v.rx, ry: v.ry, class: 'bio-vacuole' + (hi === 'vacuole' ? ' is-on' : '')
      });
      stage.layer.appendChild(vac);
      pickable(vac, 'vacuole', ctx);
      stage.text(v.x, v.y + 4, '液泡', { class: 'bio-organelle-label', 'text-anchor': 'middle' });
    }

    /* ---- 叶绿体 ---- */
    if (plant) {
      g.chloroplast.forEach(function (ch) {
        var node = SL.sim.svgEl('ellipse', {
          cx: ch.x, cy: ch.y, rx: ch.rx, ry: ch.ry,
          class: 'bio-chloroplast' + (hi === 'chloroplast' ? ' is-on' : '')
        });
        stage.layer.appendChild(node);
        pickable(node, 'chloroplast', ctx);
      });
    }

    /* ---- 线粒体 ---- */
    g.mito.forEach(function (m) {
      var node = SL.sim.svgEl('ellipse', {
        cx: m.x, cy: m.y, rx: m.rx, ry: m.ry, transform: 'rotate(' + m.rot + ' ' + m.x + ' ' + m.y + ')',
        class: 'bio-mito' + (hi === 'mito' ? ' is-on' : '')
      });
      stage.layer.appendChild(node);
      pickable(node, 'mito', ctx);
    });

    /* ---- 细胞核 ---- */
    var n = g.nucleus;
    var nuc = stage.circle(n.x, n.y, n.r, { class: 'bio-nucleus' + (hi === 'nucleus' ? ' is-on' : '') });
    pickable(nuc, 'nucleus', ctx);
    stage.circle(n.x + n.r * 0.25, n.y - n.r * 0.2, n.r * 0.24, { class: 'bio-nucleolus' });
    stage.text(n.x, n.y + n.r + 18, '细胞核', { class: 'bio-organelle-label', 'text-anchor': 'middle' });

    /* ---- 结构清单 ---- */
    drawLabels(stage, c, g);

    /* ---- 选中结构说明 ---- */
    var info = SL.bio.STRUCTURES[c.picked];
    stage.rect(40, 448, 600, 52, { rx: 12, class: 'chem-info-card' });
    stage.text(56, 470, c.pickedName + (c.available ? '' : '（这个细胞里没有）'), { class: 'chem-info-title', 'text-anchor': 'start' });
    stage.text(56, 490, info.func.length > 46 ? info.func.slice(0, 46) + '…' : info.func, { class: 'sim-note', 'text-anchor': 'start' });
  }

  var steps = [
    { need: function (c) { return c.type === 'plant' && c.picked === 'wall'; } },
    { need: function (c) { return c.picked === 'nucleus'; } },
    { need: function (c) { return c.type === 'animal' && (c.picked === 'membrane' || c.picked === 'cytoplasm'); } },
    { need: function (c, v, ctx) { return !!ctx.state.allAnswered; } }
  ];
  meta.steps.forEach(function (step, i) {
    step.check = function (ctx) { return steps[i].need(ctx.calc, ctx.values, ctx); };
  });

  SL.labs['bio-cell'] = {
    id: 'bio-cell',
    kind: 'sim',
    meta: meta,
    rt: rt,
    reset: function () {},
    canvas: { w: 900, h: 520 },
    controls: [
      { key: 'type', label: '细胞类型', type: 'buttons', options: [
        { value: 'plant', label: '植物细胞' }, { value: 'animal', label: '动物细胞' }
      ] },
      { key: 'picked', label: '选中结构', type: 'buttons', options: Object.keys(SL.bio.STRUCTURES).map(function (k) {
        return { value: k, label: SL.bio.STRUCTURES[k].name };
      }), note: '也可以直接点画面里的结构' }
    ],
    defaults: { type: 'plant', picked: 'nucleus' },
    calc: function (values) { return SL.bio.cellInfo(values); },
    draw: draw,
    readouts: function (c) {
      return [
        { label: '细胞类型', text: c.typeLabel, accent: true },
        { label: '选中结构', text: c.pickedName },
        { label: '是否含有', text: c.available ? '有' : '没有' },
        { label: '功能', text: c.pickedFunc.length > 18 ? c.pickedFunc.slice(0, 18) + '…' : c.pickedFunc },
        { label: '植物细胞特有', text: c.plantOnly.length ? c.plantOnly.map(function (k) { return SL.bio.STRUCTURES[k].name; }).join('、') : '—' }
      ];
    },
    warnings: function (c) {
      if (!c.available) return [{ type: 'state', message: c.note }];
      return [];
    },
    measure: function (ctx) {
      var c = ctx.calc;
      return {
        group: ctx.rows.length + 1,
        cell: c.typeLabel,
        structure: c.pickedName,
        present: c.available ? '有' : '没有',
        func: c.pickedFunc
      };
    }
  };
})();
