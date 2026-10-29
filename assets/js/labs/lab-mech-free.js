/* 力学自由实验室：杠杆 / 滑轮组 / 浮力三套装置合一，参数全开、无引导步骤
   实现方式是「委托」——控件、计算、绘制、读数、拖动都直接复用三个教材实验，
   自由实验室只负责装置切换、开放额外参数（钩码质量、绳摩擦）和通用记录单。 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['mech-free'];

  var DEVICES = ['lever', 'pulley', 'buoyancy'];
  var LIQUID_LABEL = { water: '水', salt: '盐水', alcohol: '酒精' };
  var SOLID_LABEL = { alu: '铝块', iron: '铁块', wood: '木块' };

  function mounted(values) { return SL.labs[values.device] || SL.labs.lever; }

  /* 给某套装置的控件统一打上 when（只有选中该装置时才显示） */
  function tagged(device, defs) {
    return (defs || []).map(function (def) {
      var copy = {};
      Object.keys(def).forEach(function (key) { copy[key] = def[key]; });
      copy.when = function (values) { return values.device === device; };
      return copy;
    });
  }

  function shownOnly(device, def) {
    def.when = function (values) { return values.device === device; };
    return def;
  }

  var controls = [{
    key: 'device',
    label: '实验装置',
    type: 'buttons',
    options: [
      { value: 'lever', label: '杠杆' },
      { value: 'pulley', label: '滑轮组' },
      { value: 'buoyancy', label: '浮力' }
    ],
    note: '切换装置会换掉整套参数，已有记录仍在记录单里'
  }]
    .concat(tagged('lever', SL.labs.lever.controls))
    .concat([shownOnly('lever', {
      key: 'hookMass', label: '单个钩码质量', type: 'buttons',
      options: [{ value: 25, label: '25 g' }, { value: 50, label: '50 g' }, { value: 100, label: '100 g' }],
      note: '钩码变重，两侧力矩同时变大，平衡条件不变'
    })])
    .concat(tagged('pulley', SL.labs.pulley.controls))
    .concat([shownOnly('pulley', {
      key: 'friction', label: '每段绳的摩擦阻力', type: 'range',
      min: 0, max: 0.12, step: 0.01, unit: 'N', digits: 2,
      note: '摩擦越大，额外功越多，机械效率越低'
    })])
    .concat(tagged('buoyancy', SL.labs.buoyancy.controls));

  var defaults = { device: 'lever' };
  DEVICES.forEach(function (id) {
    var src = (SL.labs[id] && SL.labs[id].defaults) || {};
    Object.keys(src).forEach(function (key) {
      if (defaults[key] == null) defaults[key] = src[key];
    });
  });

  function currentLift() {
    var rt = SL.labs.pulley && SL.labs.pulley.rt;
    return rt ? rt.lift || 0 : 0;
  }

  SL.labs['mech-free'] = {
    id: 'mech-free',
    kind: 'sim',
    meta: meta,
    canvas: { w: 900, h: 520 },
    controls: controls,
    defaults: defaults,
    rebuildOn: ['device'],

    freeGuide: {
      title: '力学自由实验室',
      text: '三套装置随时切换，参数全部开放、没有步骤限制。想验证什么就改什么，读数与图像会立刻重算。',
      list: [
        '杠杆：改钩码质量与悬挂位置，直接拖动钩码也行，看力矩何时相等',
        '滑轮组：换绕法、加物重、改摩擦，点「播放」看绳端移动与效率变化',
        '浮力：换液体与材料，拖动物块控制浸入深度，观察 F浮–V排 曲线',
        '把不同装置的读数记在一起，导出一张 CSV 对比'
      ]
    },

    reset: function () {
      DEVICES.forEach(function (id) {
        if (SL.labs[id] && SL.labs[id].reset) SL.labs[id].reset();
      });
    },

    calc: function (values) { return mounted(values).calc(values); },

    setup: function (ctx) {
      var lab = mounted(ctx.values);
      if (lab.setup) lab.setup(ctx);
    },

    draw: function (ctx) { mounted(ctx.values).draw(ctx); },

    animated: function (values) { return values.device === 'pulley'; },

    onTick: function (dt, ctx) {
      if (ctx.values.device !== 'pulley') return;
      SL.labs.pulley.onTick(dt, ctx);
    },

    onReset: function (ctx) {
      if (ctx.values.device === 'pulley' && SL.labs.pulley.onReset) SL.labs.pulley.onReset(ctx);
    },

    readouts: function (c, v) {
      var lab = mounted(v);
      return lab.readouts ? lab.readouts(c, v) : [];
    },

    warnings: function (c, v) {
      var lab = mounted(v);
      return lab.warnings ? lab.warnings(c, v) : [];
    },

    renderExtra: function (host, rows, values) {
      var lab = mounted(values || {});
      if (lab.renderExtra) lab.renderExtra(host, rows);
    },

    measure: function (ctx) {
      var v = ctx.values;
      var c = ctx.calc;
      var row = { group: ctx.rows.length + 1 };

      if (v.device === 'lever') {
        row.device = '杠杆';
        row.summary = v.leftCount + ' 个 × ' + (v.leftArm * 5) + ' cm ｜ ' +
          v.rightCount + ' 个 × ' + (v.rightArm * 5) + ' cm ｜ 钩码 ' + v.hookMass + ' g';
        row.result = c.balanced
          ? '平衡　F₁L₁ = F₂L₂ = ' + SL.fmt(c.m1, 1) + ' N·cm'
          : (c.m1 > c.m2 ? '左端下沉' : '右端下沉') + '　力矩差 ' + SL.fmt(Math.abs(c.diff), 1) + ' N·cm';
        return row;
      }

      if (v.device === 'pulley') {
        var lift = currentLift();
        if (lift < 0.02) {
          SL.toast('先把钩码提起来（拖动物体或点「播放」），再记录数据', 'warn');
          return null;
        }
        row.device = '滑轮组';
        row.summary = 'n = ' + c.n + ' ｜ G = ' + v.loadN + ' N ｜ G动 = ' + v.movingN + ' N ｜ h = ' +
          SL.fmt(lift, 2) + ' m ｜ 摩擦 ' + SL.fmt(v.friction, 2) + ' N';
        row.result = 'F = ' + SL.fmt(c.F, 2) + ' N ｜ W有 = ' + SL.fmt(c.load * lift, 2) +
          ' J ｜ η = ' + SL.fmt(c.eta, 1) + ' %';
        return row;
      }

      if (c.ratio < 0.02) {
        SL.toast('物体还没浸进液体，先让它浸入再记录', 'warn');
        return null;
      }
      row.device = '浮力';
      row.summary = (LIQUID_LABEL[v.liquid] || '水') + ' ｜ ' + (SOLID_LABEL[v.solid] || '铝块') + ' ' +
        v.volume + ' cm³ ｜ 浸入 ' + Math.round(c.ratio * 100) + ' %';
      row.result = 'F浮 = ' + SL.fmt(c.fBuoy, 2) + ' N ｜ G排 = ' + SL.fmt(c.gDisplaced, 2) +
        ' N ｜ 示数 ' + SL.fmt(c.reading, 2) + ' N';
      return row;
    }
  };
})();
